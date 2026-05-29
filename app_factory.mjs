// dotenv/config loaded once in server.js — no duplicate import needed
import express from "express";
import { attachBaseMiddleware } from "./core/middleware.js";
import { attachSchema } from "./core/schema.js";
import { attachSecurity } from "./core/security.js";
import { attachHeartbeat } from "./core/heartbeat.js";
import { attachRoutes } from "./core/routes.js";
import { attachUI } from "./core/ui.js";

export async function createApp(db) {
  const app = express();

  // Attach modules in same order as server.js
  attachBaseMiddleware(app);
  // Skip SQLite schema bootstrap when using PostgreSQL — PG uses its own migration system
  const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql') || process.env.DATABASE_URL?.startsWith('postgres');
  if (!isPostgres) attachSchema(db);
  attachSecurity(app, db);
  attachHeartbeat(app, db);
  await attachRoutes(app, db);
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
