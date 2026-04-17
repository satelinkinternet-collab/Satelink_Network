#!/usr/bin/env node
/**
 * Bootstrap Script: Register Satelink Node #1
 *
 * This script registers the first node in the network so workloads can be processed.
 * Run once during initial setup or to reset Node #1 to active status.
 *
 * Usage: node scripts/bootstrap/register_node1.js
 *
 * Required env vars:
 *   DATABASE_URL - PostgreSQL connection string
 *   TREASURY_ADDRESS - Wallet address for Node #1 (defaults to env)
 *   RPC_URL - Polygon Amoy RPC endpoint (defaults to public RPC)
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function registerNode1() {
    const now = Date.now();

    const node = {
        node_id: 'NODE-SATELINK-001',
        wallet: process.env.TREASURY_ADDRESS || '0x0000000000000000000000000000000000000001',
        node_type: 'NODEOPS_MANAGED',
        region: 'ap-south-1',
        active: 1
    };

    console.log('Registering Node #1...');
    console.log('  node_id:', node.node_id);
    console.log('  wallet:', node.wallet);
    console.log('  region:', node.region);

    try {
        // Check if node exists
        const existing = await pool.query(
            "SELECT node_id FROM registered_nodes WHERE node_id = $1",
            [node.node_id]
        );

        let result;
        if (existing.rows.length > 0) {
            // Update existing node
            result = await pool.query(`
                UPDATE registered_nodes SET active = 1, last_heartbeat = $1 WHERE node_id = $2 RETURNING node_id
            `, [now, node.node_id]);
            console.log('Node #1 updated:', result.rows[0].node_id);
        } else {
            // Insert new node
            result = await pool.query(`
                INSERT INTO registered_nodes (node_id, wallet, node_type, region, active, last_heartbeat)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING node_id
            `, [node.node_id, node.wallet, node.node_type, node.region, node.active, now]);
            console.log('Node #1 registered:', result.rows[0].node_id);
        }

        // Also register as RPC provider
        const rpcUrl = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';

        await pool.query(`
            CREATE TABLE IF NOT EXISTS rpc_providers (
                id SERIAL PRIMARY KEY,
                node_id TEXT UNIQUE NOT NULL,
                endpoint_url TEXT NOT NULL,
                chain_id INTEGER NOT NULL,
                provider_type TEXT DEFAULT 'node',
                region TEXT,
                priority INTEGER DEFAULT 100,
                status TEXT DEFAULT 'active',
                max_rps INTEGER DEFAULT 50,
                avg_latency_ms INTEGER DEFAULT 0,
                error_rate NUMERIC DEFAULT 0,
                consecutive_failures INTEGER DEFAULT 0,
                last_health_check BIGINT,
                last_success BIGINT,
                created_at BIGINT NOT NULL,
                updated_at BIGINT
            )
        `);

        await pool.query(`
            INSERT INTO rpc_providers
            (node_id, endpoint_url, chain_id, provider_type, region, priority, status, max_rps, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (node_id) DO UPDATE SET
                status = 'active',
                updated_at = $9
        `, [
            node.node_id,
            rpcUrl,
            80002, // Polygon Amoy
            'node',
            node.region,
            1, // Highest priority
            'active',
            100,
            now
        ]);

        console.log('RPC provider registered for Polygon Amoy (chain_id: 80002)');

        // Verify registration
        const count = await pool.query(
            "SELECT COUNT(*) as c FROM registered_nodes WHERE active = 1"
        );
        console.log('Total active nodes:', count.rows[0].c);

        console.log('\n✅ Node #1 bootstrap complete!');
        console.log('Network can now process workloads.');

    } catch (error) {
        console.error('❌ Error registering Node #1:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

registerNode1();
