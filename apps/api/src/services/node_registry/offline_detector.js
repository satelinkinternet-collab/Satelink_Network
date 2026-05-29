/**
 * Offline Detector (S2-009)
 *
 * Runs every 2 minutes to detect nodes that have gone offline.
 * Rules:
 * - 3 missed heartbeats (6 min) → status = 'offline'
 * - Heartbeat received on offline node → status = 'active'
 * - Offline > 24 hours → status = 'suspended'
 */

const OFFLINE_CHECK_INTERVAL_MS = 120000; // 2 minutes
const OFFLINE_THRESHOLD_SECONDS = 86400; // 24 hours (was 6 minutes)
const SUSPEND_THRESHOLD_SECONDS = 604800; // 7 days (was 24 hours)

export const offlineDetectorStatus = {
  last_run_time: null,
  last_status: null,
  nodes_marked_offline: 0,
  nodes_marked_suspended: 0
};

async function sendDiscordAlert(type, nodeId, region, details) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const configs = {
    offline: {
      emoji: '🔴',
      title: 'Node OFFLINE',
      color: 0xF87171
    },
    online: {
      emoji: '🟢',
      title: 'Node BACK ONLINE',
      color: 0x4ADE80
    },
    suspended: {
      emoji: '⚠️',
      title: 'Node SUSPENDED',
      color: 0xFBBF24
    }
  };

  const config = configs[type] || configs.offline;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Satelink Nodes',
        embeds: [{
          title: `${config.emoji} ${config.title}`,
          color: config.color,
          fields: [
            { name: 'Node', value: nodeId, inline: true },
            { name: 'Region', value: region || 'unknown', inline: true },
            { name: 'Details', value: details, inline: false }
          ],
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error('[OfflineDetector] Discord alert failed:', err.message);
  }
}

async function runOfflineDetectionCycle(pool) {
  if (!pool || !pool.query) {
    console.warn('[OfflineDetector] No database pool');
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const offlineThreshold = now - OFFLINE_THRESHOLD_SECONDS;
  const suspendThreshold = now - SUSPEND_THRESHOLD_SECONDS;
  let markedOffline = 0;
  let markedSuspended = 0;

  try {
    // 1. Find active nodes that should be marked offline (last heartbeat > 6 min ago)
    const toMarkOffline = await pool.query(`
      SELECT node_id, region, last_heartbeat_at
      FROM registered_nodes
      WHERE status = 'active'
        AND last_heartbeat_at IS NOT NULL
        AND last_heartbeat_at < $1
    `, [offlineThreshold]);

    for (const node of toMarkOffline.rows) {
      await pool.query(
        `UPDATE registered_nodes SET status = 'offline', updated_at = $1 WHERE node_id = $2`,
        [now, node.node_id]
      );
      markedOffline++;

      const minutesAgo = Math.floor((now - node.last_heartbeat_at) / 60);
      console.log(`[OfflineDetector] 🔴 ${node.node_id} marked OFFLINE — last seen ${minutesAgo} min ago`);
      await sendDiscordAlert('offline', node.node_id, node.region, `Last seen ${minutesAgo} minutes ago`);
    }

    // 2. Find offline nodes that should be suspended (offline > 24 hours)
    const toMarkSuspended = await pool.query(`
      SELECT node_id, region, last_heartbeat_at
      FROM registered_nodes
      WHERE status = 'offline'
        AND last_heartbeat_at IS NOT NULL
        AND last_heartbeat_at < $1
    `, [suspendThreshold]);

    for (const node of toMarkSuspended.rows) {
      await pool.query(
        `UPDATE registered_nodes SET status = 'suspended', updated_at = $1 WHERE node_id = $2`,
        [now, node.node_id]
      );
      markedSuspended++;

      const hoursOffline = Math.floor((now - node.last_heartbeat_at) / 3600);
      console.log(`[OfflineDetector] ⚠️ ${node.node_id} SUSPENDED — offline ${hoursOffline}h`);
      await sendDiscordAlert('suspended', node.node_id, node.region, `Offline > 24 hours — no earnings this epoch`);
    }

    if (markedOffline > 0 || markedSuspended > 0) {
      console.log(`[OfflineDetector] Cycle complete: ${markedOffline} offline, ${markedSuspended} suspended`);
    }

    offlineDetectorStatus.last_run_time = Date.now();
    offlineDetectorStatus.last_status = 'success';
    offlineDetectorStatus.nodes_marked_offline = markedOffline;
    offlineDetectorStatus.nodes_marked_suspended = markedSuspended;

  } catch (err) {
    console.error('[OfflineDetector] ERROR:', err.message);
    offlineDetectorStatus.last_run_time = Date.now();
    offlineDetectorStatus.last_status = 'error';
  }
}

let isRunning = false;

export function startOfflineDetector(pool) {
  if (global.__OFFLINE_DETECTOR_STARTED__) return;
  global.__OFFLINE_DETECTOR_STARTED__ = true;

  console.log(`[OfflineDetector] Started (interval: ${OFFLINE_CHECK_INTERVAL_MS}ms)`);

  // Run initial check after 60 seconds
  setTimeout(() => runOfflineDetectionCycle(pool), 60000);

  const handle = setInterval(async () => {
    if (isRunning) return;
    isRunning = true;

    try {
      await runOfflineDetectionCycle(pool);
    } catch (err) {
      console.error('[OfflineDetector] Tick error:', err.message);
    } finally {
      isRunning = false;
    }
  }, OFFLINE_CHECK_INTERVAL_MS);

  handle.unref();
  return handle;
}

export async function handleNodeComeback(nodeId, pool) {
  if (!pool || !pool.query) return null;

  try {
    const result = await pool.query(
      'SELECT status, region, last_heartbeat_at FROM registered_nodes WHERE node_id = $1',
      [nodeId]
    );

    if (result.rows.length === 0) return null;

    const node = result.rows[0];
    const wasOffline = node.status === 'offline' || node.status === 'suspended';

    if (wasOffline) {
      const now = Math.floor(Date.now() / 1000);
      const offlineDuration = node.last_heartbeat_at ? now - node.last_heartbeat_at : 0;
      const offlineMinutes = Math.floor(offlineDuration / 60);

      await pool.query(
        `UPDATE registered_nodes SET status = 'active', updated_at = $1 WHERE node_id = $2`,
        [now, nodeId]
      );

      console.log(`[OfflineDetector] 🟢 ${nodeId} BACK ONLINE — was offline ${offlineMinutes} min`);
      await sendDiscordAlert('online', nodeId, node.region, `Was offline for ${offlineMinutes} minutes`);

      return { restored: true, offlineMinutes };
    }

    return { restored: false };
  } catch (err) {
    console.error('[OfflineDetector] Comeback handler error:', err.message);
    return null;
  }
}
