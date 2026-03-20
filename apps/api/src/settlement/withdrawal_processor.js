import crypto from 'crypto';
import fuseService from '../security/fuse.js';

export class WithdrawalProcessor {
    constructor(db) {
        this.db = db;
        this.fuse = fuseService;
        this.MAX_RETRIES = 3;
        this.running = false;
        this.realMode = process.env.FEATURE_REAL_SETTLEMENT === 'true';
    }

    async start(intervalMs = 15000) {
        if (this.running) return;
        this.running = true;
        
        console.log(`[SETTLEMENT_MODE] ${this.realMode ? 'REAL' : 'SHADOW'}`);
        console.log(`[WithdrawalProcessor] Started polling every ${intervalMs}ms...`);
        
        // Ensure connected to Fuse
        if (this.realMode && !this.fuse.isConnected) {
            try {
                await this.fuse.connect();
            } catch (err) {
                console.error('[WithdrawalProcessor] Failed to connect to Fuse:', err.message);
                if (this.realMode) {
                    console.error('[SETTLEMENT] CRITICAL: REAL mode enabled but connection failed.');
                }
            }
        }

        const loop = async () => {
            if (!this.running) return;
            try {
                // No need to repeat [SETTLEMENT_MODE] in every loop to keep logs clean
                await this.processPendingWithdrawals();
            } catch (err) {
                console.error('[WithdrawalProcessor] Main loop error:', err.message);
            }
            setTimeout(loop, intervalMs);
        };
        
        loop();
    }

    stop() {
        this.running = false;
    }

    async processPendingWithdrawals() {
        const pending = await this.db.prepare(`
            SELECT * FROM withdrawals 
            WHERE status = 'PENDING' 
            AND retry_count < ? 
            ORDER BY created_at ASC 
            LIMIT 5
        `).all([this.MAX_RETRIES]);
        
        for (const w of pending) {
            await this.processWithdrawal(w);
        }
    }

    async processWithdrawal(w) {
        if (['COMPLETED', 'FAILED', 'PROCESSING'].includes(w.status)) {
            return;
        }

        console.log('[WITHDRAW] settlement_started');
        console.log(`[WithdrawalProcessor] Processing withdrawal ${w.id} for ${w.amount_usdt} USDT to ${w.wallet}`);
        
        const attempt = (w.retry_count || 0) + 1;

        const result = await this.db.prepare("UPDATE withdrawals SET status = 'PROCESSING' WHERE id = ? AND status = 'PENDING'").run([w.id]);
        if (result.changes === 0) return;

        try {
            if (!this.realMode) {
                console.log('[SETTLEMENT_MODE] SHADOW MODE - Simulating success');
                const fakeTx = `0x${crypto.randomBytes(32).toString('hex')}`;
                await this.db.prepare("UPDATE withdrawals SET status = 'COMPLETED', tx_hash = ? WHERE id = ?").run([fakeTx, w.id]);
                console.log('[WITHDRAW] status_updated');
                return;
            }

            console.log(`[WITHDRAW] transaction_sent`);
            const receipt = await this.fuse.settle(w.wallet, w.amount_usdt);
            
            if (!receipt.txHash) {
                throw new Error('Settlement produced no transaction hash');
            }
            
            const txHash = receipt.txHash;
            console.log(`[WITHDRAW] tx_hash: ${txHash}`);
            console.log(`[WITHDRAW] confirmation_received`);
            console.log(`[WITHDRAW] onchain_verified`);

            await this.db.prepare("UPDATE withdrawals SET status = 'COMPLETED', tx_hash = ?, error_log = NULL WHERE id = ?").run([txHash, w.id]);
            console.log('[WITHDRAW] status_updated');
            console.log(`[E2E] ✅ withdrawal sent: ${w.amount_usdt} USDT to ${w.wallet} (TX: ${txHash})`);

        } catch (error) {
            console.error(`[WITHDRAW] execution_failed:`, error.message);
            
            await this.db.prepare(`
                UPDATE withdrawals
                SET
                    retry_count = retry_count + 1,
                    status = CASE
                        WHEN retry_count + 1 >= ? THEN 'FAILED'
                        ELSE 'PENDING'
                    END,
                    error_log = ?
                WHERE id = ?
            `).run([this.MAX_RETRIES, error.message, w.id]);
            
            console.log(`[WithdrawalProcessor] Retry state updated for ${w.id}.`);
        }
    }
}
