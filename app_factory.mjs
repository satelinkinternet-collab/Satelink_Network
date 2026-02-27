import express from "express";
import { attachBaseMiddleware } from "./core/middleware.js";
import { attachSchema } from "./core/schema.js";
import { attachSecurity } from "./core/security.js";
import { attachHeartbeat } from "./core/heartbeat.js";
import { attachRoutes } from "./core/routes.js";
import { attachUI } from "./core/ui.js";

export function createApp(db) {
  const app = express();

  // Attach modules in same order as server.js
  attachBaseMiddleware(app);
  attachSchema(db);
  attachSecurity(app, db);
  attachHeartbeat(app, db);
  attachRoutes(app, db);
  attachUI(app, db);

  return app;
}

export default createApp;
