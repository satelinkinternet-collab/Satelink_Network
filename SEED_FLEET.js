import { UniversalDB } from './src/db/index.js';

(async () => {
    const db = new UniversalDB({ type: 'sqlite', connectionString: './satelink.db' });
    await db.init();

    const distWallet = '0xdist_lco';
    const refCode = distWallet.slice(0, 8); // '0xdist_l'
    const nodeId = 'node_' + Date.now();
    const nodeWallet = '0xnode_' + Date.now();

    console.log(`Seeding referral for ${distWallet} (Ref: ${refCode})...`);

    // 1. Create Node
    await db.query(`INSERT INTO nodes (node_id, wallet, device_type, status, last_seen, created_at) 
        VALUES (?, ?, 'starlink_v2', 'online', ?, ?)`,
        [nodeId, nodeWallet, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]);

    // 2. Create Conversion / Referral
    await db.query(`INSERT INTO conversions (ref_code, wallet, role, node_id, created_at) 
        VALUES (?, ?, 'node_operator', ?, ?)`,
        [refCode, nodeWallet, nodeId, Date.now()]);

    console.log("✅ Seeded Fleet Node.");
})();
