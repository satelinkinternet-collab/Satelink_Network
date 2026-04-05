
import express from 'express';
import { ReputationEngine } from '../services/reputation_engine.js';

/**
 * Public Node Profile — mounted at /node
 * Shows non-sensitive quality data for individual nodes.
 */
export function createPublicNodeRouter(db) {
    const router = express.Router();
    const engine = new ReputationEngine(db);

    // GET /node/:node_id
    router.get('/:node_id', async (req, res) => {
        try {
            const profile = await engine.getPublicProfile(req.params.node_id);
            if (!profile) return res.status(404).json({ ok: false, error: 'Node not found' });
            res.json({ ok: true, ...profile });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
