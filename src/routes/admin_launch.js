
import express from 'express';
import { LaunchMode } from '../services/launch_mode.js';

/**
 * Admin Launch Mode Routes — mounted at /admin/launch
 */
export function createAdminLaunchRouter(db) {
    const router = express.Router();
    const launchMode = new LaunchMode(db);

    // GET /admin/launch/mode
    router.get('/mode', async (req, res) => {
        try {
            const status = await launchMode.getStatus();
            res.json({ ok: true, ...status });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/launch/mode/toggle
    router.post('/mode/toggle', async (req, res) => {
        try {
            const current = await launchMode.isEnabled();
            const result = current ? await launchMode.disable() : await launchMode.enable();
            res.json(result);
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
