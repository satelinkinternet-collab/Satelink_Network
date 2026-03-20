import { ethers } from 'ethers';
import pg from 'pg';
import { OperationsEngine } from './apps/api/src/core/operations_engine.js';
import dotenv from 'dotenv';
dotenv.config();

// Custom adapter mimicking the one in server.js
class PgDatabase {
    constructor(pool) { this.pool = pool; }
    prepare(sql) {
        let idx = 0;
        let query = sql.replace(/\?/g, () => `$${++idx}`);
        query = query.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, "INSERT INTO");
        query = query.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, "SERIAL PRIMARY KEY");
        
        const normalizeParams = (a) => (a.length === 1 && Array.isArray(a[0])) ? a[0] : a;
        return {
            run: async (...args) => this.pool.query(query, normalizeParams(args)),
            get: async (...args) => (await this.pool.query(query, normalizeParams(args))).rows[0] || null,
            all: async (...args) => (await this.pool.query(query, normalizeParams(args))).rows
        };
    }
    transaction(cb) {
        return async () => {
            const client = await this.pool.connect();
            const originalPool = this.pool;
            this.pool = client;
            try {
                await client.query('BEGIN');
                await cb(this);
                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
                this.pool = originalPool;
            }
        };
    }
}

async function runTest() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://satelink:satelinkpassword@localhost:5432/satelink' });
    const db = new PgDatabase(pool);
    const opsEngine = new OperationsEngine(db);

    const wallet = ethers.Wallet.createRandom();
    console.log("Testing with wallet:", wallet.address);

    const now = Math.floor(Date.now() / 1000);
    
    // 1. Insert fake earnings
    await db.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES (?, 'node_operator', ?, ?, 'UNPAID', ?)")
        .run(999, wallet.address, 50.0, now);
    
    console.log("Inserted 50.0 USDT of earnings for node");

    // 2. Generate claim signature
    const message = `CLAIM_REWARDS:${wallet.address.toLowerCase()}`;
    const signature = await wallet.signMessage(message);

    // 3. Call claim flow
    console.log("Calling claim flow...");
    try {
        const result = await opsEngine.claim(wallet.address, signature);
        console.log("Claim result:", result);
    } catch(e) {
        console.error("Claim failed:", e.message);
    }

    // 4. Verify tables
    const earnings = await db.prepare("SELECT * FROM epoch_earnings WHERE wallet_or_node_id = ?").all(wallet.address);
    console.log("Epoch Earnings state:", earnings);

    const withdrawals = await db.prepare("SELECT * FROM withdrawals WHERE wallet = ?").all(wallet.address);
    console.log("Withdrawals state:", withdrawals);

    await pool.end();
}

runTest().catch(console.error);
