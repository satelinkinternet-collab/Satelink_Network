
import { Router } from 'express';
import crypto from 'crypto';

export function createBuilderApiRouter(opsEngine, authMiddleware) {
    const router = Router();

    router.use(authMiddleware);

    // List Projects
    router.get('/projects', async (req, res) => {
        const projects = await opsEngine.db.query(
            "SELECT * FROM builder_projects WHERE builder_wallet = ? AND status = 'active' ORDER BY created_at DESC",
            [req.builderWallet]
        );
        res.json(projects);
    });

    // Create Project
    router.post('/projects', async (req, res) => {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });

        await opsEngine.db.run(
            "INSERT INTO builder_projects (builder_wallet, name, created_at) VALUES (?, ?, ?)",
            [req.builderWallet, name, Date.now()]
        );
        res.json({ success: true });
    });

    // Get Project Details & Keys
    router.get('/projects/:id', async (req, res) => {
        const { id } = req.params;
        const project = await opsEngine.db.get(
            "SELECT * FROM builder_projects WHERE id = ? AND builder_wallet = ?",
            [id, req.builderWallet]
        );
        if (!project) return res.status(404).json({ error: 'Not Found' });

        const keys = await opsEngine.db.query(
            "SELECT id, key_prefix, status, created_at FROM api_keys WHERE project_id = ? AND status = 'active'",
            [id]
        );

        // Usage stats (simple aggregation)
        const usage = await opsEngine.db.get(
            "SELECT COUNT(*) as calls, SUM(cost_usdt) as cost FROM api_usage WHERE project_id = ?",
            [id]
        );

        res.json({ project, keys, usage });
    });

    // Create API Key
    router.post('/projects/:id/keys', async (req, res) => {
        const { id } = req.params;
        // Verify ownership
        const project = await opsEngine.db.get(
            "SELECT * FROM builder_projects WHERE id = ? AND builder_wallet = ?",
            [id, req.builderWallet]
        );
        if (!project) return res.status(403).json({ error: 'Unauthorized' });

        // Generate Key
        const rawKey = 'sl_live_' + crypto.randomBytes(32).toString('hex');
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.substring(0, 12) + '...';

        await opsEngine.db.run(
            "INSERT INTO api_keys (project_id, key_hash, key_prefix, created_at) VALUES (?, ?, ?, ?)",
            [id, keyHash, keyPrefix, Date.now()]
        );

        // Return raw key ONCE
        res.json({ key: rawKey, prefix: keyPrefix });
    });

    // Revoke Key
    router.post('/projects/:id/keys/:keyId/revoke', async (req, res) => {
        const { id, keyId } = req.params;
        // Verify ownership
        const project = await opsEngine.db.get("SELECT * FROM builder_projects WHERE id = ? AND builder_wallet = ?", [id, req.builderWallet]);
        if (!project) return res.status(403).json({ error: 'Unauthorized' });

        await opsEngine.db.run(
            "UPDATE api_keys SET status = 'revoked', revoked_at = ? WHERE id = ? AND project_id = ?",
            [Date.now(), keyId, id]
        );
        res.json({ success: true });
    });

    // Rotate Key (Create new, optionally revoke old)
    router.post('/projects/:id/keys/rotate', async (req, res) => {
        const { id } = req.params;
        const { revoke_id } = req.body;

        const project = await opsEngine.db.get("SELECT * FROM builder_projects WHERE id = ? AND builder_wallet = ?", [id, req.builderWallet]);
        if (!project) return res.status(403).json({ error: 'Unauthorized' });

        // Revoke old if requested
        if (revoke_id) {
            await opsEngine.db.run(
                "UPDATE api_keys SET status = 'revoked', revoked_at = ? WHERE id = ? AND project_id = ?",
                [Date.now(), revoke_id, id]
            );
        }

        // Generate New
        const rawKey = 'sl_live_' + crypto.randomBytes(32).toString('hex');
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.substring(0, 12) + '...';

        await opsEngine.db.run(
            "INSERT INTO api_keys (project_id, key_hash, key_prefix, created_at) VALUES (?, ?, ?, ?)",
            [id, keyHash, keyPrefix, Date.now()]
        );

        res.json({ key: rawKey, prefix: keyPrefix });
    });

    return router;
}
