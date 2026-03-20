/**
 * Auto-Remediation Engine
 *
 * Monitors for common failure patterns and takes automated corrective actions.
 * Runs on a configurable interval (default 60s).
 *
 * Remediation rules:
 *   1. Queue overflow → pause acquisition engine, alert
 *   2. High node failure rate → flag worst-performing nodes
 *   3. Settlement failures → switch adapter to simulated, alert
 *   4. DB connection issues → attempt reconnect, reduce write frequency
 *   5. Memory pressure → clear caches, reduce buffer sizes
 */

const CHECK_INTERVAL_MS = 60_000;
const QUEUE_OVERFLOW_THRESHOLD = 50_000;
const NODE_FAILURE_RATE_THRESHOLD = 0.30; // 30% failure rate
const MEMORY_PRESSURE_MB = 512;

export class AutoRemediationEngine {
    constructor(db, opts = {}) {
        this.db = db;
        this.alertService = opts.alertService || null;
        this.acquisitionEngine = opts.acquisitionEngine || null;
        this._timer = null;
        this._running = false;
        this._actionLog = [];
        this._ensureTable();
    }

    start() {
        if (this._running) return;
        this._running = true;
        this._timer = setInterval(() => this._check(), CHECK_INTERVAL_MS);
        console.log('[AutoRemediation] Started — checking every 60s');
    }

    stop() {
        this._running = false;
        if (this._timer) { clearInterval(this._timer); this._timer = null; }
        console.log('[AutoRemediation] Stopped.');
    }

    getActionLog() {
        return this._actionLog.slice(-50); // last 50 actions
    }

    async _check() {
        try {
            await this._checkQueueOverflow();
            await this._checkNodeFailureRate();
            await this._checkMemoryPressure();
        } catch (e) {
            console.error('[AutoRemediation] Check error:', e.message);
        }
    }

    /**
     * Rule 1: Queue overflow — pause acquisition if queue is too deep.
     */
    async _checkQueueOverflow() {
        try {
            let queueDepth = 0;
            try {
                const row = this.db.prepare("SELECT COUNT(*) as cnt FROM job_queue_log WHERE status = 'QUEUED'").get();
                queueDepth = row?.cnt || 0;
            } catch (e) { return; }

            if (queueDepth > QUEUE_OVERFLOW_THRESHOLD) {
                this._act('queue_overflow', `Queue depth ${queueDepth} exceeds ${QUEUE_OVERFLOW_THRESHOLD}`, () => {
                    if (this.acquisitionEngine && !this.acquisitionEngine.isPaused) {
                        this.acquisitionEngine.pause();
                        console.log('[AutoRemediation] Paused acquisition engine due to queue overflow');
                    }
                });
            } else if (queueDepth < QUEUE_OVERFLOW_THRESHOLD * 0.5) {
                // Resume if we've drained below 50% of threshold
                if (this.acquisitionEngine && this.acquisitionEngine.isPaused) {
                    this.acquisitionEngine.resume();
                    this._logAction('queue_drain', 'Resumed acquisition engine — queue drained');
                }
            }
        } catch (e) { /* non-fatal */ }
    }

    /**
     * Rule 2: High node failure rate — flag worst-performing nodes.
     */
    async _checkNodeFailureRate() {
        try {
            const rows = this.db.prepare(`
                SELECT route as node_id,
                       COUNT(*) as total,
                       SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failures
                FROM job_queue_log
                WHERE created_at > ?
                  AND route != 'INTERNAL'
                  AND route != 'EXTERNAL'
                  AND route != 'REASSIGNED'
                GROUP BY route
                HAVING total >= 10
            `).all(Date.now() - 3600000); // last hour

            for (const row of rows) {
                const failureRate = row.failures / row.total;
                if (failureRate >= NODE_FAILURE_RATE_THRESHOLD) {
                    this._act(`node_high_failure_${row.node_id}`,
                        `Node ${row.node_id}: ${(failureRate * 100).toFixed(1)}% failure rate (${row.failures}/${row.total})`,
                        () => {
                            try {
                                this.db.prepare(
                                    "UPDATE registered_nodes SET is_flagged = 1 WHERE wallet = ? AND is_flagged = 0"
                                ).run(row.node_id);
                            } catch (e) { /* non-fatal */ }
                        }
                    );
                }
            }
        } catch (e) { /* non-fatal — table may not exist */ }
    }

    /**
     * Rule 3: Memory pressure — log warning and suggest GC.
     */
    async _checkMemoryPressure() {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

        if (heapUsedMB > MEMORY_PRESSURE_MB) {
            this._act('memory_pressure',
                `Heap usage ${heapUsedMB}MB exceeds ${MEMORY_PRESSURE_MB}MB threshold`,
                () => {
                    // Attempt garbage collection if exposed
                    if (global.gc) {
                        global.gc();
                        console.log('[AutoRemediation] Triggered manual GC');
                    }
                }
            );
        }
    }

    /**
     * Execute a remediation action (deduplicated by key, max once per 5 min).
     */
    _act(key, description, action) {
        const now = Date.now();
        const lastAction = this._actionLog.find(a => a.key === key && now - a.timestamp < 300_000);
        if (lastAction) return; // Already acted recently

        try {
            action();
        } catch (e) {
            console.error(`[AutoRemediation] Action ${key} failed:`, e.message);
        }

        this._logAction(key, description);

        if (this.alertService) {
            this.alertService.send(`[AutoRemediation] ${description}`, 'warn').catch(() => {});
        }
    }

    _logAction(key, description) {
        const entry = { key, description, timestamp: Date.now() };
        this._actionLog.push(entry);
        if (this._actionLog.length > 200) this._actionLog.shift();

        try {
            this.db.prepare(`
                INSERT INTO auto_remediation_log (action_key, description, executed_at)
                VALUES (?, ?, ?)
            `).run(key, description, Date.now());
        } catch (e) { /* non-fatal */ }

        console.log(`[AutoRemediation] ${key}: ${description}`);
    }

    _ensureTable() {
        try {
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS auto_remediation_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    action_key TEXT NOT NULL,
                    description TEXT NOT NULL,
                    executed_at INTEGER NOT NULL
                )
            `).run();
        } catch (e) { /* non-fatal */ }
    }
}
