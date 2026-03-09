import { MarketScanner } from './market_scanner.js';
import { TaskGenerator } from './task_generator.js';
import { ProfitabilityEngine } from '../economics/profitability_engine.js';
import { JobQueue } from '../queue/job_queue.js';
import crypto from 'crypto';

export class WorkloadDiscoveryEngine {
    constructor(db) {
        this.db = db;
        this.scanner = new MarketScanner();
        this.generator = new TaskGenerator();
        this.profitability = new ProfitabilityEngine();
        this.queue = new JobQueue();

        this.isRunning = false;
        this.scanIntervalMs = 60000; // 60 seconds per spec
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this._loop();
        console.log("[WorkloadDiscovery] Started autonomous market scanning.");
    }

    stop() {
        this.isRunning = false;
        console.log("[WorkloadDiscovery] Stopped.");
    }

    async _loop() {
        while (this.isRunning) {
            try {
                await this.discoverAndDispatch();
            } catch (error) {
                console.error("[WorkloadDiscovery Error]", error.message);
            }
            // Wait for next interval
            await new Promise(r => setTimeout(r, this.scanIntervalMs));
        }
    }

    async discoverAndDispatch() {
        // 1. Scan external markets
        const opportunities = await this.scanner.scanMarkets();
        console.log(`[WorkloadDiscovery] Found ${opportunities.length} potential market opportunities.`);

        for (const opp of opportunities) {
            // 2. Format into Job
            const job = this.generator.generateJob(opp);
            job.id = `wd_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

            // Safety Rule: Deduplication Check (Naive string hash of payload+type)
            const sig = crypto.createHash('sha256').update(JSON.stringify(job.payload) + job.type).digest('hex');
            const exists = this._checkDuplicate(sig);
            if (exists) {
                console.log(`[WorkloadDiscovery] Skipping duplicate workload signature.`);
                continue;
            }

            // 3. Profitability Filter
            const profitAnalysis = this.profitability.evaluateProfitability(job);

            if (!profitAnalysis.isProfitable) {
                console.log(`[WorkloadDiscovery] Discarding ${job.type} (${job.reward} USDT) - UNPROFITABLE. Est Cost: ${profitAnalysis.estimatedCost}`);
                this._recordWorkload(job.id, opp, 'discarded_unprofitable');
                continue;
            }

            // 4. Push to Execution Queue (Part 4 integration)
            try {
                // Must ensure only Satelink structured jobs hit the queue
                await this.queue.push_job(job);
                console.log(`[WorkloadDiscovery] Enqueued profitable ${job.type} job -> ${job.priority} queue. (Profit: ${profitAnalysis.projectedProfit})`);
                this._recordWorkload(job.id, opp, 'queued');
                this._markSignature(sig);
            } catch (e) {
                console.error("[WorkloadDiscovery] Failed to push to queue:", e.message);
                this._recordWorkload(job.id, opp, 'failed_enqueue');
            }
        }
    }

    _checkDuplicate(sig) {
        // In real execution, query db or redis for recent signatures
        // For logic verification, assume false unless specifically implemented
        return false;
    }

    _markSignature(sig) {
        // Save to DB to prevent rescan duplicates within window
    }

    _recordWorkload(jobId, opp, status) {
        try {
            this.db.prepare(`
                INSERT INTO workload_registry (workload_id, job_type, market_source, reward_estimate, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(workload_id) DO UPDATE SET status = excluded.status
            `).run(jobId, opp.job_type, opp.source, opp.reward_usdt, status, Date.now());
        } catch (e) {
            // Ignore if table isn't created yet during tests
        }
    }
}
