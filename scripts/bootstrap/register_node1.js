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
        infra_model: 'RESERVE_FUNDED',
        endpoint_url: process.env.NODE1_ENDPOINT_URL || 'http://localhost:8080',
        region: 'ap-south-1',
        chain_ids: JSON.stringify([80002, 137, 1]),
        status: 'active',
        tier: 'platinum',
        registered_at: now
    };

    console.log('Registering Node #1...');
    console.log('  node_id:', node.node_id);
    console.log('  wallet:', node.wallet);
    console.log('  endpoint:', node.endpoint_url);
    console.log('  chains:', node.chain_ids);

    try {
        // Check if registered_nodes table exists, create if not
        await pool.query(`
            CREATE TABLE IF NOT EXISTS registered_nodes (
                id SERIAL PRIMARY KEY,
                node_id TEXT UNIQUE NOT NULL,
                wallet TEXT NOT NULL,
                node_type TEXT DEFAULT 'STANDARD',
                infra_model TEXT DEFAULT 'SELF_FUNDED',
                endpoint_url TEXT,
                region TEXT,
                chain_ids TEXT,
                status TEXT DEFAULT 'pending',
                tier TEXT DEFAULT 'bronze',
                registered_at BIGINT NOT NULL,
                updated_at BIGINT
            )
        `);

        // Insert or update Node #1
        const result = await pool.query(`
            INSERT INTO registered_nodes
            (node_id, wallet, node_type, infra_model, endpoint_url, region, chain_ids, status, tier, registered_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (node_id) DO UPDATE SET
                status = 'active',
                updated_at = $10,
                endpoint_url = EXCLUDED.endpoint_url
            RETURNING id
        `, [
            node.node_id,
            node.wallet,
            node.node_type,
            node.infra_model,
            node.endpoint_url,
            node.region,
            node.chain_ids,
            node.status,
            node.tier,
            node.registered_at
        ]);

        console.log('Node #1 registered with id:', result.rows[0].id);

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
            "SELECT COUNT(*) as c FROM registered_nodes WHERE status = 'active'"
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
