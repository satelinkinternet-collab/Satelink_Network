import express from "express";
import Database from "better-sqlite3";
import { attachSchema } from "./core/schema.js";
import { attachSecurity } from "./core/security.js";
import { attachHeartbeat } from "./core/heartbeat.js";
import { attachRoutes } from "./core/routes.js";

const app = express();
app.use(express.json());

const db = new Database("satelink.db");

// Attach modules in order
attachSchema(db);
attachSecurity(app, db);
attachHeartbeat(app, db);
attachRoutes(app, db);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Satelink Production Node listening on port ${PORT}`);
});
