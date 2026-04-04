import { ethers } from 'ethers';

export class TreasuryMonitor {
    constructor(fuseService, dbInstance) {
        this.fuse = fuseService;
        this.db = dbInstance;

        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS treasury_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                total_balance TEXT NOT NULL,
                pending_claims_total TEXT NOT NULL,
                liquidity_ratio REAL NOT NULL,
                withdraw_status TEXT NOT NULL,
                snapshot_at INTEGER NOT NULL
            )
        `).run();
    }

    async captureSnapshot() {
        try {
            // 1. Get vault balance from fuse
            const vaultBalanceStr = await this.fuse.getVaultBalance();
            const vaultBalance = ethers.getBigInt(vaultBalanceStr);

            // 2. Calculate pending claims
            // This would normally be calculated by finding unwithdrawn claims.
            // Simplified for Phase 3: Total Anchored Revenue - Total Withdrawn
            let pendingClaimsTotal = 0n;
            const rows = this.db.prepare(`
                SELECT amount_usdt FROM epoch_claims 
                WHERE epoch_id IN (SELECT epoch_id FROM epoch_anchors WHERE status = 'ANCHORED')
            `).all();

            rows.forEach(r => pendingClaimsTotal += ethers.getBigInt(r.amount_usdt));

            // Subtract total already withdrawn (need to track withdrawals via events or local db). 
            // For now assume pendingClaimsTotal is roughly total claims created ever.
            // Need a real tracking of withdrawn amounts. Let's assume we have a table `claim_withdrawals`
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS claim_withdrawals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    operator_wallet TEXT NOT NULL,
                    amount_usdt TEXT NOT NULL,
                    tx_hash TEXT NOT NULL,
                    withdrawn_at INTEGER NOT NULL
                )
            `).run();

            const withdrawRows = this.db.prepare(`SELECT amount_usdt FROM claim_withdrawals`).all();
            withdrawRows.forEach(r => pendingClaimsTotal -= ethers.getBigInt(r.amount_usdt));

            if (pendingClaimsTotal < 0n) pendingClaimsTotal = 0n;

            // 3. Liquidity Logic
            let liquidityRatio = 1.0;
            let status = 'AVAILABLE';

            if (pendingClaimsTotal > 0n) {
                // Number() conversions might lose precision for massive numbers, but for ratio it's fine
                liquidityRatio = Number(ethers.formatUnits(vaultBalance, 6)) / Number(ethers.formatUnits(pendingClaimsTotal, 6));

                if (vaultBalance === 0n) {
                    status = 'BLOCKED';
                } else if (vaultBalance < pendingClaimsTotal) {
                    status = 'PARTIAL';
                }
            }

            // 4. Save
            this.db.prepare(`
                INSERT INTO treasury_snapshots (total_balance, pending_claims_total, liquidity_ratio, withdraw_status, snapshot_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(vaultBalance.toString(), pendingClaimsTotal.toString(), liquidityRatio, status, Date.now());

            return {
                total_balance: vaultBalance.toString(),
                pending_claims_total: pendingClaimsTotal.toString(),
                liquidity_ratio: liquidityRatio,
                withdraw_status: status
            };
        } catch (error) {
            console.error('[TreasuryMonitor] failed to capture snapshot:', error);
            throw error;
        }
    }

    getLatestSnapshot() {
        return this.db.prepare(`
            SELECT * FROM treasury_snapshots ORDER BY snapshot_at DESC LIMIT 1
        `).get();
    }
}
