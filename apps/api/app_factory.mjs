import "dotenv/config";
import express from "express";
import { attachBaseMiddleware } from "./src/security/middleware.js";
import { attachSecurity } from "./src/security/security.js";
import { attachHeartbeat } from "./src/nodes/heartbeat.js";
import { attachRoutes } from "./src/gateway/routes.js";
import { attachUI } from "./src/gateway/ui.js";

export async function createApp(db) {
  const app = express();

  // ── Kill all caching: real-time financial data must NEVER be cached ──
  app.disable('etag');
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // Attach modules in same order as server.js
  // Note: attachSchema is called separately in server.js before createApp
  attachBaseMiddleware(app);
  attachSecurity(app, db);
  attachHeartbeat(app, db);
  attachRoutes(app, db);
  attachUI(app, db);

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error("[SERVER] Unhandled Exception:", err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }
    // Ensure API endpoints consistently return JSON
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  });

  return app;
}

export default createApp;
