/**
 * Demand Flywheel Engine — Admin HTTP Routes
 *
 * GET  /admin/flywheel/stats    → full engine statistics
 * GET  /admin/flywheel/recent   → last N generated job summaries
 * POST /admin/flywheel/pause    → pause the flywheel
 * POST /admin/flywheel/resume   → resume the flywheel
 *
 * Follows the same pattern as admin_genesis.js.
 */

import { Router } from 'express';

/**
 * @param {import('../../demand/demand_flywheel_engine.js').DemandFlywheelEngine} engine
 * @returns {Router}
 */
export function createFlywheelAdminRouter(engine) {
    const router = Router();

    /**
     * GET /admin/flywheel/stats
     * Returns aggregate stats: jobs_generated, jobs_enqueued, top_workload_types,
     * client_prediction_hits, rate_bucket, paused state, etc.
     */
    router.get('/stats', (req, res) => {
        try {
            res.status(200).json({ ok: true, ...engine.getStats() });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    /**
     * GET /admin/flywheel/recent
     * Returns the last N generated job summaries (ring buffer, newest first).
     */
    router.get('/recent', (req, res) => {
        try {
            const jobs = engine.getRecentJobs();
            res.status(200).json({ ok: true, count: jobs.length, jobs });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    /**
     * POST /admin/flywheel/pause
     * Pauses the flywheel from processing new completion events.
     */
    router.post('/pause', (req, res) => {
        try {
            engine.pause();
            res.status(200).json({ ok: true, paused: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    /**
     * POST /admin/flywheel/resume
     * Resumes flywheel processing after a pause.
     */
    router.post('/resume', (req, res) => {
        try {
            engine.resume();
            res.status(200).json({ ok: true, paused: false });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
