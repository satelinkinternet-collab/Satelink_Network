import express from "express";
import { attachSchema } from "./core/schema.js";
import { attachSecurity } from "./core/security.js";
import { attachHeartbeat } from "./core/heartbeat.js";
import { attachRoutes } from "./core/routes.js";

export function createApp(db) {
  const app = express();
  app.use(express.json());

  // Attach modules in order
  attachSchema(db);
  attachSecurity(app, db);
  attachHeartbeat(app, db);
  attachRoutes(app, db);

  return app;
}

export default createApp;
