import "./src/core/config/dotenv_boot.js";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./src/monitoring/logger.js";
import { createApp } from "./app_factory.mjs";
import { PgDatabase } from "./src/database/pg_adapter.js";
import { validateEnv } from "./src/utils/validateEnv.js";
import { attachSchema } from "./src/core/schema.js";
import { RevenueOracle } from "./src/economics/revenue_oracle.js";
import { NodeLeaderboard } from "./src/monitoring/node_leaderboard.js";
import { TreasuryMonitor } from "./src/monitoring/treasury_monitor.js";
import { BackupService } from "./src/utils/backup_service.js";
import { NodeopsWaterfallService } from "./src/ops-agent/nodeops_waterfall.js";

// Global error handlers
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason?.stack || reason);
    logger.error("Unhandled Rejection", { reason: reason?.stack || reason });
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err.stack);
    logger.error("Uncaught Exception", { error: err.stack });
    process.exit(1);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.cwd() !== __dirname) {
    process.chdir(__dirname);
}

validateEnv();

const DATABASE_URL = process.env.DATABASE_URL;

    try {
        const db = await PgDatabase.create(DATABASE_URL);

        let dbReady = false;
        while (!dbReady) {
            try {
                await db.prepare('SELECT 1').get();
                dbReady = true;
                logger.info("[BOOT] DB connected");
            } catch (e) {
                logger.warn("[BOOT] Waiting for Postgres healthy...");
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        await attachSchema(db);

        // Initialize modules
        const oracle = new RevenueOracle(null, db);
        await oracle.init();
        const leaderboard = new NodeLeaderboard(db);
        await leaderboard.init();
        const treasury = new TreasuryMonitor(null, db);
        await treasury.init();
        const backup = new BackupService(db);
        await backup.init();
        const opsWaterfall = new NodeopsWaterfallService(db);
        await opsWaterfall.init();

        logger.info("[BOOT] Modules initialized");

        const app = await createApp(db);
        logger.info("[BOOT] App initialized");
    const PORT = process.env.PORT || 8081;

    app.listen(PORT, () => {
        logger.info(`Satelink Gateway Running`, { port: PORT, mode: process.env.NODE_ENV, db: "postgres" });
    });
} catch (e) {
    console.error("BOOT FAILURE IN GATEWAY:", e);
    logger.error("Fatal: Could not start gateway", { error: e.message });
    process.exit(1);
}
