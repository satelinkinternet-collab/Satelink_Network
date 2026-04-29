/**
 * S6-006: Capacity Alerting
 *
 * Monitors system capacity and alerts on constraints:
 * - Node capacity utilization
 * - Database connection pool
 * - Redis memory usage
 * - Request queue depth
 */

const ALERT_INTERVAL = 120000; // 2 min

const THRESHOLDS = {
  nodeUtilization: 0.85, // Alert if >85% avg node util
  dbConnections: 0.9, // Alert if >90% pool used
  redisMemory: 0.8, // Alert if >80% Redis max memory
  queueDepth: 1000 // Alert if queue > 1000
};

export async function getNodeCapacityStats(pool) {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_nodes,
        COUNT(*) as total_nodes
      FROM nodes
    `);

    return {
      activeNodes: parseInt(result.rows[0].active_nodes) || 0,
      totalNodes: parseInt(result.rows[0].total_nodes) || 0
    };
  } catch (e) {
    return { activeNodes: 0, totalNodes: 0, error: e.message };
  }
}

export async function getDbPoolStats(pool) {
  try {
    return {
      totalCount: pool.totalCount || 0,
      idleCount: pool.idleCount || 0,
      waitingCount: pool.waitingCount || 0,
      utilizationPct: pool.totalCount > 0
        ? ((pool.totalCount - pool.idleCount) / pool.totalCount * 100).toFixed(1)
        : 0
    };
  } catch (e) {
    return { totalCount: 0, idleCount: 0, waitingCount: 0, error: e.message };
  }
}

export async function getRedisStats(redis) {
  if (!redis) return { available: false };

  try {
    const info = await redis.info('memory');
    const lines = info.split('\r\n');
    const stats = {};

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = value;
      }
    }

    const usedMemory = parseInt(stats.used_memory) || 0;
    const maxMemory = parseInt(stats.maxmemory) || 0;

    return {
      available: true,
      usedMemoryMb: (usedMemory / 1024 / 1024).toFixed(2),
      maxMemoryMb: maxMemory > 0 ? (maxMemory / 1024 / 1024).toFixed(2) : 'unlimited',
      utilizationPct: maxMemory > 0 ? (usedMemory / maxMemory * 100).toFixed(1) : null
    };
  } catch (e) {
    return { available: false, error: e.message };
  }
}

export async function getQueueStats(redis) {
  if (!redis) return { queueDepth: 0 };

  try {
    const depth = await redis.llen('job:queue');
    return { queueDepth: depth || 0 };
  } catch (e) {
    return { queueDepth: 0, error: e.message };
  }
}

export function checkCapacityAlerts(stats) {
  const alerts = [];

  if (stats.dbPool && stats.dbPool.waitingCount > 0) {
    alerts.push({
      type: 'DB_POOL_CONTENTION',
      severity: 'WARNING',
      message: `${stats.dbPool.waitingCount} queries waiting for DB connection`,
      value: stats.dbPool.waitingCount
    });
  }

  if (stats.redis?.utilizationPct && parseFloat(stats.redis.utilizationPct) > THRESHOLDS.redisMemory * 100) {
    alerts.push({
      type: 'REDIS_MEMORY_HIGH',
      severity: 'WARNING',
      message: `Redis memory at ${stats.redis.utilizationPct}%`,
      value: stats.redis.utilizationPct
    });
  }

  if (stats.queue && stats.queue.queueDepth > THRESHOLDS.queueDepth) {
    alerts.push({
      type: 'QUEUE_BACKLOG',
      severity: 'WARNING',
      message: `Job queue depth: ${stats.queue.queueDepth}`,
      value: stats.queue.queueDepth
    });
  }

  if (stats.nodes && stats.nodes.activeNodes === 0 && stats.nodes.totalNodes > 0) {
    alerts.push({
      type: 'NO_ACTIVE_NODES',
      severity: 'CRITICAL',
      message: 'No active nodes available',
      value: 0
    });
  }

  return alerts;
}

export async function getCapacityStats(pool, redis) {
  const stats = {
    timestamp: Date.now(),
    nodes: await getNodeCapacityStats(pool),
    dbPool: await getDbPoolStats(pool),
    redis: await getRedisStats(redis),
    queue: await getQueueStats(redis)
  };

  stats.alerts = checkCapacityAlerts(stats);
  stats.hasAlerts = stats.alerts.length > 0;

  return stats;
}

export async function startCapacityAlerter(pool, redis) {
  console.log('[Capacity-Alerter] Started — checking capacity every 2min');

  setInterval(async () => {
    try {
      const stats = await getCapacityStats(pool, redis);

      if (stats.hasAlerts) {
        for (const a of stats.alerts) {
          console.log(`[Capacity-Alerter] ${a.severity}: ${a.message}`);
        }
      }

      await redis?.set('capacity:stats', JSON.stringify(stats), 'EX', 300);
      await redis?.set('capacity:last_check', Date.now());
    } catch (e) {
      console.error('[Capacity-Alerter] Error:', e.message);
    }
  }, ALERT_INTERVAL);
}

export { THRESHOLDS };
