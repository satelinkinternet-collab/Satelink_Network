
import { performance } from 'perf_hooks';

export class StressTester {
    constructor(db) {
        this.db = db;
        this.isRunning = false;
        this.currentTest = null;
    }

    async init() {
        console.log("[StressTester] Initializing schema...");
        // Force recreation to ensure schema sync (dev/beta only)
        try { await this.db.query("DROP TABLE IF EXISTS stress_test_runs"); } catch (e) { }

        await this.db.query(`
            CREATE TABLE IF NOT EXISTS stress_test_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                params_json TEXT,
                duration_ms INTEGER,
                ops_count INTEGER,
                avg_latency_ms REAL,
                p95_latency_ms REAL,
                errors INTEGER,
                created_at INTEGER
            )
        `);
    }

    async run(type = 'read_heavy', durationSec = 10, concurrency = 5) {
        if (this.isRunning) throw new Error("Stress test already running");

        this.isRunning = true;
        this.currentTest = { type, durationSec, concurrency, start: Date.now(), ops: 0, errors: 0 };

        console.log(`[StressTester] Starting ${type} test (Dur: ${durationSec}s, Conc: ${concurrency})...`);

        const endTime = Date.now() + (durationSec * 1000);
        const latencies = [];

        // Worker function
        const worker = async () => {
            while (Date.now() < endTime) {
                const start = performance.now();
                try {
                    await this._executeOp(type);
                    latencies.push(performance.now() - start);
                    this.currentTest.ops++;
                } catch (e) {
                    this.currentTest.errors++;
                    // short sleep on error
                    await new Promise(r => setTimeout(r, 10));
                }
            }
        };

        try {
            const workers = Array(concurrency).fill(0).map(() => worker());
            await Promise.all(workers);

            const totalDuration = Date.now() - this.currentTest.start;

            // Calculate Stats
            latencies.sort((a, b) => a - b);
            const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length || 0;
            const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;

            const result = {
                type,
                params: { durationSec, concurrency },
                duration_ms: totalDuration,
                ops_count: this.currentTest.ops,
                avg_latency_ms: avg,
                p95_latency_ms: p95,
                errors: this.currentTest.errors,
                timestamp: Date.now()
            };

            // Log
            await this.db.query(`
                INSERT INTO stress_test_runs (type, params_json, duration_ms, ops_count, avg_latency_ms, p95_latency_ms, errors, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [type, JSON.stringify(result.params), totalDuration, result.ops_count, avg, p95, result.errors, Date.now()]);

            console.log(`[StressTester] Completed. Ops: ${result.ops_count}, p95: ${p95.toFixed(0)}ms`);
            return result;

        } finally {
            this.isRunning = false;
            this.currentTest = null;
        }
    }

    async _executeOp(type) {
        if (type === 'read_heavy') {
            // Mixed read load
            await this.db.query("SELECT * FROM revenue_events_v2 ORDER BY id DESC LIMIT 5");
            await this.db.query("SELECT COUNT(*) FROM error_events");
        } else if (type === 'write_simulation') {
            // Write to a temp table or harmless update
            // We use 'request_traces' as it's high volume and retention cleaned
            await this.db.query(`
                INSERT INTO request_traces (trace_id, route, method, status_code, ip_hash, duration_ms, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [`stress-${Math.random()}`, '/stress', 'POST', 200, 'loc', Math.random() * 100, Date.now()]);
        } else {
            // CPU Loop simulation
            await this.db.get("SELECT 1");
        }
    }

    async getHistory() {
        return await this.db.query("SELECT * FROM stress_test_runs ORDER BY id DESC LIMIT 20");
    }
}
