import { createServer } from 'http';
import { startSentinel } from "./src/autonomous/sentinel.js";import { createApp } from "./app_factory.mjs";
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
    `);

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
    });

  } catch (err) {
    console.error("BOOT FAILURE IN SERVER:", err);
    process.exit(1);
  }
}

start();
