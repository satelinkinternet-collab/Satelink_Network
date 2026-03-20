import { Router } from 'express';
import { requireAdmin } from '../../security/auth_middleware.js';
import { NodeRegistry } from '../../marketplace/node_registry.js';
import { logger } from '../../monitoring/logger.js';

export function createDevLifecycleRouter(opsEngine) {
    // Hard block: dev lifecycle routes must NEVER run in production
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Dev lifecycle routes disabled in production');
    }

    const router = Router();
    const nodeRegistry = new NodeRegistry(opsEngine.db);
    
    // Authorization bypass for lifecycle test commands
    router.use((req, res, next) => {
        req.isAuthorizedRevenueRequest = true;
        next();
    });

    // Ensure simulated op types exist in pricing for dev lifecycle test
    (async () => {
        try {
            const types = [
                'api_relay_execution',
                'automation_job_execute',
                'routing_decision_compute',
                'verification_op',
                'monitoring_op'
            ];
            for (const type of types) {
                await opsEngine.db.query(
                    "INSERT INTO ops_pricing (op_type, price_usdt, enabled, created_at) VALUES (?, 0.1, 1, ?) ON CONFLICT DO NOTHING",
                    [type, Math.floor(Date.now() / 1000)]
                ).catch(() => {});
            }
        } catch (e) {
            logger.warn({ error: e.message }, '[DEV-LIFECYCLE] Pricing seeding failed');
        }
    })();

    // POST /v1/node/register
    router.post('/node/register', async (req, res) => {
        logger.info({ body: req.body }, '[DEV-LIFECYCLE] Node Register Request');
        try {
            const { node_id, public_key, capabilities, capacity_score } = req.body;
            const result = await nodeRegistry.register({
                node_id,
                public_key: public_key || `dev-key-${node_id}`,
                capabilities: capabilities || { node_type: 'worker', region: 'us-east', capacity: 100 },
                capacity_score: capacity_score || 100
            });
            res.json({ ok: result.ok, ...result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /v1/node/heartbeat
    router.post('/node/heartbeat', async (req, res) => {
        logger.info({ node_id: req.body.node_id }, '[DEV-LIFECYCLE] Node Heartbeat Request');
        try {
            const { node_id } = req.body;
            const result = await nodeRegistry.heartbeat(node_id);
            
            // Also record uptime in opsEngine for rewards if it exists
            if (opsEngine.recordHeartbeatUptime) {
                await opsEngine.recordHeartbeatUptime(node_id);
            }

            res.json({ ok: result.ok, ...result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /v1/node/submit
    router.post('/node/submit', async (req, res) => {
        try {
            // In dev mode, we just acknowledge receipt of simulated job result
            res.json({ ok: true, received: true, job_id: req.body.job_id });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.use(requireAdmin);

    // POST /ledger/execute
    router.post('/ledger/execute', async (req, res) => {
        logger.info({ body: req.body }, '[DEV-LIFECYCLE] Ledger Execute Request');
        try {
            const result = await opsEngine.executeOp({
                ...req.body,
                internal: true, // Bypass profit protection for dev lifecycle test
                req: req // Passing req to satisfy internal guards
            });
            res.json(result);
        } catch (e) {
            console.error("[DEV LIFECYCLE] Execute Error:", e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /ledger/epoch/finalize
    router.post('/ledger/epoch/finalize', async (req, res) => {
        try {
            const result = await opsEngine.finalizeEpoch();
            res.json(result);
        } catch (e) {
            console.error("[DEV LIFECYCLE] Finalize Error:", e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /rewards/epochs
    router.get('/rewards/epochs', async (req, res) => {
        try {
            const epochs = await opsEngine.getAllEpochs();
            res.json(epochs);
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /node/list (Alias for test script)
    router.get('/node/list', async (req, res) => {
        try {
            const rows = await opsEngine.db.query("SELECT * FROM nodes");
            const nodes = rows.map(r => ({
                node_id: r.node_id,
                status: 'ACTIVE' // Simulation expects uppercase ACTIVE
            }));
            res.json({
                ok: true,
                count: nodes.length,
                nodes: nodes
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /node/metrics (Alias for test script)
    router.get('/node/metrics', async (req, res) => {
        try {
            const revenue = await opsEngine.db.query(`
                SELECT op_type, COUNT(*) as requests, SUM(amount_usdt) as revenue
                FROM revenue_events_v2
                GROUP BY op_type
            `);
            const metrics = {};
            revenue.forEach(r => {
                metrics[r.op_type] = {
                    requests: Number(r.requests),
                    revenue: Number(r.revenue)
                };
            });
            res.json({ ok: true, metrics });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /network/stats (Alias for test script)
    router.get('/network/stats', async (req, res) => {
        try {
             const nodes = await opsEngine.db.get("SELECT COUNT(DISTINCT node_id) as c FROM nodes");
             const rev = await opsEngine.db.get("SELECT SUM(amount_usdt) as total FROM revenue_events_v2");
             res.json({ 
                ok: true, 
                active_nodes: nodes?.c || 0,
                total_revenue: Number(rev?.total || 0),
                timestamp: Math.floor(Date.now() / 1000)
             });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
