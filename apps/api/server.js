import { createServer } from 'http';
import { createApp } from "./app_factory.mjs";
import { createWsGateway, getWsStats } from "./src/workloads/rpc_gateway/ws_gateway.js";
import pkg from "pg";

const { Pool } = pkg;

async function start() {
  try {
    console.log("🚀 SERVER STARTED - ROUTES LOADING");

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    });

    const app = createApp(pool);

    app.get('/ws/stats', (req, res) => {
      res.json({ ok: true, ...getWsStats() });
    });

    const httpServer = createServer(app);

    createWsGateway(httpServer, pool);

    const PORT = process.env.PORT || 8080;

    httpServer.listen(PORT, () => {
      console.log(`✅ Satelink Backend Running on port ${PORT}`);
      console.log(`📡 WebSocket available at /rpc/ws/:chain`);
    });

  } catch (err) {
    console.error("BOOT FAILURE IN SERVER:", err);
    process.exit(1);
  }
}

start();
