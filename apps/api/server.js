import express from "express";
import { createPhase3Router } from "./src/gateway/routes/api_phase3.js";
import { createServer } from 'http';
import { pathToFileURL } from 'url';
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
import { startEpochScheduler, schedulerStatus } from "./src/economics/epoch_scheduler.js";
import { startClaimExpiryJob } from "./src/scheduler/jobs/claim_expiry_job.js";
import { ensureMachineAccessTables } from "./src/machine-access/index.js";
import { startTreasurySettlementScheduler } from "./src/jobs/treasury_settlement_job.mjs";
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

    // Add test/production segregation columns (034_revenue_source_validation)
    await pool.query(`
      ALTER TABLE revenue_events_v2
      ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT FALSE
    `).catch(() => {});

    await pool.query(`
      ALTER TABLE revenue_events_v2
      ADD COLUMN IF NOT EXISTS source_validated BOOLEAN NOT NULL DEFAULT FALSE
    `).catch(() => {});

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_revenue_events_is_test
      ON revenue_events_v2(is_test_data, epoch_id)
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
  console.log("🚀 SERVER STARTED - BOOT SEQUENCE BEGINNING");

  // Step 1: Create PostgreSQL pool
  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    });
    console.log('[BOOT] ✅ PostgreSQL pool created');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at Pool creation:', err.message);
    process.exit(1);
  }

  // Step 2: Run billing table migrations
  try {
    await ensureBillingTables(pool);
    console.log('[BOOT] ✅ Billing tables ensured');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at ensureBillingTables:', err.message);
    process.exit(1);
  }

  // Step 2b: Initialize machine access control-plane tables
  try {
    await ensureMachineAccessTables(pool);
    console.log('[BOOT] ✅ Machine access tables ensured');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at ensureMachineAccessTables:', err.message);
    process.exit(1);
  }

  // Step 3: Create Redis client
  let redis;
  try {
    redis = createRedisClient();
    console.log('[BOOT] ✅ Redis client created (or skipped)');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at createRedisClient:', err.message);
    process.exit(1);
  }

  // Step 4: Create Express app
  let app;
  try {
    app = createApp(pool, redis);
    console.log('[BOOT] ✅ Express app created');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at createApp:', err.message);
    process.exit(1);
  }

  // Step 5: Mount additional middleware and routes
  try {
    app.use(express.json());
    app.use("/", createPhase3Router());

    app.get('/ws/stats', (req, res) => {
      res.json({ ok: true, ...getWsStats() });
    });

    app.get('/system/health-monitor', (req, res) => {
      res.json({ ok: true, ...healthMonitorStatus });
    });

    app.get('/system/offline-detector', (req, res) => {
      res.json({ ok: true, ...offlineDetectorStatus });
    });

    app.get('/system/epoch-scheduler', (req, res) => {
      res.json({ ok: true, ...schedulerStatus });
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

    // Treasury settlement status endpoint (mounted early, uses job instance later)
    app.get('/system/treasury-settlement', async (req, res) => {
      try {
        const { TreasurySettlementJob } = await import('./src/jobs/treasury_settlement_job.mjs');
        const job = new TreasurySettlementJob(pool);
        const status = await job.getStatus();
        res.json({ ok: true, ...status });
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    });

    console.log('[BOOT] ✅ Additional routes mounted');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at route mounting:', err.message);
    process.exit(1);
  }

  // Step 6: Create HTTP server
  let httpServer;
  try {
    httpServer = createServer(app);
    console.log('[BOOT] ✅ HTTP server created');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at createServer:', err.message);
    process.exit(1);
  }

  // Step 7: Create WebSocket gateway
  try {
    createWsGateway(httpServer, pool);
    console.log('[BOOT] ✅ WebSocket gateway created');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at createWsGateway:', err.message);
    process.exit(1);
  }

  // Step 8: Start health monitor
  try {
    startHealthMonitor(pool);
    console.log('[BOOT] ✅ Health monitor started');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at startHealthMonitor:', err.message);
    process.exit(1);
  }

  // Step 9: Start offline detector
  try {
    startOfflineDetector(pool);
    console.log('[BOOT] ✅ Offline detector started');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at startOfflineDetector:', err.message);
    process.exit(1);
  }

  // Step 10: Start epoch scheduler
  try {
    startEpochScheduler(pool);
    console.log('[BOOT] ✅ Epoch scheduler started');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at startEpochScheduler:', err.message);
    process.exit(1);
  }

  // Step 11: Start sentinel (auto-scaler, healer, anomaly, treasury, capacity)
  try {
    startSentinel(pool, redis);
    console.log('[BOOT] ✅ Sentinel started');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at startSentinel:', err.message);
    process.exit(1);
  }

  // Step 12: Start claim expiry job
  try {
    startClaimExpiryJob(pool);
    console.log('[BOOT] ✅ Claim expiry job started');
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at startClaimExpiryJob:', err.message);
    process.exit(1);
  }

  // Step 12b: Start treasury settlement job (auto-forward deposits to ClaimsContract)
  let treasurySettlement;
  try {
    treasurySettlement = startTreasurySettlementScheduler(pool, 5);
    console.log('[BOOT] ✅ Treasury settlement job started (5min interval)');
  } catch (err) {
    console.error('[BOOT] ⚠️ Treasury settlement job failed (non-fatal):', err.message);
  }

  // Step 13: Bind to port
  const PORT = process.env.PORT || 8080;
  try {
    httpServer.listen(PORT, () => {
      console.log('[BOOT] ✅ Server listening on port ' + PORT);
      console.log(`✅ Satelink Backend Running on port ${PORT}`);
      console.log(`📡 WebSocket available at /rpc/ws/:chain`);
      console.log(`🏥 Health monitor started (2min interval)`);
      console.log(`🔍 Offline detector started (2min interval)`);
      console.log(`⏱️ Epoch scheduler started (60s interval)`);
      console.log(`⚖️ Auto-scaler started (30s interval)`);
      console.log(`🔧 RPC-healer started (60s interval)`);
      console.log(`💰 Revenue-monitor started (5min interval)`);
      console.log(`🏦 Treasury-monitor started (10min interval)`);
      console.log(`📊 Capacity-alerter started (2min interval)`);
      console.log(`💸 Treasury-settlement started (5min interval)`);
    });
  } catch (err) {
    console.error('[BOOT] ❌ FAILED at httpServer.listen:', err.message);
    process.exit(1);
  }

  // Step 14: Self-heartbeat — the API server IS the node
  const SELF_NODE_ID = 'NODE-ap-south-1-a09becbb';
  setInterval(async () => {
    try {
      const now = Math.floor(Date.now() / 1000);
      await pool.query(
        `UPDATE registered_nodes
         SET status = 'active', last_heartbeat_at = $1, updated_at = $1
         WHERE node_id = $2`,
        [now, SELF_NODE_ID]
      );
      console.log(`[Self-Heartbeat] ✅ ${SELF_NODE_ID} heartbeat sent`);
    } catch (err) {
      console.error('[Self-Heartbeat] ❌ Failed:', err.message);
    }
  }, 300000); // Every 5 minutes
  console.log(`[BOOT] ✅ Self-heartbeat started for ${SELF_NODE_ID} (5min interval)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start();
}
