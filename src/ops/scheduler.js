
export class Scheduler {
    constructor(opsEngine, alertService) {
        this.opsEngine = opsEngine;
        this.alertService = alertService;
        this.timer = null;
        this.isRunning = false;
        this.healthTimer = null;
        this.distFailures = 0;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("[SCHEDULER] Started automation loop.");

        // Loop 1: Epoch maintenance (Every 60s)
        this.timer = setInterval(() => this.runEpochCycle(), 60000);

        // Loop 2: Health Monitor (Every 60s, offset 30s)
        setTimeout(() => {
            if (this.isRunning) this.healthTimer = setInterval(() => this.runHealthCheck(), 60000);
        }, 30000);
    }

    stop() {
        this.isRunning = false;
        if (this.timer) clearInterval(this.timer);
        if (this.healthTimer) clearInterval(this.healthTimer);
    }

    async runEpochCycle() {
        try {
            await this.opsEngine.checkSafeMode();
        } catch (e) {
            // Already in safe mode, skipping cycle
            return;
        }

        try {
            const currentId = await this.opsEngine.initEpoch();
            // Epoch Length Policy: 1 hour (3600s) default
            // In MVP we might use shorter epochs or check DB config?
            // Let's assume 1 hour for now or checks the epoch start time.

            const epoch = await this.opsEngine.db.get("SELECT * FROM epochs WHERE id = ?", [currentId]);
            const now = Math.floor(Date.now() / 1000);

            // Should we finalize? 
            // Satelink Rung 4 defined Manual finalization. Rung 8 says "Auto epoch scheduler".
            // Let's say loop checks if (now - started_at) > EPOCH_DURATION (e.g., 3600)
            const EPOCH_DURATION = process.env.EPOCH_DURATION ? parseInt(process.env.EPOCH_DURATION) : 3600;

            if (epoch && (now - epoch.starts_at) >= EPOCH_DURATION) {
                console.log(`[SCHEDULER] Auto-finalizing Epoch ${currentId}...`);

                // 1. Finalize
                await this.opsEngine.finalizeEpoch(currentId);

                // 2. Validate Distribution Logic (Pre-flight)
                const valid = await this.opsEngine.validateDistributionMath(currentId);
                if (!valid.valid) {
                    await this.opsEngine.setSafeMode("Distribution Math Mismatch");
                    await this.alertService.send(`🚨 LOCKDOWN: Distribution Math Mismatch in Epoch ${currentId}. ${valid.error}`, 'fatal');
                    return;
                }

                // 3. Distribute
                try {
                    const res = await this.opsEngine.distributeRewards(currentId);
                    await this.alertService.send(`✅ Rewards Distributed. Epoch ${res.epochId}, Rev: ${res.totalRevenue}, Nodes: ${res.totalDistributed}`);
                    this.distFailures = 0; // Reset
                } catch (distErr) {
                    console.error("[SCHEDULER] Distribution Failed:", distErr);
                    this.distFailures++;
                    if (this.distFailures >= 3) {
                        await this.opsEngine.setSafeMode("3 Consecutive Distribution Failures");
                        await this.alertService.send(`🚨 LOCKDOWN: 3 Consecutive Distribution Failures!`, 'fatal');
                    } else {
                        await this.alertService.send(`⚠️ Distribution Failed for Epoch ${currentId}: ${distErr.message}`, 'error');
                    }
                }
            }
        } catch (e) {
            console.error("[SCHEDULER] Cycle Error:", e);
            if (e.message.includes("SAFE MODE")) return; // already handled
            await this.alertService.send(`⚠️ Scheduler Error: ${e.message}`, 'warn');
        }
    }

    async runHealthCheck() {
        // 1. DB Connectivity (implicit if we query)
        try {
            const now = Date.now();
            await this.opsEngine.db.get("SELECT 1");

            // 2. Webhook Health (Last received)
            // Need a way to track last webhook time? Maybe check latest revenue event?
            // MVP: Just ensure scheduler is alive.

            // 3. Pending Withdrawals
            const pending = (await this.opsEngine.db.get(`SELECT COUNT(*) as c FROM withdrawals WHERE status = 'PENDING'`)).c;
            if (pending > 10) {
                await this.alertService.send(`⚠️ High Pending Withdrawals: ${pending}`, 'warn');
            }

        } catch (e) {
            await this.alertService.send(`🚨 HEALTH CHECK FAILED: ${e.message}`, 'fatal');
        }
    }
}
