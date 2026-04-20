import express from "express";

export function createApp(pool) {
  const app = express();

  app.use(express.json());

  // health route
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // attach API routes if exists
  try {
    const revenueRoutes = await import("./src/routes/revenue.js");
    app.use("/api", revenueRoutes(pool));
  } catch (e) {
    console.log("Revenue routes not loaded");
  }

  return app;
}
