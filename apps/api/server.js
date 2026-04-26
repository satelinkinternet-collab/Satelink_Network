import { createServer } from 'http';
import { createApp } from "./app_factory.mjs";
import { createWsGateway, getWsStats } from "./src/workloads/rpc_gateway/ws_gateway.js";
import { startHealthMonitor, healthMonitorStatus } from "./src/scheduler/node_health_monitor.js";
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

async function start() {
  try {
    console.log("🚀 SERVER STARTED - ROUTES LOADING");

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    });

    const redis = createRedisClient();
    const app = createApp(pool, redis);

    app.get('/ws/stats', (req, res) => {
      res.json({ ok: true, ...getWsStats() });
    });

    app.get('/system/health-monitor', (req, res) => {
      res.json({ ok: true, ...healthMonitorStatus });
    });

    const httpServer = createServer(app);

    createWsGateway(httpServer, pool);

    // Start node health monitor (S2-008)
    startHealthMonitor(pool);

    const PORT = process.env.PORT || 8080;

    httpServer.listen(PORT, () => {
      console.log(`✅ Satelink Backend Running on port ${PORT}`);
      console.log(`📡 WebSocket available at /rpc/ws/:chain`);
      console.log(`🏥 Health monitor started (2min interval)`);
    });

  } catch (err) {
    console.error("BOOT FAILURE IN SERVER:", err);
    process.exit(1);
  }
}

start();
