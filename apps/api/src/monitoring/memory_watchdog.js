/**
 * Memory Watchdog — 72-hour Endurance Safeguard
 *
 * Tracks heap and RSS every 60 seconds.
 * Logs warnings if memory increases >30% within a 30-minute window.
 * Designed to run inside the API process alongside the scheduler.
 */

export class MemoryWatchdog {
    constructor(options = {}) {
        this.intervalMs = options.intervalMs || 60000;       // sample every 60s
        this.windowMs = options.windowMs || 30 * 60 * 1000;  // 30-minute lookback
        this.threshold = options.threshold || 0.30;           // 30% increase triggers warning
        this.maxSamples = Math.ceil(this.windowMs / this.intervalMs) + 2;

        this.samples = [];
        this.timer = null;
        this.warnings = 0;
        this.onWarning = options.onWarning || null;           // optional callback
    }

    start() {
        if (this.timer) return;
        console.log(`[MemoryWatchdog] Started (interval=${this.intervalMs}ms, window=${this.windowMs}ms, threshold=${this.threshold * 100}%)`);
        this.sample(); // immediate first sample
        this.timer = setInterval(() => this.sample(), this.intervalMs);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    sample() {
        const mem = process.memoryUsage();
        const entry = {
            ts: Date.now(),
            heapUsed: mem.heapUsed,
            heapTotal: mem.heapTotal,
            rss: mem.rss,
            external: mem.external,
        };
        this.samples.push(entry);

        // Trim old samples
        const cutoff = Date.now() - this.windowMs;
        while (this.samples.length > this.maxSamples && this.samples[0].ts < cutoff) {
            this.samples.shift();
        }

        // Check for growth
        this._checkGrowth(entry);
    }

    _checkGrowth(current) {
        if (this.samples.length < 3) return; // need baseline

        const windowStart = Date.now() - this.windowMs;
        const baseline = this.samples.find(s => s.ts >= windowStart) || this.samples[0];

        const heapGrowth = (current.heapUsed - baseline.heapUsed) / Math.max(1, baseline.heapUsed);
        const rssGrowth = (current.rss - baseline.rss) / Math.max(1, baseline.rss);

        if (heapGrowth > this.threshold || rssGrowth > this.threshold) {
            this.warnings++;
            const msg = `[MemoryWatchdog] WARNING #${this.warnings}: ` +
                `heap ${this._mb(baseline.heapUsed)}->${this._mb(current.heapUsed)} (+${(heapGrowth * 100).toFixed(1)}%), ` +
                `rss ${this._mb(baseline.rss)}->${this._mb(current.rss)} (+${(rssGrowth * 100).toFixed(1)}%) ` +
                `over ${((current.ts - baseline.ts) / 60000).toFixed(1)}min`;
            console.warn(msg);

            if (this.onWarning) {
                try { this.onWarning(msg, { heapGrowth, rssGrowth, current, baseline }); } catch (_) {}
            }
        }
    }

    _mb(bytes) {
        return (bytes / 1024 / 1024).toFixed(1) + 'MB';
    }

    getSnapshot() {
        const mem = process.memoryUsage();
        return {
            heapUsed_mb: +(mem.heapUsed / 1024 / 1024).toFixed(1),
            heapTotal_mb: +(mem.heapTotal / 1024 / 1024).toFixed(1),
            rss_mb: +(mem.rss / 1024 / 1024).toFixed(1),
            external_mb: +(mem.external / 1024 / 1024).toFixed(1),
            warnings: this.warnings,
            samples: this.samples.length,
        };
    }
}
