/**
 * migrate.js — CI-safe database migration placeholder.
 *
 * In production the schema is bootstrapped by:
 *   1. docker/postgres/init/001_init.sql  (container first-run)
 *   2. attachSchema(db)                   (server.js boot)
 *
 * This script exists so `node scripts/migrate.js` in CI pipelines
 * exits cleanly without a live database.
 */
console.log("[migrate] No pending migrations — schema managed by attachSchema().");
process.exit(0);
