-- LAYER-5.6: Op weights (economics config)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS op_weights (
  op_type TEXT PRIMARY KEY,
  weight REAL NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Seed Day-1 minimal weights (safe to rerun)
INSERT INTO op_weights (op_type, weight, updated_at) VALUES
  ('uptime_proof', 1.0,  strftime('%s','now')),
  ('validation', 8.0,    strftime('%s','now')),
  ('routing_decision', 5.0, strftime('%s','now')),
  ('automation_trigger', 7.0, strftime('%s','now')),
  ('heartbeat', 0.05,    strftime('%s','now'))
ON CONFLICT(op_type) DO UPDATE SET
  weight = excluded.weight,
  updated_at = excluded.updated_at;

