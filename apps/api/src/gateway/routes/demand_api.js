/**
 * Demand Layer HTTP Route (Module 7 — Ops API Integration)
 *
 * Exposes the Workload Acquisition Engine to HTTP clients.
 * Mounted at: /v1/demand
 *
 * Endpoints:
 *   POST /v1/demand/submit       — raw workload submission (any source type)
 *   GET  /v1/demand/metrics      — demand metrics snapshot
 *   POST /v1/demand/flush        — manually flush buffer into pipeline (admin)
 *   GET  /v1/demand/status       — buffer depth + engine health
 *
 * Also provides the factory for wiring the acquisition engine into
 * the existing POST /v1/ops endpoint so both pipelines share the same
 * normalisation + buffering + metrics layer.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { WorkloadAcquisitionEngine } from '../../scheduler/workload_acquisition_engine.js';
import { DemandRouter } from '../../queue/demand_router.js';
import { DemandMetrics } from '../../monitoring/demand_metrics.js';

/**
 * Build and return the demand Express router.
 * Also returns the acquisition engine so the OpsAPI can call submitNormalised().
 *
 * @param {Object} db
 * @param {Object} pipeline  - must expose push_job(job) async (e.g. JobQueue)
 * @returns {{ router: Router, acquisitionEngine: WorkloadAcquisitionEngine }}
 */
export function createDemandRouter(db, pipeline) {
    const router = Router();
    const metrics = new DemandMetrics(db);
    const engine = new WorkloadAcquisitionEngine(db);
    const demandRouter = new DemandRouter(engine, pipeline, metrics);

    // Lightweight API key auth — accepts any non-empty X-API-Key header
    const authenticate = (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) return res.status(401).json({ ok: false, error: 'X-API-Key header required' });
        req.clientId = `client_${crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 8)}`;
        next();
    };

    // ──────────────────────────────────────────────────
    //  POST /v1/demand/submit
    //  Accept a raw workload from any external source.
    // ──────────────────────────────────────────────────
    router.post('/submit', authenticate, (req, res) => {
        try {
            const { hint, ...raw } = req.body;
            const result = engine.submit(raw, hint || null);

            if (!result.accepted) {
                return res.status(429).json({ ok: false, error: result.reason });
            }

            res.status(202).json({
                ok: true,
                op_type: result.op_type,
                message: 'Workload accepted and queued for scheduling'
            });
        } catch (e) {
            console.error('[DemandRoute] /submit error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ──────────────────────────────────────────────────
    //  GET /v1/demand/metrics
    // ──────────────────────────────────────────────────
    router.get('/metrics', (req, res) => {
        try {
            res.status(200).json({ ok: true, metrics: metrics.snapshot() });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ──────────────────────────────────────────────────
    //  GET /v1/demand/status
    // ──────────────────────────────────────────────────
    router.get('/status', (req, res) => {
        res.status(200).json({
            ok: true,
            buffer_depth: engine.pendingCount(),
            metrics: engine.getMetrics()
        });
    });

    // ──────────────────────────────────────────────────
    //  POST /v1/demand/flush  (admin — manual drain)
    // ──────────────────────────────────────────────────
    router.post('/flush', authenticate, async (req, res) => {
        try {
            const result = await demandRouter.dispatch(100);
            res.status(200).json({ ok: true, ...result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return { router, acquisitionEngine: engine, demandRouter };
}
