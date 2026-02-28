import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { validateEnv } from "./utils/validateEnv.js";
import { logger } from "./utils/logger.js";
import { createApp } from "./app_factory.mjs";
import Database from "better-sqlite3";
import { DepositDetector } from "./src/services/deposit_detector.js";

// --- Enforce Directory Root Priority ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.cwd() !== __dirname) {
    logger.warn(`⚠️ Not running from project root. Adjusting from ${process.cwd()} ...`);
    process.chdir(__dirname);
}

// Ensure startup meets minimal dependencies
validateEnv();

export { createApp };
export default createApp;

// If we are not running under Mocha (tests), boot the server
if (process.env.NODE_ENV !== "test" && !process.env.MOCHA) {
    // Only SQLite currently instantiated natively here. In true Prod, Db connection should route 
    // to PostgreSQL based on DB_TYPE. However, we simply mount it safely for now
    const db = new Database(process.env.SQLITE_PATH || "satelink.db");
    const app = createApp(db);
    const PORT = process.env.PORT || 8080;

    app.listen(PORT, async () => {
        logger.info(`🚀 Satelink Backend Running`, { port: PORT, mode: process.env.NODE_ENV, db: process.env.DB_TYPE });

        // Start Deposit Detector if Real Settlement is enabled
        if (process.env.FEATURE_REAL_SETTLEMENT === 'true') {
            try {
                const detector = new DepositDetector(db);
                await detector.start();
                logger.info("Deposit Detector activated natively on-chain");
            } catch (e) {
                logger.error("Failed to start Deposit Detector", { error: e.message });
            }
        } else {
            logger.info("Simulated mode - Deposit Detector offline.");
        }
    });
}
