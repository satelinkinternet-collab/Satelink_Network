import "dotenv/config";
import express from "express";
import { attachBaseMiddleware } from "./src/security/middleware.js";
import { attachSchema } from "./src/core/schema.js";
import { attachSecurity } from "./src/security/security.js";
import { attachHeartbeat, startHeartbeatWatchdog } from "./src/nodes/heartbeat.js";
import { attachRoutes } from "./src/gateway/routes.js";
import { attachUI } from "./src/gateway/ui.js";

export function createApp(db) {
  const app = express();

  // Attach modules in same order as server.js
  attachBaseMiddleware(app);
  attachSchema(db);
  attachSecurity(app, db);
  attachHeartbeat(app, db);
  startHeartbeatWatchdog(db);
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
