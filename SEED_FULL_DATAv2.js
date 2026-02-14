import { UniversalDB } from './src/db/index.js';

(async () => {
    const db = new UniversalDB({ type: 'sqlite', connectionString: './satelink.db' });
    await db.init();

    console.log("🌱 Seeding Rich Data for Dashboards...");

    // 1. Seed Nodes (50 random nodes)
    const deviceTypes = ['starlink_v2', 'iot_gateway_pro', 'validator_node', 'gpu_worker_x1'];
    const statuses = ['online', 'online', 'online', 'offline']; // 75% online

    console.log("--- Seeding Nodes ---");
    await db.query("DELETE FROM nodes");

    // Seed regular random nodes
    for (let i = 0; i < 50; i++) {
        const id = `node_${Date.now()}_${i}`;
        const type = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const lastSeen = Math.floor(Date.now() / 1000) - (status === 'online' ? Math.floor(Math.random() * 300) : Math.floor(Math.random() * 86400));

        await db.query(`INSERT INTO nodes (node_id, wallet, device_type, status, last_seen, created_at) 
            VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
            [id, `0xnode_${i}`, type, status, lastSeen, Math.floor(Date.now() / 1000)]);
    }

    // 2. Specific Users (Node Operator)
    console.log("--- Seeding Specific Use Cases ---");
    const now = Math.floor(Date.now() / 1000);
    const nodeOpWallet = '0xnode_active';
    const nodeOpId = 'node_active_01';

    // Ensure Node exists
    await db.query("INSERT INTO nodes (node_id, wallet, device_type, status, last_seen, created_at) VALUES (?, ?, 'starlink_v2', 'online', ?, ?) ON CONFLICT(node_id) DO UPDATE SET status='online', last_seen=?", [nodeOpId, nodeOpWallet, now, now, now]);

    // Ensure Role exists
    await db.query("INSERT INTO user_roles (wallet, role, updated_at) VALUES (?, 'node_operator', ?) ON CONFLICT(wallet) DO UPDATE SET role=excluded.role", [nodeOpWallet, now]);

    // Earnings for Node Operator
    await db.query("DELETE FROM epoch_earnings WHERE wallet_or_node_id = ?", [nodeOpWallet]);
    for (let i = 1; i <= 5; i++) {
        await db.query("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES (?, 'node_operator', ?, ?, 'PAID', ?)",
            [i, nodeOpWallet, (Math.random() * 5).toFixed(2), now - (86400 * (6 - i))]);
    }
    // Unpaid/Claimable
    await db.query("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES (?, 'node_operator', ?, ?, 'UNPAID', ?)",
        [6, nodeOpWallet, '12.50', now]);

    // 3. Seed Revenue Events
    console.log("--- Seeding Revenue Events ---");
    await db.query("DELETE FROM revenue_events_v2");

    // Fetch node IDs including our active one
    const nodes = await db.query("SELECT node_id FROM nodes");
    const nodeIds = nodes.map(n => n.node_id);

    if (nodeIds.length === 0) { console.error("No nodes!"); process.exit(1); }

    const ops = ['api_relay', 'verification', 'compute', 'storage'];
    const dayStart = now - 86400;

    for (let i = 0; i < 200; i++) {
        const time = dayStart + Math.floor(Math.random() * 86400);
        const op = ops[Math.floor(Math.random() * ops.length)];
        const amount = (Math.random() * 0.5).toFixed(4);
        const nodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];

        await db.query(`INSERT INTO revenue_events_v2 (client_id, node_id, op_type, amount_usdt, created_at)
            VALUES (?, ?, ?, ?, ?)`,
            [`client_${Math.floor(Math.random() * 100)}`, nodeId, op, amount, time]);
    }

    // 4. Ensure Admin Roles
    const roles = [
        { wallet: '0xadmin_super', role: 'admin_super' },
        { wallet: '0xadmin_support', role: 'admin_support' },
        { wallet: '0xadmin_dev', role: 'admin_dev' },
        { wallet: '0xenterprise', role: 'enterprise' }
    ];
    for (const r of roles) {
        await db.query("INSERT INTO user_roles (wallet, role, updated_at) VALUES (?, ?, ?) ON CONFLICT(wallet) DO UPDATE SET role=excluded.role", [r.wallet, r.role, now]);
    }

    console.log("✅ Seeded 50 Nodes.");
    console.log("✅ Seeded 200 Revenue Events.");
    console.log("🎉 Seeding Complete! Roles: Super(0xadmin_super), Support(0xadmin_support), Dev(0xadmin_dev), Node(0xnode_active).");
})();
