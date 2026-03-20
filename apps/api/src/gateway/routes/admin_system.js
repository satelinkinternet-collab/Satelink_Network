
import express from 'express';
import { verifyJWT } from './auth_v2.js';

export function createAdminSystemRouter(opsEngine, runtimeMonitor, backupService, stressTester) {
    // Ensure stress table exists lazily if not init elsewhere
    if (stressTester) stressTester.init().catch(e => console.error("Stress init failed", e));
    const router = express.Router();

    // Middleware: Admin Only
    const requireAdmin = (req, res, next) => {
        if (!req.user || !['admin_super', 'admin_ops'].includes(req.user.role)) {
            return res.status(403).json({ ok: false, error: 'Admin access required' });
        }
        next();
    };

    router.use(verifyJWT, requireAdmin);

    // K1: DB Health
    router.get('/database', async (req, res) => {
        try {
            const db = opsEngine.db;
            const sizeRes = await db.prepare("SELECT pg_database_size(current_database()) as size_bytes").all();
            const dbSize = sizeRes[0]?.size_bytes || 0;

            res.json({
                ok: true,
                stats: {
                    db_type: 'postgres',
                    db_size_bytes: dbSize,
                    pool: {
                        total: db.pool.totalCount,
                        idle: db.pool.idleCount,
                        waiting: db.pool.waitingCount
                    }
                }
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // K2: Runtime Metrics
    router.get('/runtime', async (req, res) => {
        try {
            const history = await opsEngine.db.prepare(
                `SELECT * FROM runtime_metrics ORDER BY created_at DESC LIMIT 60`
            ).all();

            res.json({
                ok: true,
                current: {
                    heap_mb: process.memoryUsage().heapUsed / 1024 / 1024,
                    uptime: process.uptime()
                },
                history
            });

        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // K4: Retention Stats
    router.get('/retention', async (req, res) => {
        try {
            // Count rows in major tables
            const [traces, errors, slow, audits] = await Promise.all([
                opsEngine.db.prepare("SELECT COUNT(*) as c FROM request_traces").get(),
                opsEngine.db.prepare("SELECT COUNT(*) as c FROM error_events").get(),
                opsEngine.db.prepare("SELECT COUNT(*) as c FROM slow_queries").get(),
                opsEngine.db.prepare("SELECT COUNT(*) as c FROM admin_audit_log").get(),
            ]);

            res.json({
                ok: true,
                counts: {
                    request_traces: traces.c,
                    error_events: errors.c,
                    slow_queries: slow.c,
                    admin_audit_log: audits.c
                },
                policy: {
                    traces_days: 7,
                    errors_days: 30,
                    audit_days: 90
                }
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // 5. Stress Testing (Phase K7)
    // POST /stress/run { type, duration, concurrency }
    router.post('/stress/run', async (req, res) => {
        if (!stressTester) return res.status(501).json({ error: "StressTester disabled" });
        try {
            const { type = 'read_heavy', duration = 5, concurrency = 2 } = req.body;
            // Async run? Or await? For short tests await is fine. 
            // For long tests, we might want background.
            // Requirement says "Mode". Let's await for V1 as user wants to see result.
            // Limit duration to 30s to prevent timeout
            const dur = Math.min(duration, 30);

            const result = await stressTester.run(type, dur, concurrency);
            res.json(result);
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    });

    router.get('/stress/history', async (req, res) => {
        if (!stressTester) return res.json([]);
        try {
            const history = await stressTester.getHistory();
            res.json(history);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    return router;
}
