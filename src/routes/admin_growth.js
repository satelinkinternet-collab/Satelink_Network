
import express from 'express';
import { verifyJWT, getPermissionsForRole } from './auth_v2.js';

export function createAdminGrowthRouter(db, retentionService) {
    const router = express.Router();

    // Middleware: Require Admin
    const requireAdmin = (req, res, next) => {
        if (!req.user || !['admin_super', 'admin_ops'].includes(req.user.role)) {
            return res.status(403).json({ ok: false, error: 'Admin access required' });
        }
        next();
    };

    // GET /admin/growth/ux/summary
    // Metrics on UX mode adoption and onboarding
    router.get('/ux/summary', verifyJWT, requireAdmin, async (req, res) => {
        try {
            // 1. UI Mode Distribution
            const modeStats = await db.query(`
                SELECT ui_mode, COUNT(*) as count 
                FROM user_settings 
                GROUP BY ui_mode
            `);

            const totalUsersWithSettings = modeStats.reduce((acc, row) => acc + row.count, 0);

            // 2. Onboarding Completion
            // Approximated by checking if 'backup' completion is in the json
            // SQLite specific check for pattern match if no JSON functions available
            const completedOnboarding = await db.get(`
                SELECT COUNT(*) as count 
                FROM onboarding_state 
                WHERE step_completed_json LIKE '%"backup":true%'
            `);

            // 3. Support Ticket Categories (Phase J7)
            const ticketStats = await db.query(`
                SELECT category, COUNT(*) as count 
                FROM support_tickets 
                GROUP BY category
            `);

            res.json({
                ok: true,
                ux_adoption: {
                    total_users_with_settings: totalUsersWithSettings,
                    modes: modeStats,
                    pct_simple: totalUsersWithSettings > 0
                        ? (modeStats.find(m => m.ui_mode === 'SIMPLE')?.count || 0) / totalUsersWithSettings * 100
                        : 0
                },
                onboarding: {
                    completed_count: completedOnboarding.count
                },
                support_volume: ticketStats
            });

        } catch (e) {
            console.error('[ADMIN] UX Summary failed:', e);
            res.status(500).json({ ok: false, error: 'Internal server error' });
        }
    });

    // M2: Retention Access
    if (retentionService) {
        router.get('/retention', async (req, res) => {
            try {
                const type = req.query.type || 'user';
                const data = await retentionService.getRetentionMatrix(type);
                res.json({ ok: true, type, data });
            } catch (e) { res.status(500).json({ error: e.message }); }
        });
    }

    return router;
}
