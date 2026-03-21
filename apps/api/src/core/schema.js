import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Schema initialization.
 *
 * For PostgreSQL: tables are created by docker/init/init.sql via docker-entrypoint-initdb.d.
 * This function only seeds essential bootstrap config rows.
 * Standardized schema initialization. Managed via init.sql for migrations.
 */
export async function attachSchema(db) {
  // If db has a .pool property, it's our PgDatabase adapter → postgres
  const isPostgres = !!db.pool;

  let needsInit = false;
  try {
      await db.prepare("SELECT 1 FROM system_config LIMIT 1").get();
  } catch (e) {
      needsInit = true;
  }

  if (needsInit) {
      console.log("[Schema] system_config missing, executing init.sql...");
      try {
          const initSqlPath = path.resolve(__dirname, '../../../../docker/init/init.sql');
          const sql = fs.readFileSync(initSqlPath, 'utf8');
          await db.exec(sql);
          console.log("[Schema] init.sql executed successfully.");
      } catch (err) {
          console.error("[Schema] Failed to execute init.sql:", err.message);
      }
  }

  // Safe ad-hoc migrations for existing DBs to resolve mismatches 
  try {
    const migrations = [
      "ALTER TABLE nodes ADD COLUMN IF NOT EXISTS management_type TEXT DEFAULT 'community';",
      "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS management_type TEXT DEFAULT 'community';",
      "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS node_id TEXT;",
      "ALTER TABLE registered_nodes ALTER COLUMN last_heartbeat TYPE BIGINT;",
      "ALTER TABLE registered_nodes ALTER COLUMN \"updatedAt\" TYPE BIGINT;",
      "ALTER TABLE op_counts ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE rate_limits ALTER COLUMN window_start TYPE BIGINT;",
      "ALTER TABLE heartbeat_security_log ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE auth_failures ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE payments_inbox ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE revenue_events ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE epochs ALTER COLUMN starts_at TYPE BIGINT;",
      "ALTER TABLE epochs ALTER COLUMN ends_at TYPE BIGINT;",
      "ALTER TABLE execution_metrics ALTER COLUMN updated_at TYPE BIGINT;",
      "ALTER TABLE enterprise_clients ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE enterprise_api_keys ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE genesis_nodes ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE external_providers ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE node_capabilities ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE job_queue_log ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE job_queue_log ALTER COLUMN completed_at TYPE BIGINT;",
      "ALTER TABLE workload_pricing ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE pair_codes ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE pair_codes ALTER COLUMN expires_at TYPE BIGINT;",
      "ALTER TABLE pair_codes ALTER COLUMN used_at TYPE BIGINT;",
      "ALTER TABLE nodes ALTER COLUMN last_seen TYPE BIGINT;",
      "ALTER TABLE nodes ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE audit_logs ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE users ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE users ALTER COLUMN last_login_at TYPE BIGINT;",
      "ALTER TABLE auth_nonces ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE auth_nonces ALTER COLUMN expires_at TYPE BIGINT;",
      "ALTER TABLE auth_nonces ALTER COLUMN used_at TYPE BIGINT;",
      "ALTER TABLE api_usage ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE error_events ALTER COLUMN first_seen_at TYPE BIGINT;",
      "ALTER TABLE error_events ALTER COLUMN last_seen_at TYPE BIGINT;",
      "ALTER TABLE slow_queries ALTER COLUMN last_seen_at TYPE BIGINT;",
      "ALTER TABLE security_alerts ALTER COLUMN resolved_at TYPE BIGINT;",
      "ALTER TABLE automation_jobs ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE automation_jobs ALTER COLUMN last_fire TYPE BIGINT;",
      "ALTER TABLE operator_billing ALTER COLUMN prepaid_until TYPE BIGINT;",
      "ALTER TABLE operator_billing ALTER COLUMN reserve_start_date TYPE BIGINT;",
      "ALTER TABLE operator_billing ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE operator_billing ALTER COLUMN updated_at TYPE BIGINT;",
      "ALTER TABLE ledger_entries ALTER COLUMN period_start TYPE BIGINT;",
      "ALTER TABLE ledger_entries ALTER COLUMN period_end TYPE BIGINT;",
      "ALTER TABLE ledger_entries ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE ledger_entries ALTER COLUMN updated_at TYPE BIGINT;",
      "ALTER TABLE daily_ops_reports ALTER COLUMN start_ts TYPE BIGINT;",
      "ALTER TABLE daily_ops_reports ALTER COLUMN end_ts TYPE BIGINT;",
      "ALTER TABLE daily_ops_reports ALTER COLUMN created_at TYPE BIGINT;",
      "ALTER TABLE node_registry ALTER COLUMN created_at TYPE BIGINT;"
    ];

    for (const sql of migrations) {
      try { await db.exec(sql); } catch (e) { /* ignore if table doesn't exist or already applied */ }
    }
  } catch (err) {
    console.error("[Schema] Migrations error:", err.message);
  }

  const seeds = [
    ["security_freeze", "0"],
    ["withdrawals_paused", "0"],
    ["dynamic_profit_guard_enabled", "1"],
    ["default_profit_margin", "25"],
    ["launch_mode_profit_margin", "40"],
  ];
  for (const [key, value] of seeds) {
    try {
      await db.prepare(
        "INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING"
      ).run([key, value]);
    } catch (e) {
      // Ignore — table may not exist yet on first boot race
    }
  }
  console.log("[Schema] PostgreSQL config seeded successfully");
}
