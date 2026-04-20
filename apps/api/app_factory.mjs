import express from "express";
import revenueRoutes from "./src/routes/revenue.js";

export function createApp(pool) {
  const app = express();

  app.use(express.json());

  // health
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API routes
  app.use("/api", revenueRoutes(pool));

  return app;
}
