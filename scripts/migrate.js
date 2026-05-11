// scripts/migrate.js — PostgreSQL migration runner
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrate(pool) {
  console.log('[MIGRATION] Starting PostgreSQL migration...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const sqlDir = path.resolve(path.join(__dirname, '..', 'sql'));
  if (!fs.existsSync(sqlDir)) {
    console.log('[MIGRATION] No sql/ directory found — skipping.');
    return;
  }

  const files = fs.readdirSync(sqlDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await pool.query(
      'SELECT id FROM _migrations WHERE filename = $1', [file]
    );
    if (rows.length > 0) {
      console.log(`[MIGRATION] Skipping ${file} (already applied)`);
      continue;
    }

    console.log(`[MIGRATION] Applying ${file}`);
    const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      console.log(`[MIGRATION] ✅ ${file} applied`);
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
        console.warn(`[MIGRATION] ⚠️  ${file}: ${e.message} (continuing)`);
        await pool.query('INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
      } else {
        console.error(`[MIGRATION] ❌ FATAL in ${file}: ${e.message}`);
        throw e;
      }
    }
  }
  console.log('[MIGRATION] ✅ Complete.');
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  migrate(pool)
    .then(() => pool.end())
    .catch(e => { console.error(e); process.exit(1); });
}
