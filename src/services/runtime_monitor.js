
import { performance } from 'perf_hooks';

export class RuntimeMonitor {
    constructor(db, alertService) {
        this.db = db;
        this.alertService = alertService;
        this.lastLoopCheck = performance.now();
        this.maxHeapMB = 0;
        this.consecutiveHighHeap = 0; // minutes
    }

    async init() {
        console.log("[Runtime] Monitor initialized.");
    }

    async collect() {
        try {
            const now = Date.now();

            // 1. Memory
            const mem = process.memoryUsage();
            const heapMB = mem.heapUsed / 1024 / 1024;
            const rssMB = mem.rss / 1024 / 1024;
            this.maxHeapMB = Math.max(this.maxHeapMB, heapMB);

            // 2. Event Loop Lag
            const start = performance.now();
            await new Promise(resolve => setImmediate(resolve));
            const lag = performance.now() - start;

            // 3. Store
            await this.db.query(
                `INSERT INTO runtime_metrics (heap_used_mb, rss_mb, event_loop_lag_ms, created_at) VALUES (?, ?, ?, ?)`,
                [heapMB, rssMB, lag, now]
            );

            // 4. Alerts
            // Heap Warning > 512MB (adjust for machine)
            if (heapMB > 512) {
                this.consecutiveHighHeap++;
                if (this.consecutiveHighHeap >= 5) { // 5 mins sustained
                    await this.alertService.send(`⚠️ HIGH MEMORY: Heap ${heapMB.toFixed(0)}MB for 5m`, 'warn');
                    this.consecutiveHighHeap = 0; // debounce
                }
            } else {
                this.consecutiveHighHeap = 0;
            }

            // Loop Lag Warning > 100ms
            if (lag > 100) {
                await this.alertService.send(`⚠️ HIGH LAG: Event Loop ${lag.toFixed(0)}ms`, 'warn');
            }

        } catch (e) {
            console.error("[Runtime] Collect failed:", e.message);
        }
    }
}
