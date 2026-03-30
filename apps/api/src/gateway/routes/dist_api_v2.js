import { Router } from 'express';
import { requireJWT, requireRole } from '../../security/auth_middleware.js';

export function createDistApiRouter(opsEngine) {
    const router = Router();

    // S0-008: Enforce JWT + distributor role on all routes
    router.use(requireJWT);
    router.use(requireRole(['distributor_lco', 'distributor_influencer', 'distributor']));

    // GET /dist-api/stats
    router.get('/stats', async (req, res) => {
        try {
            const wallet = req.user.wallet;
            const refCode = wallet.slice(0, 8); // Simple MVP logic

            // Conversions from DB
            const conversionsCount = (await opsEngine.db.get("SELECT COUNT(*) as c FROM conversions WHERE ref_code = ?", [refCode]))?.c || 0;
            // For MVP, referrals count is same as conversions (since we only track on login/conversion)
            const referralsCount = conversionsCount;

            // Earnings from pool
            const earnings = await opsEngine.db.query("SELECT * FROM epoch_earnings WHERE role = 'distribution_pool' ORDER BY epoch_id DESC LIMIT 10");

            // Simplify for this specific distributor (mocked share based on conversions)
            const myShare = conversionsCount > 0 ? 0.05 * conversionsCount : 0.01;
            const claimable = earnings.filter(e => e.status === 'UNPAID').reduce((sum, e) => sum + (e.amount_usdt * myShare), 0);

            res.json({
                ok: true,
                stats: {
                    referralCount: referralsCount,
                    conversions: conversionsCount,
                    totalEarned: (conversionsCount * 5.00).toFixed(2), // Mock $5 per conversion
                    claimable: claimable.toFixed(2),
                    referralLink: `https://satelink.network/ref/${refCode}`
                },
                earnings: earnings.slice(0, 5)
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /dist-api/referrals
    router.get('/referrals', async (req, res) => {
        try {
            const wallet = req.user.wallet;
            const refCode = wallet.slice(0, 8);
            // reusing conversions table as referrals source
            // Map table columns to frontend expectation
            const rows = await opsEngine.db.query("SELECT * FROM conversions WHERE ref_code = ? ORDER BY created_at DESC LIMIT 50", [refCode]);

            const referrals = rows.map(r => ({
                id: r.id,
                referee_wallet: r.wallet,
                status: 'activated',
                created_at: r.created_at
            }));

            res.json({ ok: true, referrals });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /dist-api/conversions
    router.get('/conversions', async (req, res) => {
        try {
            const wallet = req.user.wallet;
            const refCode = wallet.slice(0, 8);
            const rows = await opsEngine.db.query("SELECT * FROM conversions WHERE ref_code = ? ORDER BY created_at DESC LIMIT 50", [refCode]);

            const conversions = rows.map(r => ({
                id: r.id,
                referee_wallet: r.wallet,
                role: r.role,
                created_at: r.created_at
            }));

            res.json({ ok: true, conversions });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /dist-api/claim
    router.post('/claim', async (req, res) => {
        res.json({ ok: true, msg: "Claim request submitted for audit." });
    });

    // GET /dist-api/history - Earnings History for Charts
    router.get('/history', async (req, res) => {
        try {
            const wallet = req.user.wallet;
            const refCode = wallet.slice(0, 8);

            // 1. Get total conversions for share calc
            const conversionsCount = (await opsEngine.db.get("SELECT COUNT(*) as c FROM conversions WHERE ref_code = ?", [refCode]))?.c || 0;
            const myShare = conversionsCount > 0 ? 0.05 * conversionsCount : 0.01;

            // 2. Get past epoch earnings for the pool
            // In a real app, we'd have a 'distributor_earnings' table per user. 
            // For MVP, we derive it from the Pool's history.
            const entries = await opsEngine.db.query(`
                SELECT epoch_id, amount_usdt, created_at 
                FROM epoch_earnings 
                WHERE role IN ('distributor_lco', 'distributor_influencer', 'distribution_pool')
                ORDER BY epoch_id ASC
                LIMIT 30
            `);

            const history = entries.map(e => ({
                epoch: e.epoch_id,
                date: new Date(e.created_at * 1000).toLocaleDateString(),
                amount: (e.amount_usdt * myShare).toFixed(4),
                pool_total: e.amount_usdt
            }));

            res.json({ ok: true, history });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /dist-api/fleet - Node Fleet Status (LCO View)
    router.get('/fleet', async (req, res) => {
        try {
            const wallet = req.user.wallet;
            const refCode = wallet.slice(0, 8);

            // Join conversions with registered_nodes (single source of truth)
            const fleet = await opsEngine.db.query(`
                SELECT
                    c.wallet as node_wallet,
                    n.wallet as node_id,
                    n.active,
                    n.last_heartbeat,
                    n.node_type
                FROM conversions c
                LEFT JOIN registered_nodes n ON c.wallet = n.wallet
                WHERE c.ref_code = ?
                ORDER BY n.last_heartbeat DESC NULLS LAST
            `, [refCode]);

            // Enrich with "health" status
            const now = Date.now() / 1000;
            const enriched = fleet.map(f => {
                const isOnline = f.active === 1 || (f.last_heartbeat && (now - f.last_heartbeat < 300));
                return {
                    id: f.node_id || 'pending_setup',
                    wallet: f.node_wallet,
                    status: isOnline ? 'online' : 'offline',
                    last_seen: f.last_heartbeat,
                    type: f.node_type || 'unknown'
                };
            });

            res.json({ ok: true, fleet: enriched });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
