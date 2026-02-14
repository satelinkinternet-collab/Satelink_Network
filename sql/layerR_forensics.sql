-- Phase R: Forensics, Replay, and Tamper-Evident Audit

-- R1: Daily State Snapshots
CREATE TABLE IF NOT EXISTS daily_state_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_yyyymmdd INTEGER NOT NULL UNIQUE,
    totals_json TEXT NOT NULL,        -- canonical summary
    hash_proof TEXT NOT NULL,         -- sha256 of totals_json
    created_at INTEGER NOT NULL,
    created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_day ON daily_state_snapshots(day_yyyymmdd);

-- R3: Partner Dispute Workflow
CREATE TABLE IF NOT EXISTS partner_disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id TEXT NOT NULL,
    from_ts INTEGER NOT NULL,
    to_ts INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',  -- open|investigating|resolved|rejected
    created_at INTEGER NOT NULL,
    created_by TEXT NOT NULL,            -- admin wallet or partner_id
    forensic_report_json TEXT,           -- output from replay
    resolved_at INTEGER,
    resolved_by TEXT,
    resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_disputes_partner ON partner_disputes(partner_id, status);

-- R4: Epoch Proof Packages
CREATE TABLE IF NOT EXISTS epoch_proof_packages (
    epoch_id INTEGER PRIMARY KEY,
    proof_json TEXT NOT NULL,
    proof_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    created_by TEXT NOT NULL
);

-- R5: Ledger Integrity Runs
CREATE TABLE IF NOT EXISTS ledger_integrity_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_yyyymmdd INTEGER NOT NULL,
    ok INTEGER NOT NULL,              -- 1 or 0
    findings_json TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_integrity_day ON ledger_integrity_runs(day_yyyymmdd);

-- R6: Tamper-Evident Audit Chain (Migration)
-- Using a separate block for ALTER to handle "duplicate column" errors if re-run
-- or we can just try/catch in code. 
-- In pure SQL CLI, we can just do:
ALTER TABLE admin_audit_log ADD COLUMN prev_hash TEXT;
ALTER TABLE admin_audit_log ADD COLUMN entry_hash TEXT;
