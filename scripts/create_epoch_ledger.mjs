#!/usr/bin/env node
/**
 * Create epoch_ledger table on Railway PostgreSQL
 * Run with: railway run --service Satelink-api node scripts/create_epoch_ledger.mjs
 */

import pkg from 'pg';
const { Pool } = pkg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  console.log('[Migration] Creating epoch_ledger table...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS epoch_ledger (
        id SERIAL PRIMARY KEY,
        epoch_id INTEGER UNIQUE,
        status TEXT NOT NULL DEFAULT 'OPEN',
        started_at BIGINT NOT NULL,
        closed_at BIGINT,
        total_revenue NUMERIC(18,8) DEFAULT 0,
        node_pool NUMERIC(18,8) DEFAULT 0,
        platform_fee NUMERIC(18,8) DEFAULT 0,
        distribution_pool NUMERIC(18,8) DEFAULT 0,
        merkle_root TEXT,
        tx_hash TEXT,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
      )
    `);
    console.log('[Migration] epoch_ledger table created');

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_epoch_ledger_status ON epoch_ledger (status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_epoch_ledger_epoch_id ON epoch_ledger (epoch_id)`);
    console.log('[Migration] Indexes created');

    // Insert initial open epoch if none exists
    const result = await pool.query(`
      INSERT INTO epoch_ledger (epoch_id, status, started_at, total_revenue)
      SELECT 1, 'OPEN', EXTRACT(EPOCH FROM NOW()), 0
      WHERE NOT EXISTS (SELECT 1 FROM epoch_ledger WHERE status = 'OPEN')
      RETURNING id
    `);

    if (result.rows.length > 0) {
      console.log('[Migration] Initial epoch created with id:', result.rows[0].id);
    } else {
      console.log('[Migration] Open epoch already exists');
    }

    // Verify
    const count = await pool.query('SELECT COUNT(*) as count FROM epoch_ledger');
    console.log('[Migration] epoch_ledger rows:', count.rows[0].count);

    const openEpoch = await pool.query("SELECT * FROM epoch_ledger WHERE status = 'OPEN' LIMIT 1");
    if (openEpoch.rows.length > 0) {
      console.log('[Migration] Active epoch:', openEpoch.rows[0]);
    }

  } catch (err) {
    console.error('[Migration] Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }

  console.log('[Migration] Done!');
}

main();
