import express from "express";
import revenueRoutes from "./src/routes/revenue.js";

export function createApp(pool) {
  const app = express();

  app.use(express.json());

  // Core endpoints
  app.get("/healthz", (req, res) => res.status(200).json({ status: "ok" }));
  app.get("/health", (req, res) => res.json({ status: "ok" }));

  app.get("/api/mode", (req, res) => {
    res.status(200).json({
      ok: true,
      mode: process.env.SATELINK_MODE || "simulation",
      env: process.env.NODE_ENV || "development"
    });
  });

  app.get("/api/runtime-info", (req, res) => {
    res.status(200).json({ ok: true, version: "1.0.0", uptime: process.uptime() });
  });

  app.all("/rpc", (req, res) => res.status(200).json({ ok: true, gateway: "stub" }));

  app.get("/simulation/status", (req, res) => res.status(200).json({ ok: true, mode: "simulation", active: true }));

  // Revenue API routes
  app.use("/api", revenueRoutes(pool));

  return app;
}
