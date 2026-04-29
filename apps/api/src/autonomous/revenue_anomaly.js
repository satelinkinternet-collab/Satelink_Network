/**
 * S6-004: Revenue Anomaly Detection
 *
 * Monitors revenue patterns and detects anomalies:
 * - Sudden drops (>50% below rolling average)
 * - Unexpected spikes (>300% above rolling average)
 * - Zero revenue periods (dead intervals)
 * - Revenue velocity tracking
 */

const DETECTION_INTERVAL = 300000; // 5 min
const ROLLING_WINDOW_HOURS = 24;
const DROP_THRESHOLD = 0.5; // Alert if <50% of average
const SPIKE_THRESHOLD = 3.0; // Alert if >300% of average
const DEAD_INTERVAL_MINUTES = 30; // Alert if zero revenue for 30 min

export async function getRevenueForPeriod(pool, startTs, endTs) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount_usdt), 0) as total, COUNT(*) as events
     FROM revenue_events_v2 WHERE created_at >= $1 AND created_at < $2`,
    [startTs, endTs]
  );
  return {
    total: parseFloat(result.rows[0].total) || 0,
    events: parseInt(result.rows[0].events) || 0
  };
}

export async function getRollingAverage(pool, hours = ROLLING_WINDOW_HOURS) {
  const now = Math.floor(Date.now() / 1000);
  const start = now - (hours * 3600);

  const result = await pool.query(
    `SELECT COALESCE(AVG(hourly_total), 0) as avg_hourly
     FROM (
       SELECT FLOOR(created_at / 3600) as hour, SUM(amount_usdt) as hourly_total
       FROM revenue_events_v2 WHERE created_at >= $1
       GROUP BY FLOOR(created_at / 3600)
     ) hourly`,
    [start]
  );

  return parseFloat(result.rows[0].avg_hourly) || 0;
}

export async function getLastRevenueTimestamp(pool) {
  const result = await pool.query(
    `SELECT MAX(created_at) as last_ts FROM revenue_events_v2`
  );
  return result.rows[0].last_ts || 0;
}

export async function detectAnomalies(pool, redis) {
  const now = Math.floor(Date.now() / 1000);
  const hourAgo = now - 3600;
  const fiveMinAgo = now - 300;

  const current = await getRevenueForPeriod(pool, fiveMinAgo, now);
  const hourly = await getRevenueForPeriod(pool, hourAgo, now);
  const avgHourly = await getRollingAverage(pool);
  const lastTs = await getLastRevenueTimestamp(pool);

  const anomalies = [];

  // Dead interval detection
  const minutesSinceLastRevenue = (now - lastTs) / 60;
  if (minutesSinceLastRevenue >= DEAD_INTERVAL_MINUTES) {
    anomalies.push({
      type: 'DEAD_INTERVAL',
      severity: 'HIGH',
      message: `No revenue for ${Math.floor(minutesSinceLastRevenue)} minutes`,
      minutesSilent: Math.floor(minutesSinceLastRevenue)
    });
  }

  // Drop detection
  if (avgHourly > 0 && hourly.total < avgHourly * DROP_THRESHOLD) {
    const dropPct = ((avgHourly - hourly.total) / avgHourly * 100).toFixed(1);
    anomalies.push({
      type: 'REVENUE_DROP',
      severity: 'HIGH',
      message: `Revenue dropped ${dropPct}% below average`,
      current: hourly.total.toFixed(6),
      average: avgHourly.toFixed(6),
      dropPercent: dropPct
    });
  }

  // Spike detection
  if (avgHourly > 0 && hourly.total > avgHourly * SPIKE_THRESHOLD) {
    const spikePct = ((hourly.total / avgHourly) * 100).toFixed(1);
    anomalies.push({
      type: 'REVENUE_SPIKE',
      severity: 'MEDIUM',
      message: `Revenue spiked to ${spikePct}% of average`,
      current: hourly.total.toFixed(6),
      average: avgHourly.toFixed(6),
      spikePercent: spikePct
    });
  }

  return {
    timestamp: now,
    current: {
      last5min: current.total,
      lastHour: hourly.total,
      events5min: current.events,
      eventsHour: hourly.events
    },
    rolling: {
      avgHourly,
      windowHours: ROLLING_WINDOW_HOURS
    },
    anomalies,
    hasAnomalies: anomalies.length > 0
  };
}

export async function getRevenueVelocity(pool) {
  const now = Math.floor(Date.now() / 1000);

  const periods = [
    { label: '5min', start: now - 300 },
    { label: '1h', start: now - 3600 },
    { label: '6h', start: now - 21600 },
    { label: '24h', start: now - 86400 }
  ];

  const velocity = {};

  for (const p of periods) {
    const rev = await getRevenueForPeriod(pool, p.start, now);
    const hours = (now - p.start) / 3600;
    velocity[p.label] = {
      total: rev.total,
      events: rev.events,
      perHour: (rev.total / hours).toFixed(8)
    };
  }

  return velocity;
}

export async function getAnomalyStats(pool, redis) {
  const detection = await detectAnomalies(pool, redis);
  const velocity = await getRevenueVelocity(pool);

  return {
    ...detection,
    velocity
  };
}

export async function startRevenueMonitor(pool, redis) {
  console.log('[Revenue-Monitor] Started — detecting anomalies every 5min');

  setInterval(async () => {
    try {
      const result = await detectAnomalies(pool, redis);

      if (result.hasAnomalies) {
        for (const a of result.anomalies) {
          console.log(`[Revenue-Monitor] ${a.severity}: ${a.message}`);
        }
        await redis?.set('revenue:anomalies', JSON.stringify(result.anomalies), 'EX', 600);
      }

      await redis?.set('revenue:last_check', result.timestamp);
      await redis?.set('revenue:velocity', JSON.stringify(result.current), 'EX', 600);
    } catch (e) {
      console.error('[Revenue-Monitor] Error:', e.message);
    }
  }, DETECTION_INTERVAL);
}

export { DROP_THRESHOLD, SPIKE_THRESHOLD, DEAD_INTERVAL_MINUTES, ROLLING_WINDOW_HOURS };
