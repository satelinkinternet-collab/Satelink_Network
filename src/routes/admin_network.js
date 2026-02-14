
import express from 'express';
// Auth handled by verifyJWT at server.js mount level

export function createAdminNetworkRouter(db, logger) {
    const router = express.Router();

    // GET /admin/network/fleet/summary
    router.get('/fleet/summary', async (req, res) => {
        try {
            const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
            const oneHourAgo = Date.now() - 60 * 60 * 1000;
            const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

            const active5m = await db.get("SELECT COUNT(DISTINCT node_id) as c FROM node_heartbeats WHERE timestamp > ?", [fiveMinsAgo]);
            const active1h = await db.get("SELECT COUNT(DISTINCT node_id) as c FROM node_heartbeats WHERE timestamp > ?", [oneHourAgo]);
            const active24h = await db.get("SELECT COUNT(DISTINCT node_id) as c FROM node_heartbeats WHERE timestamp > ?", [twentyFourHoursAgo]);

            const versions = await db.query(`
                SELECT details_json, COUNT(*) as c 
                FROM node_heartbeats 
                WHERE timestamp > ? 
                GROUP BY details_json 
            `, [fiveMinsAgo]);

            res.json({
                ok: true,
                active_5m: active5m.c,
                active_1h: active1h.c,
                active_24h: active24h.c,
                churn_24h: 0,
                heartbeat_health: 'healthy'
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/network/fleet/flaky
    router.get('/fleet/flaky', async (req, res) => {
        try {
            const tenMinsAgo = Date.now() - 10 * 60 * 1000;
            const nodes = await db.query(`
                SELECT node_id, COUNT(*) as hb_count, MAX(timestamp) as last_seen
                FROM node_heartbeats
                WHERE timestamp > ?
                GROUP BY node_id
                HAVING hb_count < 5
                ORDER BY hb_count ASC
                LIMIT 50
            `, [tenMinsAgo]);

            res.json({ ok: true, data: nodes });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/network/quarantine
    router.post('/quarantine', async (req, res) => {
        const { node_id, duration_m } = req.body;
        if (req.user.role !== 'admin_ops' && req.user.role !== 'admin_super') {
            return res.status(403).json({ ok: false, error: "Ops/Super required" });
        }

        try {
            // Mock implementation for MVP
            res.json({ ok: true, message: `Node ${node_id} quarantined (Mock)` });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/network/reports/weekly
    router.get('/reports/weekly', async (req, res) => {
        try {
            const { ReportService } = await import('../services/report_service.js');
            const reportService = new ReportService(db);
            const reports = await reportService.getLatestReports();
            res.json({ ok: true, data: reports });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/network/reports/generate
    router.post('/reports/generate', async (req, res) => {
        try {
            const { ReportService } = await import('../services/report_service.js');
            const reportService = new ReportService(db);
            const report = await reportService.generateWeeklyReport();
            res.json({ ok: true, data: report });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
