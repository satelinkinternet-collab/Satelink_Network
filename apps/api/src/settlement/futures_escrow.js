export class FuturesEscrow {
    constructor(db) {
        this.db = db;
    }

    /**
     * Locks funds from an investor wallet dynamically allocating them to an open contract.
     * @param {string} investorWallet
     * @param {string} contractId
     * @param {number} price
     */
    async purchaseContract(investorWallet, contractId, price) {
        // Enforce the current contract status is actually listed
        const contract = await this.db.prepare(`SELECT status, price FROM node_futures_contracts WHERE contract_id = ?`).get(contractId);

        if (!contract) throw new Error("Contract not found");
        if (contract.status !== 'listed') throw new Error("Contract is not available for purchase");
        if (contract.price !== price) throw new Error("Price mismatch");

        // Simulate abstract ledger transfer / lock
        console.log(`[FuturesEscrow] Locked ${price} USDT from Investor ${investorWallet} for Contract ${contractId}`);

        try {
            await this.db.prepare(`
                UPDATE node_futures_contracts
                SET status = 'sold', buyer_wallet = ?
                WHERE contract_id = ?
            `).run(investorWallet, contractId);

            // Increment Metrics
            await this.db.prepare(`
                UPDATE futures_metrics
                SET contracts_sold = contracts_sold + 1, future_revenue_locked = future_revenue_locked + ?
                WHERE id = 1
            `).run(price);

            // Advance the payout straight to the Node Operator
            // In reality, this might be heavily staggered based on the Epoch timeline
            // But for MVPs, forward contracts often pay the principal immediately.
            // C-01: Write to revenue_events_v2 with epoch_id
            const contractDetails = await this.db.prepare(`SELECT node_id FROM node_futures_contracts WHERE contract_id = ?`).get(contractId);
            let epochId = null;
            try {
                const epochRow = await this.db.prepare("SELECT id FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get([]);
                epochId = epochRow?.id || null;
            } catch (e) { /* fallback */ }

            await this.db.prepare(`
                INSERT INTO revenue_events_v2 (epoch_id, op_type, node_id, client_id, amount_usdt, status, request_id, created_at)
                VALUES (?, 'futures_sale', ?, ?, ?, 'success', ?, ?)
            `).run([epochId, contractDetails?.node_id, investorWallet, price, `futures_${contractId}_sale`, Date.now()]);

            return true;
        } catch (e) {
            console.error("[FuturesEscrow] Error during purchase settlement:", e.message);
            throw e;
        }
    }

    /**
     * Scans for active 'sold' contracts against a particular epoch and node,
     * deducting the agreed revenue share to pay back the investor.
     * @param {number} epochId
     * @param {string} nodeId
     * @param {number} originalPayoutAmount
     * @returns {number} The remaining amount the Node Operator keeps
     */
    async settleEpochObligations(epochId, nodeId, originalPayoutAmount) {
        // Find any active contracts covering this epoch for this node
        const activeContracts = await this.db.prepare(`
            SELECT contract_id, revenue_share, buyer_wallet
            FROM node_futures_contracts
            WHERE node_id = ? AND status = 'sold' AND epoch_start <= ? AND epoch_end >= ?
        `).all(nodeId, epochId, epochId);

        let totalDeducted = 0;

        for (const contract of activeContracts) {
            // Calculate investor split
            const investorCut = originalPayoutAmount * contract.revenue_share;
            totalDeducted += investorCut;

            console.log(`[FuturesEscrow] Epoch ${epochId}: Diverting ${investorCut} USDT from ${nodeId} to Investor ${contract.buyer_wallet} (Contract: ${contract.contract_id})`);

            // C-01: Record investor yield in revenue_events_v2 with proper epoch_id
            await this.db.prepare(`
                INSERT INTO revenue_events_v2 (epoch_id, op_type, node_id, client_id, amount_usdt, status, request_id, created_at)
                VALUES (?, 'futures_yield', ?, ?, ?, 'success', ?, ?)
            `).run([epochId, nodeId, contract.buyer_wallet, investorCut, `futures_${contract.contract_id}_yield_${epochId}`, Date.now()]);

            // Update stats
            await this.db.prepare(`
                UPDATE futures_metrics
                SET investors_paid_out = investors_paid_out + ?
            `).run(investorCut);

            // Check if this was the last epoch. If so, settle it.
            const isLastEpoch = await this.db.prepare(`
                SELECT 1 FROM node_futures_contracts
                WHERE contract_id = ? AND epoch_end = ?
            `).get(contract.contract_id, epochId);

            if (isLastEpoch) {
                await this.db.prepare(`UPDATE node_futures_contracts SET status = 'settled' WHERE contract_id = ?`).run(contract.contract_id);
            }
        }

        // Return the remaining node pool
        return originalPayoutAmount - totalDeducted;
    }
}
