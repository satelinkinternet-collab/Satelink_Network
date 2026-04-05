import { Router } from 'express';

export function createDevSeedRouter(opsEngine) {
    const router = Router();

    // Guard: Helper to check if dev
    const isDev = process.env.NODE_ENV !== 'production';

    router.use((req, res, next) => {
        if (!isDev) return res.status(404).send('Not Found');
        next();
    });

    // POST /__test/seed/admin
    // Seeds user_roles with demo accounts
    router.post('/admin', async (req, res) => {
        try {
            const users = [
                { wallet: '0xadmin', role: 'admin_super' },
                { wallet: '0xops', role: 'admin_ops' },
                { wallet: '0xnode', role: 'node_operator' },
                { wallet: '0xbuilder', role: 'builder' },
                { wallet: '0xdistrib', role: 'distributor_lco' }
            ];

            // Use REPLACE or upsert logic
            for (const u of users) {
                await opsEngine.db.query(
                    `INSERT INTO user_roles (wallet, role, updated_at) VALUES (?, ?, ?)
                     ON CONFLICT(wallet) DO UPDATE SET role = excluded.role, updated_at = excluded.updated_at`,
                    [u.wallet, u.role, Date.now()]
                );
            }
            res.json({ ok: true, seeded: users.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /__test/seed/nodes
    // Seeds nodes table + registered_nodes
    router.post('/nodes', async (req, res) => {
        try {
            const now = Math.floor(Date.now() / 1000);
            const nodes = [
                { id: 'node_online_1', wallet: '0xnode', status: 'active', last_seen: now },
                { id: 'node_online_2', wallet: '0xnode2', status: 'active', last_seen: now - 30 },
                { id: 'node_offline_1', wallet: '0xnode_off', status: 'inactive', last_seen: now - 86400 }
            ];

            for (const n of nodes) {
                // New table
                await opsEngine.db.query(
                    `INSERT INTO nodes (node_id, wallet, device_type, status, last_seen, created_at) 
                     VALUES (?, ?, 'edge', ?, ?, ?)
                     ON CONFLICT(node_id) DO UPDATE SET status = excluded.status, last_seen = excluded.last_seen`,
                    [n.id, n.wallet, n.status, n.last_seen, now]
                );

                // Legacy table (Sync)
                await opsEngine.db.query(
                    `INSERT INTO registered_nodes (wallet, last_heartbeat, active, updatedAt)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(wallet) DO UPDATE SET active = excluded.active, last_heartbeat = excluded.last_heartbeat`,
                    [n.wallet, n.last_seen, n.status === 'active' ? 1 : 0, now]
                );
            }
            res.json({ ok: true, seeded: nodes.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
