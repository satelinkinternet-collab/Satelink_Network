/**
 * S6-002: Auto-scaling Node Selection
 *
 * Dynamically adjusts node routing weights based on real-time load:
 * - Tracks requests/minute per node in Redis
 * - Calculates utilization ratio (current load / capacity)
 * - Scales traffic away from overloaded nodes (>80% util)
 * - Scales traffic toward underutilized nodes (<30% util)
 *
 * Weight formula: base_weight * (1 - utilization_ratio) * health_factor
 */

const DEFAULT_CAPACITY = 1000; // requests/min per node
const OVERLOAD_THRESHOLD = 0.8;
const UNDERLOAD_THRESHOLD = 0.3;
const WEIGHT_UPDATE_INTERVAL = 30000; // 30s

// In-memory load tracking (replaces Redis)
const _nodeLoadStore = new Map(); // nodeId → { count, windowStart }

export async function getNodeLoad(redis, nodeId) {
  // Redis eliminated — use in-memory
  const entry = _nodeLoadStore.get(nodeId);
  if (!entry) return 0;
  // Clear if window expired (2 min)
  if (Date.now() - entry.windowStart > 120000) {
    _nodeLoadStore.delete(nodeId);
    return 0;
  }
  return entry.count;
}

export async function incrementNodeLoad(redis, nodeId) {
  // Redis eliminated — use in-memory
  const now = Date.now();
  const entry = _nodeLoadStore.get(nodeId);
  if (!entry || now - entry.windowStart > 120000) {
    _nodeLoadStore.set(nodeId, { count: 1, windowStart: now });
  } else {
    entry.count++;
  }
}

export async function getNodeCapacity(pool, nodeId) {
  const result = await pool.query(
    `SELECT COALESCE(bandwidth, $1) as capacity FROM nodes WHERE node_id = $2`,
    [DEFAULT_CAPACITY, nodeId]
  );
  return result.rows[0]?.capacity || DEFAULT_CAPACITY;
}

export function calculateDynamicWeight(baseWeight, load, capacity) {
  const utilization = Math.min(load / capacity, 1);

  if (utilization >= OVERLOAD_THRESHOLD) {
    return Math.max(1, Math.floor(baseWeight * 0.2));
  }

  if (utilization <= UNDERLOAD_THRESHOLD) {
    return Math.floor(baseWeight * 1.5);
  }

  const scaleFactor = 1 - utilization;
  return Math.max(1, Math.floor(baseWeight * scaleFactor));
}

export async function selectNode(pool, redis, nodes, region = null) {
  if (!nodes || nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];

  const weighted = [];

  for (const node of nodes) {
    const load = await getNodeLoad(redis, node.node_id);
    const capacity = await getNodeCapacity(pool, node.node_id);
    const baseWeight = node.reputation_score || 50;
    const weight = calculateDynamicWeight(baseWeight, load, capacity);

    weighted.push({ node, weight, load, capacity });
  }

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  if (totalWeight === 0) return nodes[0];

  const random = Math.random() * totalWeight;
  let cumulative = 0;

  for (const { node, weight } of weighted) {
    cumulative += weight;
    if (random <= cumulative) return node;
  }

  return nodes[nodes.length - 1];
}

export async function getActiveNodes(pool, region = null) {
  let query = `SELECT node_id, wallet, device_type, status, last_seen
               FROM nodes WHERE status = 'active'`;
  const params = [];

  if (region) {
    query += ` AND region = $1`;
    params.push(region);
  }

  query += ` ORDER BY last_seen DESC LIMIT 100`;

  const result = await pool.query(query, params);
  return result.rows;
}

// In-memory weights store (replaces Redis hset/set)
const _nodeWeightsStore = new Map();
let _weightsLastUpdated = 0;

export async function updateNodeWeights(pool, redis) {
  const nodes = await getActiveNodes(pool);
  const weights = {};

  for (const node of nodes) {
    const load = await getNodeLoad(redis, node.node_id);
    const capacity = await getNodeCapacity(pool, node.node_id);
    const baseWeight = 50;
    const dynamicWeight = calculateDynamicWeight(baseWeight, load, capacity);

    weights[node.node_id] = {
      load,
      capacity,
      utilization: (load / capacity * 100).toFixed(1),
      weight: dynamicWeight
    };

    // Redis eliminated — use in-memory
    _nodeWeightsStore.set(node.node_id, dynamicWeight);
  }

  _weightsLastUpdated = Date.now();
  return weights;
}

export async function getScalingStats(pool, redis) {
  const nodes = await getActiveNodes(pool);
  const stats = {
    total: nodes.length,
    overloaded: 0,
    underloaded: 0,
    balanced: 0,
    nodes: []
  };

  for (const node of nodes) {
    const load = await getNodeLoad(redis, node.node_id);
    const capacity = await getNodeCapacity(pool, node.node_id);
    const utilization = load / capacity;

    if (utilization >= OVERLOAD_THRESHOLD) {
      stats.overloaded++;
    } else if (utilization <= UNDERLOAD_THRESHOLD) {
      stats.underloaded++;
    } else {
      stats.balanced++;
    }

    stats.nodes.push({
      node_id: node.node_id,
      load,
      capacity,
      utilization: (utilization * 100).toFixed(1) + '%',
      status: utilization >= OVERLOAD_THRESHOLD ? 'overloaded' :
              utilization <= UNDERLOAD_THRESHOLD ? 'underloaded' : 'balanced'
    });
  }

  return stats;
}

// In-memory last run tracker
let _autoScalerLastRun = 0;

export async function startAutoScaler(pool, redis) {
  console.log('[AutoScaler] Started — monitoring node load every 30s (in-memory)');

  setInterval(async () => {
    try {
      const weights = await updateNodeWeights(pool, redis);
      const overloaded = Object.values(weights).filter(w =>
        parseFloat(w.utilization) >= OVERLOAD_THRESHOLD * 100
      ).length;

      if (overloaded > 0) {
        console.log(`[AutoScaler] ${overloaded} node(s) overloaded — scaling traffic`);
      }

      _autoScalerLastRun = Date.now();
    } catch (e) {
      console.error('[AutoScaler] Error:', e.message);
    }
  }, WEIGHT_UPDATE_INTERVAL);
}

export { DEFAULT_CAPACITY, OVERLOAD_THRESHOLD, UNDERLOAD_THRESHOLD };
