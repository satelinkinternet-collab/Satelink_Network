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
  console.log("[Schema] PostgreSQL mode — DDL skipped (init.sql), config seeded");
}
