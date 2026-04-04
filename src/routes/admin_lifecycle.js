import { Router } from 'express';

export function createAdminLifecycleRouter(db) {
    const router = Router();

    /**
     * O3: Admin View Diagnostic
     * GET /admin/network/nodes/:node_id/diag
     */
    router.get('/nodes/:node_id/diag', async (req, res) => {
        try {
            const { node_id } = req.params;

            // Fetch last bundle
            const bundle = await db.get(
                "SELECT bundle_json, created_at FROM node_diag_bundles WHERE node_id = ? ORDER BY created_at DESC LIMIT 1",
                [node_id]
            );

            // Fetch remediation suggestions
            const suggestions = await db.query(
                "SELECT * FROM node_remediation_suggestions WHERE node_id = ? AND status = 'open' ORDER BY created_at DESC",
                [node_id]
            );

            if (!bundle && (!suggestions || suggestions.length === 0)) {
                return res.json({ ok: true, data: null });
            }

            res.json({
                ok: true,
                data: {
                    latest_bundle: bundle ? JSON.parse(bundle.bundle_json) : null,
                    uploaded_at: bundle ? bundle.created_at : null,
                    remediation: suggestions || []
                }
            });

        } catch (e) {
            console.error('[AdminLifecycle] Diag Error:', e);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    /**
     * O5: Release Policy Access
     * GET /admin/network/releases
     */
    router.get('/releases', async (req, res) => {
        try {
            const policies = await db.query("SELECT * FROM node_release_policy");
            res.json({ ok: true, policies });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    /**
     * O5: Update Release Policy
     * POST /admin/network/releases
     */
    router.post('/releases', async (req, res) => {
        try {
            const { channel, min_version, build_hash } = req.body;
            if (!channel || !min_version) return res.status(400).json({ error: "Missing channel/version" });

            await db.query(`
                INSERT INTO node_release_policy (channel, min_version, build_hash, updated_at, updated_by)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(channel) DO UPDATE SET
                    min_version = excluded.min_version,
                    build_hash = excluded.build_hash,
                    updated_at = excluded.updated_at,
                    updated_by = excluded.updated_by
            `, [channel, min_version, build_hash || null, Date.now(), req.user.wallet]);

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
