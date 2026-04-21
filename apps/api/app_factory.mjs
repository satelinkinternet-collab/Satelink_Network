import express from "express";
import revenueRoutes from "./src/routes/revenue.js";

export function createApp(pool) {
  const app = express();

  app.use(express.json());
app.use((req,res,next)=>{console.log("[HIT]", req.originalUrl); next();});
  app.use("/api", revenueRoutes(pool));
app.use((req,res,next)=>{console.log("[HIT]", req.originalUrl); next();});

  // health
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API routes
  app.use("/api", revenueRoutes(pool));
app.use((req,res,next)=>{console.log("[HIT]", req.originalUrl); next();});

  return app;
}
