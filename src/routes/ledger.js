import express from "express";

export const createLedgerRouter = (opsEngine, adminAuth) => {
    const router = express.Router();


    // Finalize Epoch (Admin)
    router.post("/epoch/finalize", adminAuth, (req, res) => {
        try {
            const { epochId } = req.body;
            if (!epochId) return res.status(400).json({ error: "Missing epochId" });
            const result = opsEngine.finalizeEpoch(epochId);
            return res.json({ ok: true, ...result });
        } catch (e) {
            return res.status(500).json({ ok: false, error: String(e.message) });
        }
    });

    // Ledger Export (Read-Only)
    router.get("/epochs/:id", (req, res) => {
        try {
            const ledger = opsEngine.getLedger(req.params.id);
            return res.json({ ok: true, ledger });
        } catch (e) {
            return res.status(500).json({ ok: false, error: String(e.message) });
        }
    });

    router.get("/payouts", adminAuth, (req, res) => {
        try {
            const { status } = req.query;
            const payouts = opsEngine.getPayoutQueue(status || 'PENDING');
            return res.json({ ok: true, payouts });
        } catch (e) {
            return res.status(500).json({ ok: false, error: String(e.message) });
        }
    });

    // Claim Payout (Accounting)
    router.post("/claim", (req, res) => {
        try {
            const { nodeWallet, payoutId } = req.body;
            if (!nodeWallet || !payoutId) return res.status(400).json({ error: "Missing fields" });
            const result = opsEngine.claimPayout(nodeWallet, payoutId);
            return res.json({ ok: true, ...result });
        } catch (e) {
            return res.status(500).json({ ok: false, error: String(e.message) });
        }
    });

    // Withdraw Funds (Moves USDT)
    router.post("/withdraw", (req, res) => {
        try {
            const { nodeWallet, amount } = req.body;
            if (!nodeWallet || !amount) return res.status(400).json({ error: "Missing fields" });
            const result = opsEngine.withdrawFunds(nodeWallet, Number(amount));
            return res.json({ ok: true, ...result });
        } catch (e) {
            return res.status(500).json({ ok: false, error: String(e.message) });
        }
    });

    // Treasury Status
    router.get("/treasury", (req, res) => {
        try {
            const available = opsEngine.getTreasuryAvailable();
            return res.json({ ok: true, available });
        } catch (e) {
            return res.status(500).json({ ok: false, error: String(e.message) });
        }
    });

    // Treasury Monitor Status (Day-1 Financial Guard)
    router.get("/treasury/monitor", (req, res) => {
        try {
            const status = opsEngine.monitorTreasuryBalance();
            return res.json({ ok: true, ...status });
        } catch (e) {
            return res.status(500).json({ ok: false, error: String(e.message) });
        }
    });

    // Claims Monitor Status (Day-1 Enforcement)
    router.get("/claims/monitor", (req, res) => {
        try {
            const forfeited = opsEngine.forfeitExpired();
            return res.json({ ok: true, status: 'OK', processed: forfeited });
        } catch (e) {
            return res.status(500).json({ ok: false, error: String(e.message) });
        }
    });

    // All Epochs Summary
    router.get("/epochs", (req, res) => {
        try {
            const epochs = opsEngine.getAllEpochs();
            return res.json({ ok: true, epochs });
        } catch (e) {
            return res.status(500).json({ ok: false, error: String(e.message) });
        }
    });

    // Comprehensive Export (Audit Ready)
    router.get("/export", adminAuth, (req, res) => {
        try {
            const { epochId } = req.query;
            const ledger = opsEngine.getLedger(epochId);
            const payouts = opsEngine.getPayoutQueue();

            // Format as audit report
            const report = {
                timestamp: Math.floor(Date.now() / 1000),
                epochId: epochId || "latest",
                ledger_count: ledger.length,
                payout_pending_count: payouts.length,
                data: ledger.map(l => ({
                    wallet: l.node_wallet,
                    amount: l.amount,
                    type: l.split_type,
                    finalized: l.finalized_at
                }))
            };

            return res.json({ ok: true, report });
        } catch (e) {
            return res.status(500).json({ ok: false, error: String(e.message) });
        }
    });

    return router;
};
