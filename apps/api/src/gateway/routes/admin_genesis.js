/**
 * Genesis Workload Engine — Admin HTTP Routes
 *
 * GET  /admin/genesis/stats    → { workloads_generated, workloads_enqueued, source_distribution, ... }
 * GET  /admin/genesis/sources  → per-source { source, generated }
 * POST /admin/genesis/pause    → pause engine loop
 * POST /admin/genesis/resume   → resume engine loop
 */

import { Router } from 'express';

/**
 * @param {import('../../genesis/genesis_workload_engine.js').GenesisWorkloadEngine} engine
 * @returns {Router}
 */
export function createGenesisAdminRouter(engine) {
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
