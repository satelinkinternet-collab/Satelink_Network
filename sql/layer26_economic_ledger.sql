-- Phase 26: Economic Ledger (Double-Entry + Tamper-Evident)

-- A) Chart of Accounts
CREATE TABLE IF NOT EXISTS economic_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_key TEXT UNIQUE NOT NULL, -- TREASURY_USDT, USER:0x123...
    account_type TEXT NOT NULL,       -- treasury, user, node, revenue, expense, liability
    label TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_eco_acc_key ON economic_accounts(account_key);

-- Seed Base Accounts
INSERT OR IGNORE INTO economic_accounts (account_key, account_type, label, created_at) VALUES 
('TREASURY_USDT', 'treasury', 'Main Treasury', strftime('%s','now')*1000),
('PLATFORM_REVENUE_USDT', 'revenue', 'Platform Revenue', strftime('%s','now')*1000),
('PLATFORM_FEES_USDT', 'revenue', 'Platform Fees', strftime('%s','now')*1000),
('PAYOUTS_PAYABLE_USDT', 'liability', 'Pending Payouts', strftime('%s','now')*1000),
('REWARDS_PAYABLE_USDT', 'liability', 'Pending Rewards distribution', strftime('%s','now')*1000),
('ADJUSTMENTS_USDT', 'expense', 'Manual Adjustments', strftime('%s','now')*1000);

-- B) Ledger Entries (Double-Entry Lines)
CREATE TABLE IF NOT EXISTS economic_ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    txn_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    account_key TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('debit', 'credit')),
    amount_usdt REAL NOT NULL,
    memo TEXT,
    event_type TEXT NOT NULL, -- revenue, reward, payout, settlement, adjustment
    reference_type TEXT,      -- epoch, payout_batch, revenue_event
    reference_id TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(txn_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_eco_ent_created ON economic_ledger_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_eco_ent_ref ON economic_ledger_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_eco_ent_acc ON economic_ledger_entries(account_key);

-- C) Chain (Tamper-Evident)
CREATE TABLE IF NOT EXISTS economic_ledger_chain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ledger_entry_id INTEGER NOT NULL UNIQUE,
    txn_id TEXT NOT NULL,
    hash_prev TEXT NOT NULL,
    hash_current TEXT NOT NULL, -- sha256(canonical_json(entry) + hash_prev)
    created_at INTEGER NOT NULL,
    FOREIGN KEY(ledger_entry_id) REFERENCES economic_ledger_entries(id)
);

CREATE INDEX IF NOT EXISTS idx_eco_chain_txn ON economic_ledger_chain(txn_id);

-- D) Balances Cache
CREATE TABLE IF NOT EXISTS economic_account_balances (
    account_key TEXT PRIMARY KEY,
    balance_usdt REAL NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
);
