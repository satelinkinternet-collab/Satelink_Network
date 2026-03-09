/**
 * Admin Workload Acquisition Routes
 *
 * Endpoints:
 *   GET  /admin/workloads/stats    → engine stats (cycles, accepted, rejected, buffer depth)
 *   GET  /admin/workloads/sources  → per-connector stats
 *   POST /admin/workloads/pause    → pause engine loop
 *   POST /admin/workloads/resume   → resume engine loop
 */

import { Router } from 'express';

/**
 * @param {import('../../workload_acquisition_engine.js').WorkloadAcquisitionEngine} engine
 * @returns {Router}
 */
export function createWorkloadAdminRouter(engine) {
    const router = Router();

    router.get('/stats', (req, res) => {
        res.status(200).json({ ok: true, ...engine.getStats() });
    });

    router.get('/sources', (req, res) => {
        res.status(200).json({ ok: true, sources: engine.getSources() });
    });

    router.post('/pause', (req, res) => {
        engine.pause();
        res.status(200).json({ ok: true, paused: true });
    });

    router.post('/resume', (req, res) => {
        engine.resume();
        res.status(200).json({ ok: true, paused: false });
    });

    return router;
}
