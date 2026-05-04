import { createCompatibilityGatewayRoutes } from './src/gateway/routes/compatibility_gateway_api.js';
import { startSentinel } from "./src/autonomous/sentinel.js";
import { getScalingStats } from "./src/autonomous/auto_scaler.js";
import { getHealerStats } from "./src/autonomous/rpc_healer.js";
import { getAnomalyStats } from "./src/autonomous/revenue_anomaly.js";
import { checkTreasury, getTreasuryStatus } from "./src/autonomous/treasury_monitor.js";
import { getCapacityStats } from "./src/autonomous/capacity_alerter.js";
import { createApp } from "./app_factory.mjs";
import { createWsGateway, getWsStats } from "./src/workloads/rpc_gateway/ws_gateway.js";
import { startHealthMonitor, healthMonitorStatus } from "./src/scheduler/node_health_monitor.js";
import { startOfflineDetector, offlineDetectorStatus } from "./src/services/node_registry/offline_detector.js";
import pkg from "pg";
import Redis from "ioredis";

const { Pool } = pkg;

function createRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url || url === 'redis://') {
    console.log('[Redis] No REDIS_URL configured, running without Redis');
    return null;
  }

  try {
    const redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      tls: url.startsWith('rediss://') ? {} : undefined
    });
    redis.on('error', (err) => console.error('[Redis] Error:', err.message));
    redis.on('connect', () => console.log('[Redis] Connected'));
    return redis;
  } catch (err) {
    console.error('[Redis] Failed to create client:', err.message);
    return null;
  }
}

async function ensureBillingTables(pool) {
  // CRITICAL: Drop NOT NULL on node_id FIRST (runs independently)
  try {
    await pool.query(`
      ALTER TABLE revenue_events_v2
      ALTER COLUMN node_id DROP NOT NULL
    `);
    console.log('[STARTUP] node_id constraint dropped');
  } catch (e) {
    // Ignore - constraint may not exist or table may not exist yet
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS epoch_ledger (
        id SERIAL PRIMARY KEY,
        epoch_id TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'OPEN',
        started_at BIGINT NOT NULL,
        closed_at BIGINT,
        total_revenue NUMERIC(18,8) DEFAULT 0,
        node_pool NUMERIC(18,8) DEFAULT 0,
        platform_fee NUMERIC(18,8) DEFAULT 0,
        distribution_pool NUMERIC(18,8) DEFAULT 0,
        merkle_root TEXT,
        tx_hash TEXT,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS revenue_events_v2 (
        id SERIAL PRIMARY KEY,
        op_type TEXT,
        node_id TEXT,
        client_id TEXT,
        amount_usdt NUMERIC(18,8) NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        request_id TEXT UNIQUE,
        created_at BIGINT,
        chain TEXT,
        method TEXT,
        source TEXT,
        epoch_id INTEGER
      )
    `);

    // Add UNIQUE constraint if table already exists without it
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_events_v2_request_id
      ON revenue_events_v2 (request_id)
      WHERE request_id IS NOT NULL
    `).catch(() => {});

    await pool.query(`
      INSERT INTO epoch_ledger (epoch_id, status, started_at, total_revenue)
      SELECT 'epoch-auto-1', 'OPEN', EXTRACT(EPOCH FROM NOW()) * 1000, 0
      WHERE NOT EXISTS (SELECT 1 FROM epoch_ledger WHERE status = 'OPEN')
    `).catch(() => {}); // Ignore if epoch_ledger schema differs

    console.log('[STARTUP] Billing tables ensured');
  } catch (err) {
    console.error('[STARTUP] Billing migration failed:', err.message);
  }
}

async function start() {
  try {
    console.log("🚀 SERVER STARTED - ROUTES LOADING");

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    });

    // Auto-migrate billing tables before routes
    await ensureBillingTables(pool);

    const redis = createRedisClient();
    const app = createApp(pool, redis);

    app.get('/ws/stats', (req, res) => {
      res.json({ ok: true, ...getWsStats() });
    });

    app.get('/system/health-monitor', (req, res) => {
      res.json({ ok: true, ...healthMonitorStatus });
    });

    app.get('/system/offline-detector', (req, res) => {
      res.json({ ok: true, ...offlineDetectorStatus });
    });

    app.get('/system/scaling-stats', async (req, res) => {
      try {
        const stats = await getScalingStats(pool, redis);
        res.json({ ok: true, ...stats });
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    });

    app.get('/system/rpc-healer{/:chain}', async (req, res) => {
      try {
        const chain = req.params.chain || 'polygon-amoy';
        const stats = await getHealerStats(chain);
        res.json({ ok: true, ...stats });
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    });

    app.get('/system/revenue-anomalies', async (req, res) => {
      try {
        const stats = await getAnomalyStats(pool, redis);
        res.json({ ok: true, ...stats });
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    });

    app.get('/system/treasury', async (req, res) => {
      try {
        let status = await getTreasuryStatus(redis);
        if (!status) {
          status = await checkTreasury(redis);
        }
        res.json({ ok: true, ...status });
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    });

    app.get('/system/capacity', async (req, res) => {
      try {
        const stats = await getCapacityStats(pool, redis);
        res.json({ ok: true, ...stats });
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    });

    const httpServer = createServer(app);

    createWsGateway(httpServer, pool);

    // Start node health monitor (S2-008)
    startHealthMonitor(pool);

    // Start offline detector (S2-009)
    startOfflineDetector(pool);
    startSentinel(pool, redis);
    const PORT = process.env.PORT || 8080;

    httpServer.listen(PORT, () => {
      console.log(`✅ Satelink Backend Running on port ${PORT}`);
      console.log(`📡 WebSocket available at /rpc/ws/:chain`);
      console.log(`🏥 Health monitor started (2min interval)`);
      console.log(`🔍 Offline detector started (2min interval)`);
      console.log(`⚖️ Auto-scaler started (30s interval)`);
      console.log(`🔧 RPC-healer started (60s interval)`);
      console.log(`💰 Revenue-monitor started (5min interval)`);
      console.log(`🏦 Treasury-monitor started (10min interval)`);
      console.log(`📊 Capacity-alerter started (2min interval)`);
    });

  } catch (err) {
    console.error("BOOT FAILURE IN SERVER:", err);
    process.exit(1);
  }
}

start();

app.use('/', compatibilityRoutes);
