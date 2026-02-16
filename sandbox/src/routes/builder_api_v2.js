import { Router } from 'express';
import crypto from 'crypto';

export function createBuilderApiV2Router(opsEngine) {
    const router = Router();

    // GET /builder-api/usage - Usage summary
    router.get('/usage', async (req, res) => {
        try {
            const wallet = req.user.wallet;

            // Usage stats
            const usage = await opsEngine.db.query(`
                SELECT op_type, COUNT(*) as count, SUM(amount_usdt) as total_usdt
                FROM revenue_events_v2
                WHERE client_id = ?
                GROUP BY op_type
            `, [wallet]);

            const totalUsage = usage.reduce((acc, curr) => ({
                count: acc.count + curr.count,
                total_usdt: acc.total_usdt + curr.total_usdt
            }), { count: 0, total_usdt: 0 });

            res.json({
                ok: true,
                summary: totalUsage,
                details: usage
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /builder-api/usage - Execute Op (Simulate Usage)
    router.post('/usage', async (req, res) => {
        try {
            const { op_type, count } = req.body;
            const wallet = req.user.wallet;

            if (!op_type || typeof op_type !== 'string') return res.status(400).json({ error: "op_type required (string)" });

            // Security Hardening: Cap max ops per request to prevent Loop DoS
            let n = parseInt(count) || 1;
            if (n < 1) n = 1;
            if (n > 100) return res.status(400).json({ error: "Max 100 ops per request" });

            const results = [];

            for (let i = 0; i < n; i++) {
                const result = await opsEngine.executeOp({
                    op_type: op_type,
                    client_id: wallet,
                    node_id: 'sim_node_1',
                    request_id: `req_${Date.now()}_${i}`,
                    payload_hash: 'dummy_hash'
                });
                results.push(result);
            }

            res.json({ ok: true, processed: results.length });
        } catch (e) {
            console.error("Builder Usage Error:", e);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /builder-api/keys - List API keys
    router.get('/keys', async (req, res) => {
        try {
            const wallet = req.user.wallet;
            // Note: In a real app, keys would be linked to a project, which is linked to a builder
            // For MVP, we'll just list keys for this builder if projects exist, or mock for now
            const keys = [
                { id: 1, name: 'Main API Key', prefix: 'sl_live_...', status: 'active', created_at: Date.now() - 86400000 * 2 },
                { id: 2, name: 'Test Key', prefix: 'sl_test_...', status: 'revoked', created_at: Date.now() - 86400000 * 10 }
            ];
            res.json({ ok: true, keys });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/keys', async (req, res) => {
        const { name } = req.body;
        const key = 'sl_live_' + crypto.randomBytes(24).toString('hex');
        res.json({ ok: true, key, name, prefix: key.substring(0, 10) + '...' });
    });

    // GET /builder-api/requests - Recent activity
    router.get('/requests', async (req, res) => {
        try {
            const wallet = req.user.wallet;
            const limit = parseInt(req.query.limit) || 50;

            const requests = await opsEngine.db.query(`
                SELECT * FROM revenue_events_v2 
                WHERE client_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            `, [wallet, limit]);

            res.json({ ok: true, requests });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
