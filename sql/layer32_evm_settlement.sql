-- Phase 32: EVM Settlement Tables

CREATE TABLE IF NOT EXISTS settlement_evm_txs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    chain_name TEXT NOT NULL,
    asset_symbol TEXT NOT NULL,      -- USDT/USDC/NATIVE
    to_address TEXT NOT NULL,
    amount_atomic TEXT NOT NULL,     -- string atomic units
    nonce INTEGER,
    tx_hash TEXT,
    status TEXT NOT NULL,            -- prepared|sent|confirmed|failed|replaced|cancelled
    error_code TEXT,
    error_message TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(batch_id) REFERENCES payout_batches_v2(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evm_txs_chain_hash ON settlement_evm_txs(chain_name, tx_hash) WHERE tx_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_evm_txs_batch_item ON settlement_evm_txs(batch_id, item_id);
CREATE INDEX IF NOT EXISTS idx_evm_txs_batch_status ON settlement_evm_txs(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_evm_txs_updated ON settlement_evm_txs(updated_at);

CREATE TABLE IF NOT EXISTS settlement_evm_nonce_lock (
    chain_name TEXT PRIMARY KEY,
    last_nonce INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
