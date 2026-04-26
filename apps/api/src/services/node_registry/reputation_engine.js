/**
 * Node Reputation Engine (S2-003)
 *
 * Score: 0-1000 points
 * Tiers: bronze(0-199), silver(200-399), gold(400-699), platinum(700-1000)
 *
 * Scoring per epoch:
 *   +10 per heartbeat received (max 60/epoch = 600 pts)
 *   +5 per successful RPC call served
 *   -20 per missed heartbeat
 *   -50 per downtime event (>5 min no heartbeat)
 *   -100 per SLA violation (response > 2000ms)
 */

const TIER_THRESHOLDS = {
  platinum: 700,
  gold: 400,
  silver: 200,
  bronze: 0
};

const TIER_LIMITS = {
  platinum: Infinity,
  gold: 20000,
  silver: 5000,
  bronze: 1000
};

const TIER_MULTIPLIERS = {
  platinum: 1.10,
  gold: 1.00,
  silver: 0.95,
  bronze: 0.90
};

const SCORING = {
  heartbeat: 10,
  rpcCall: 5,
  missedHeartbeat: -20,
  downtimeEvent: -50,
  slaViolation: -100,
  maxHeartbeatsPerEpoch: 60
};

export function getNodeTier(score) {
  if (score >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (score >= TIER_THRESHOLDS.gold) return 'gold';
  if (score >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export function getTierBenefits(tier) {
  return {
    tier,
    dailyLimit: TIER_LIMITS[tier] || 1000,
    earningsMultiplier: TIER_MULTIPLIERS[tier] || 0.90,
    priorityRouting: tier === 'platinum' || tier === 'gold'
  };
}

export function applyEarningsMultiplier(baseEarnings, tier) {
  const multiplier = TIER_MULTIPLIERS[tier] || 0.90;
  return baseEarnings * multiplier;
}

export function calculateReputationDelta(epochStats) {
  const {
    heartbeatsReceived = 0,
    rpcCallsServed = 0,
    missedHeartbeats = 0,
    downtimeEvents = 0,
    slaViolations = 0
  } = epochStats;

  const cappedHeartbeats = Math.min(heartbeatsReceived, SCORING.maxHeartbeatsPerEpoch);

  const delta =
    (cappedHeartbeats * SCORING.heartbeat) +
    (rpcCallsServed * SCORING.rpcCall) +
    (missedHeartbeats * SCORING.missedHeartbeat) +
    (downtimeEvents * SCORING.downtimeEvent) +
    (slaViolations * SCORING.slaViolation);

  return delta;
}

export async function updateNodeReputation(nodeId, delta, pool) {
  if (!pool || !pool.query) {
    throw new Error('Database pool required');
  }

  const result = await pool.query(
    'SELECT reputation_score, tier FROM registered_nodes WHERE node_id = $1',
    [nodeId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const currentScore = result.rows[0].reputation_score || 0;
  const newScore = Math.max(0, Math.min(1000, currentScore + delta));
  const newTier = getNodeTier(newScore);
  const now = Math.floor(Date.now() / 1000);

  await pool.query(
    `UPDATE registered_nodes
     SET reputation_score = $1, tier = $2, updated_at = $3
     WHERE node_id = $4`,
    [newScore, newTier, now, nodeId]
  );

  try {
    await pool.query(
      `INSERT INTO reputation_history (node_id, score, tier, delta, epoch_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [nodeId, newScore, newTier, delta, Math.floor(now / 3600), now]
    );
  } catch (e) {
    // reputation_history table may not exist
  }

  console.log(`[Reputation] ${nodeId}: ${currentScore} + ${delta} = ${newScore} (${newTier})`);

  return { nodeId, oldScore: currentScore, newScore, newTier, delta };
}

export async function getNodeReputationHistory(nodeId, pool, limit = 5) {
  if (!pool || !pool.query) return [];

  try {
    const result = await pool.query(
      `SELECT epoch_id, score, tier, delta, created_at
       FROM reputation_history
       WHERE node_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [nodeId, limit]
    );
    return result.rows;
  } catch (e) {
    return [];
  }
}

export async function processEpochReputation(epochId, pool) {
  if (!pool || !pool.query) return { processed: 0 };

  const epochStart = epochId * 3600;
  const epochEnd = epochStart + 3600;
  const results = [];

  try {
    const nodesResult = await pool.query(
      `SELECT DISTINCT node_id FROM registered_nodes WHERE status = 'active'`
    );

    for (const row of nodesResult.rows) {
      const nodeId = row.node_id;

      let heartbeatsReceived = 0;
      try {
        const hb = await pool.query(
          `SELECT COUNT(*) as count FROM node_heartbeats
           WHERE node_id = $1 AND created_at >= $2 AND created_at < $3`,
          [nodeId, epochStart, epochEnd]
        );
        heartbeatsReceived = parseInt(hb.rows[0]?.count) || 0;
      } catch (e) {
        // Table may not exist, estimate from last_heartbeat_at
        const node = await pool.query(
          'SELECT last_heartbeat_at FROM registered_nodes WHERE node_id = $1',
          [nodeId]
        );
        if (node.rows[0]?.last_heartbeat_at >= epochStart) {
          heartbeatsReceived = 1;
        }
      }

      let rpcCallsServed = 0;
      try {
        const rpc = await pool.query(
          `SELECT COUNT(*) as count FROM revenue_events_v2
           WHERE node_id = $1 AND created_at >= $2 AND created_at < $3`,
          [nodeId, epochStart, epochEnd]
        );
        rpcCallsServed = parseInt(rpc.rows[0]?.count) || 0;
      } catch (e) { /* no revenue data */ }

      const expectedHeartbeats = 60;
      const missedHeartbeats = Math.max(0, expectedHeartbeats - heartbeatsReceived);
      const downtimeEvents = missedHeartbeats >= 5 ? Math.floor(missedHeartbeats / 5) : 0;

      const epochStats = {
        heartbeatsReceived,
        rpcCallsServed,
        missedHeartbeats,
        downtimeEvents,
        slaViolations: 0
      };

      const delta = calculateReputationDelta(epochStats);
      const result = await updateNodeReputation(nodeId, delta, pool);
      results.push(result);
    }

    console.log(`[Reputation] Epoch ${epochId}: processed ${results.length} nodes`);
    return { processed: results.length, results };
  } catch (err) {
    console.error('[Reputation] Epoch processing error:', err.message);
    return { processed: 0, error: err.message };
  }
}

export async function ensureReputationHistoryTable(pool) {
  if (!pool || !pool.query) return;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reputation_history (
        id SERIAL PRIMARY KEY,
        node_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        tier TEXT NOT NULL,
        delta INTEGER NOT NULL,
        epoch_id INTEGER NOT NULL,
        created_at BIGINT NOT NULL
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reputation_history_node ON reputation_history(node_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reputation_history_epoch ON reputation_history(epoch_id)
    `);
    console.log('[Reputation] History table ensured');
  } catch (err) {
    console.error('[Reputation] History table creation failed:', err.message);
  }
}
