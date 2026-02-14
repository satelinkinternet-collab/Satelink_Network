import express, { Router } from 'express';

export function createAdminAutonomousRouter(db, autoOpsEngine) {
    const router = Router();
    router.use(express.json());

    // 1. Get Config & Status
    router.get('/config', async (req, res) => {
        try {
            const configKeys = [
                'autonomous_ops_enabled',
                'auto_reward_enabled',
                'auto_surge_enabled',
                'auto_node_bonus_enabled',
                'burn_threshold_pct',
                'min_reward_multiplier',
                'reward_adjustment_step_pct'
            ];

            const config = {};
            for (const key of configKeys) {
                config[key] = await autoOpsEngine._getConfig(key);
            }
            res.json({ ok: true, config });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // 2. Update Config
    router.post('/config', async (req, res) => {
        try {
            if (!req.user || req.user.role !== 'admin_super') {
                return res.status(403).json({ error: "Only super admin can toggle autonomy" });
            }

            const { updates } = req.body; // { key: value, ... }
            if (!updates) return res.status(400).json({ error: "Missing updates" });

            for (const [key, val] of Object.entries(updates)) {
                // Determine if string or boolean input, store as string
                await db.query(`
                    INSERT INTO system_config (key, value) VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value
                `, [key, String(val)]);
            }

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // 3. Get Recommendations
    router.get('/recommendations', async (req, res) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const status = req.query.status || 'pending';

            const recs = await db.query(`
                SELECT * FROM ops_recommendations 
                WHERE status = ? 
                ORDER BY created_at DESC LIMIT ?
            `, [status, limit]);

            // Parse JSON
            const parsed = recs.map(r => ({ ...r, recommendation_json: JSON.parse(r.recommendation_json) }));
            res.json({ ok: true, data: parsed });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // 4. Action Recommendation (Accept/Reject)
    router.post('/recommendations/:id/action', async (req, res) => {
        try {
            if (!req.user || !['admin_super', 'admin_ops'].includes(req.user.role)) {
                return res.status(403).json({ error: "Access denied" });
            }

            const { action } = req.body; // 'accept', 'reject'
            if (!['accept', 'reject'].includes(action)) return res.status(400).json({ error: "Invalid action" });

            const rec = await db.get("SELECT * FROM ops_recommendations WHERE id = ?", [req.params.id]);
            if (!rec) return res.status(404).json({ error: "Recommendation not found" });

            if (rec.status !== 'pending') return res.status(400).json({ error: `Recommendation is already ${rec.status}` });

            await db.query("UPDATE ops_recommendations SET status = ?, updated_at = ? WHERE id = ?", [
                action === 'accept' ? 'accepted' : 'rejected',
                Date.now(),
                req.params.id
            ]);

            // Execute logic if accepted?
            if (action === 'accept') {
                const data = JSON.parse(rec.recommendation_json);
                // Call engine to execute? Or handle here?
                // Ideally engine has execute method. For now, we trust the status update is the "action"
                // In real system, we'd trigger the actual change.
                // autoOpsEngine._handleAction(rec.type, rec.entity_id, data, true); // We need to expose this or make valid public method
                // Let's assume for MVP marking 'accepted' is enough record, or we call the private method (JS allows it, dirty but works for MVP or we rename)
                // Renaming _handleAction to executeAction public
                await autoOpsEngine.executeAction(rec.type, rec.entity_id, data);
            }

            res.json({ ok: true, status: action === 'accept' ? 'accepted' : 'rejected' });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // 5. Trigger Analysis (Manual Run)
    router.post('/trigger', async (req, res) => {
        try {
            await autoOpsEngine.runDailyJob();
            res.json({ ok: true, message: "Engine run triggered" });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
