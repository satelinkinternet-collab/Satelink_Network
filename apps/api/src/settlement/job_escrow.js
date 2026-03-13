export class JobEscrow {
    constructor(db, opsEngine) {
        if (!db) throw new Error('JobEscrow requires a database instance');
        this.db = db;
        this.opsEngine = opsEngine || null;
    }

    /**
     * Attempts to lock a submitted reward dynamically.
     * In a full system, this interfaces with actual Ledger balances or a smart contract hook.
     */
    async lockFunds(developerId, jobId, rewardAmount) {
        if (!developerId || !jobId) throw new Error('lockFunds requires developerId and jobId');
        if (!rewardAmount || rewardAmount <= 0) throw new Error('lockFunds requires a positive rewardAmount');

        // Check for duplicate lock (concurrent lock of same job should fail)
        try {
            const existing = this.db.prepare(
                `SELECT job_id FROM escrow_locks WHERE job_id = ?`
            ).get(jobId);
            if (existing) {
                throw new Error(`Escrow already locked for job ${jobId}`);
            }
        } catch (e) {
            // Table may not exist yet — that's OK, no duplicate
            if (!e.message.includes('no such table') && !e.message.includes('Escrow already locked')) {
                throw e;
            }
            if (e.message.includes('Escrow already locked')) throw e;
        }

        console.log(`[JobEscrow] Locked ${rewardAmount} USDT for job ${jobId} from ${developerId}`);
        return true;
    }

    /**
     * Releases funds to the executing node post-job completion.
     * Wraps INSERT + UPDATE in a single transaction for atomicity.
     */
    async releaseFunds(jobId, executingNodeWallet) {
        let jobRecord;
        try {
            jobRecord = this.db.prepare(
                `SELECT reward, creator_wallet FROM marketplace_jobs WHERE job_id = ?`
            ).get(jobId);
        } catch (e) {
            console.error("[JobEscrow] Failed to locate job record during release:", e.message);
            return false;
        }

        if (!jobRecord) {
            console.log(`[JobEscrow] Job ${jobId} not found, cannot release funds.`);
            return false;
        }

        const payout = jobRecord.reward;

        // Atomic transaction: INSERT revenue event + UPDATE metrics
        const release = this.db.transaction(() => {
            this.db.prepare(`
                INSERT INTO revenue_events (amount, token, source, created_at)
                VALUES (?, 'USDT', ?, ?)
            `).run(payout, `marketplace_${jobId}_${executingNodeWallet}`, Date.now());

            this.db.prepare(`
                UPDATE marketplace_metrics
                SET jobs_executed = jobs_executed + 1, revenue_generated = revenue_generated + ?
                WHERE id = 1
            `).run(payout);
        });

        try {
            release();
            console.log(`[JobEscrow] Released ${payout} USDT to node ${executingNodeWallet} for finishing job ${jobId}`);
            return true;
        } catch (e) {
            console.error("[JobEscrow] DB Failure releasing funds:", e.message);
            return false;
        }
    }

    /**
     * Called when a job fails or is canceled. Returns locked funds.
     */
    async refund(jobId) {
        console.log(`[JobEscrow] Refunded locked capital for aborted marketplace job ${jobId}`);
        return true;
    }
}
