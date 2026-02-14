-- Phase 23: Settlement V2 Tables

CREATE TABLE IF NOT EXISTS payout_batches_v2 (
    id TEXT PRIMARY KEY, -- uuid
    adapter_type TEXT NOT NULL, -- 'SIMULATED', 'FUSE', 'MOONPAY'
    external_ref TEXT,
    status TEXT DEFAULT 'created', -- 'created', 'queued', 'processing', 'completed', 'failed', 'cancelled'
    total_amount DECIMAL(20, 8),
    fee_amount DECIMAL(20, 8),
    currency TEXT DEFAULT 'USDT',
    item_count INTEGER,
    created_at INTEGER,
    updated_at INTEGER,
    completed_at INTEGER,
    tx_hash TEXT,
    meta_json TEXT
);

CREATE TABLE IF NOT EXISTS payout_items_v2 (
    id TEXT PRIMARY KEY, -- uuid
    batch_id TEXT,
    wallet TEXT NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    status TEXT DEFAULT 'pending',
    external_ref TEXT, -- formatting might differ per item
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY(batch_id) REFERENCES payout_batches_v2(id)
);

CREATE INDEX IF NOT EXISTS idx_payout_v2_status ON payout_batches_v2(status);
CREATE INDEX IF NOT EXISTS idx_payout_v2_wallet ON payout_items_v2(wallet);
