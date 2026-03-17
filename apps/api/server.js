import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { validateEnv } from "./src/utils/validateEnv.js";
import { logger } from "./src/monitoring/logger.js";
import { createApp } from "./app_factory.mjs";
import { getValidatedDB } from "./src/core/db/index.js";
import { DepositDetector } from "./src/settlement/deposit_detector.js";
import { BatchCreator } from "./src/settlement/batch_creator.js";
import { Scheduler } from "./src/monitoring/ops/scheduler.js";
import { AlertService } from "./src/monitoring/ops/alerts.js";
import { RuntimeMonitor } from "./src/monitoring/runtime_monitor.js";
import { OperationsEngine } from "./src/core/operations_engine.js";
import { MemoryWatchdog } from "./src/monitoring/memory_watchdog.js";

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
    // Use UniversalDB: PostgreSQL when DATABASE_URL is set, SQLite otherwise
    const db = getValidatedDB({
        sqlitePath: process.env.SQLITE_PATH || "satelink.db"
    });
    await db.init();

    // Ensure core tables exist (idempotent)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS auth_nonces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            address TEXT NOT NULL,
            nonce TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            used_at INTEGER,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS trusted_devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet TEXT NOT NULL,
            device_public_id TEXT NOT NULL,
            user_agent TEXT,
            ip_hash TEXT,
            first_seen_at INTEGER,
            last_seen_at INTEGER,
            status TEXT DEFAULT 'active',
            UNIQUE(wallet, device_public_id)
        );
        CREATE TABLE IF NOT EXISTS system_flags (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS revenue_events_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            epoch_id INTEGER,
            op_type TEXT NOT NULL,
            node_id TEXT,
            client_id TEXT,
            request_id TEXT,
            timestamp INTEGER,
            payload_hash TEXT,
            metadata_hash TEXT,
            amount_usdt REAL DEFAULT 0,
            revenue_usdt REAL DEFAULT 0,
            node_share REAL DEFAULT 0,
            platform_share REAL DEFAULT 0,
            dist_share REAL DEFAULT 0,
            status TEXT DEFAULT 'completed',
            created_at INTEGER,
            price_version INTEGER DEFAULT 1,
            surge_multiplier REAL DEFAULT 1.0,
            unit_cost REAL DEFAULT 0,
            unit_count INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS slow_queries (
            query_hash TEXT PRIMARY KEY,
            avg_ms REAL,
            p95_ms REAL,
            count INTEGER DEFAULT 0,
            last_seen_at INTEGER,
            sample_sql TEXT,
            source TEXT
        );
        CREATE TABLE IF NOT EXISTS error_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service TEXT,
            route TEXT,
            method TEXT,
            status_code INTEGER,
            message TEXT,
            stack_hash TEXT,
            stack_preview TEXT,
            first_seen_at INTEGER,
            last_seen_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS request_traces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trace_id TEXT UNIQUE,
            request_id TEXT,
            route TEXT,
            method TEXT,
            status_code INTEGER,
            duration_ms INTEGER,
            client_id TEXT,
            node_id TEXT,
            ip_hash TEXT,
            created_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_request_traces_trace_id ON request_traces(trace_id);
        CREATE INDEX IF NOT EXISTS idx_request_traces_created_at ON request_traces(created_at);
        CREATE TABLE IF NOT EXISTS pricing_rules (
            op_type TEXT PRIMARY KEY,
            base_price_usdt REAL NOT NULL,
            surge_enabled INTEGER DEFAULT 0,
            surge_threshold INTEGER DEFAULT 1000,
            surge_multiplier REAL DEFAULT 1.0,
            version INTEGER DEFAULT 1,
            updated_at INTEGER
        );
        INSERT OR IGNORE INTO pricing_rules (op_type, base_price_usdt, updated_at) VALUES ('inference', 0.0001, 1700000000);
        INSERT OR IGNORE INTO pricing_rules (op_type, base_price_usdt, updated_at) VALUES ('storage_gb_hr', 0.00005, 1700000000);
        INSERT OR IGNORE INTO pricing_rules (op_type, base_price_usdt, updated_at) VALUES ('api_relay_execution', 0.00008, 1700000000);
        INSERT OR IGNORE INTO pricing_rules (op_type, base_price_usdt, updated_at) VALUES ('routing_decision_compute', 0.00012, 1700000000);
        INSERT OR IGNORE INTO pricing_rules (op_type, base_price_usdt, updated_at) VALUES ('verification_op', 0.00006, 1700000000);
        INSERT OR IGNORE INTO pricing_rules (op_type, base_price_usdt, updated_at) VALUES ('automation_job_execute', 0.00015, 1700000000);
        CREATE TABLE IF NOT EXISTS epochs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            starts_at INTEGER NOT NULL DEFAULT 0,
            ends_at INTEGER,
            status TEXT DEFAULT 'OPEN',
            total_revenue_usdt REAL DEFAULT 0,
            node_pool_usdt REAL DEFAULT 0,
            platform_share_usdt REAL DEFAULT 0,
            distributor_share_usdt REAL DEFAULT 0,
            total_node_weight REAL DEFAULT 0,
            closed_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS security_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            severity TEXT DEFAULT 'low',
            message TEXT,
            details TEXT,
            status TEXT DEFAULT 'open',
            created_at INTEGER,
            resolved_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS admin_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id TEXT,
            action TEXT,
            target TEXT,
            details TEXT,
            ip_hash TEXT,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS epoch_earnings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            epoch_id INTEGER,
            role TEXT DEFAULT 'node_operator',
            wallet_or_node_id TEXT,
            amount_usdt REAL DEFAULT 0,
            status TEXT DEFAULT 'UNPAID',
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS withdrawals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet TEXT,
            amount_usdt REAL,
            status TEXT DEFAULT 'pending',
            tx_hash TEXT,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS incident_bundles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            severity TEXT,
            node_id TEXT,
            details TEXT,
            status TEXT DEFAULT 'open',
            created_at INTEGER,
            resolved_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS config_limits (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS self_test_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            suite TEXT,
            status TEXT,
            results TEXT,
            duration_ms INTEGER,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS enforcement_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            node_id TEXT,
            action TEXT,
            reason TEXT,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS payout_batches_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            epoch_id INTEGER,
            status TEXT DEFAULT 'pending',
            total_usdt REAL DEFAULT 0,
            tx_hash TEXT,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS settlement_shadow_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER,
            expected_usdt REAL,
            actual_usdt REAL,
            drift_pct REAL,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS settlement_evm_txs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER,
            tx_hash TEXT,
            status TEXT,
            gas_used INTEGER,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS node_uptime (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            node_wallet TEXT NOT NULL,
            epoch_id INTEGER NOT NULL,
            uptime_seconds INTEGER DEFAULT 0,
            score INTEGER DEFAULT 0,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS auth_failures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet TEXT,
            ip_hash TEXT,
            reason TEXT,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS registered_nodes (
            wallet TEXT PRIMARY KEY,
            node_id TEXT,
            node_type TEXT DEFAULT 'community',
            management_type TEXT DEFAULT 'self_hosted',
            active INTEGER DEFAULT 0,
            is_flagged INTEGER DEFAULT 0,
            last_heartbeat INTEGER,
            last_nonce TEXT,
            infra_reserved INTEGER DEFAULT 0,
            updatedAt INTEGER,
            latency REAL,
            bandwidth REAL
        );
        CREATE TABLE IF NOT EXISTS job_queue_log (
            job_id TEXT PRIMARY KEY,
            client_id TEXT,
            job_type TEXT,
            payload TEXT,
            priority INTEGER DEFAULT 5,
            reward REAL DEFAULT 0,
            status TEXT DEFAULT 'pending',
            route TEXT,
            created_at INTEGER,
            completed_at INTEGER
        );
    `);

    const app = createApp(db);
    const PORT = process.env.PORT || 8080;

    const server = app.listen(PORT, async () => {
        logger.info(`🚀 Satelink Backend Running`, { port: PORT, mode: process.env.NODE_ENV, db: db.type });

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

        // Start Settlement Pipeline: batch creator + engine processing loop
        const settlementEngine = app.get('settlementEngine');
        if (settlementEngine) {
            const batchCreator = new BatchCreator(db);
            const SETTLEMENT_INTERVAL = parseInt(process.env.SETTLEMENT_INTERVAL_MS) || 60000;

            const settlementTimer = setInterval(async () => {
                try {
                    await batchCreator.createBatches();
                    await settlementEngine.processQueue();
                } catch (e) {
                    logger.error("Settlement cycle error", { error: e.message });
                }
            }, SETTLEMENT_INTERVAL);

            app.set('settlementTimer', settlementTimer);
            app.set('batchCreator', batchCreator);
            logger.info("Settlement pipeline active", { intervalMs: SETTLEMENT_INTERVAL });
        }

        // Start Scheduler (7-loop background orchestrator)
        try {
            const opsEngine = new OperationsEngine(db, null, null);
            await opsEngine.init();
            const alertService = new AlertService();
            const runtimeMonitor = new RuntimeMonitor();
            const scheduler = new Scheduler(opsEngine, alertService, runtimeMonitor, null, {});
            scheduler.start();
            app.set('scheduler', scheduler);
            logger.info("Scheduler started (epoch, health, node lifecycle, maintenance, runtime, backup, economics)");

            // Start Memory Watchdog for 72h endurance monitoring
            const memWatchdog = new MemoryWatchdog({
                intervalMs: 60000,
                windowMs: 30 * 60 * 1000,
                threshold: 0.30,
                onWarning: (msg) => {
                    logger.warn(msg);
                    alertService.send?.(msg, 'warn').catch(() => {});
                },
            });
            memWatchdog.start();
            app.set('memoryWatchdog', memWatchdog);
        } catch (e) {
            logger.error("Scheduler startup failed", { error: e.message });
        }
    });

    // Store references for graceful shutdown
    app.set('server', server);
    app.set('db', db);

    // ── Graceful Shutdown ──
    let isShuttingDown = false;

    async function gracefulShutdown(signal) {
        if (isShuttingDown) return;
        isShuttingDown = true;
        logger.info(`${signal} received — starting graceful shutdown`);

        // 1. Stop settlement timer, scheduler, and memory watchdog
        const settlementTimer = app.get('settlementTimer');
        if (settlementTimer) clearInterval(settlementTimer);
        const scheduler = app.get('scheduler');
        if (scheduler) scheduler.stop();
        const memWatchdog = app.get('memoryWatchdog');
        if (memWatchdog) memWatchdog.stop();

        // 2. Stop accepting new connections
        server.close(() => {
            logger.info("HTTP server closed");
        });

        // 3. Allow in-flight requests to drain (max 2s)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 4. Close database connection
        try {
            db.close();
            logger.info("Database connection closed");
        } catch (e) {
            logger.error("Error closing database", { error: e.message });
        }

        logger.info("Shutdown complete");
        process.exit(0);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
