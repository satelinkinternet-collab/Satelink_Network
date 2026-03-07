import express from "express";
import Database from "better-sqlite3";
import { attachBaseMiddleware } from "./core/middleware.js";
import { attachSchema } from "./core/schema.js";
import { attachSecurity } from "./core/security.js";
import { attachHeartbeat } from "./core/heartbeat.js";
import { attachRoutes } from "./core/routes.js";
import { attachUI } from "./core/ui.js";

const app = express();
const db = new Database("satelink.db");

// Attach modules in strict order
attachBaseMiddleware(app);
attachSchema(db);
attachSecurity(app, db);
attachHeartbeat(app, db);
attachRoutes(app, db);
attachUI(app, db);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Satelink Production Node listening on port ${PORT}`);
    console.log(`- Health: http://localhost:${PORT}/health`);
    console.log(`- UI:     http://localhost:${PORT}/ui`);
});
