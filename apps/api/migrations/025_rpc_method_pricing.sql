-- 025_rpc_method_pricing.sql
-- Per-method RPC pricing in USDT
-- Used by credit_gate middleware to deduct correct cost per call

BEGIN;

CREATE TABLE IF NOT EXISTS rpc_method_pricing (
  id           SERIAL PRIMARY KEY,
  method_name  VARCHAR(100) NOT NULL,
  price_usdt   NUMERIC(12, 8) NOT NULL DEFAULT 0.00003000,
  tier         VARCHAR(20) NOT NULL DEFAULT 'standard',
  description  TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rpc_method_pricing_method_unique UNIQUE (method_name)
);

-- Seed: standard method pricing ($0.000030 per call baseline)
INSERT INTO rpc_method_pricing (method_name, price_usdt, tier, description) VALUES
  ('eth_call',                  0.00003000, 'standard', 'Contract read call'),
  ('eth_getBalance',            0.00001000, 'cheap',    'Balance lookup'),
  ('eth_blockNumber',           0.00001000, 'cheap',    'Latest block number'),
  ('eth_getBlockByNumber',      0.00003000, 'standard', 'Block data fetch'),
  ('eth_getBlockByHash',        0.00003000, 'standard', 'Block data by hash'),
  ('eth_getTransactionByHash',  0.00002000, 'standard', 'Tx lookup'),
  ('eth_getTransactionReceipt', 0.00002000, 'standard', 'Tx receipt'),
  ('eth_getLogs',               0.00010000, 'heavy',    'Event log query'),
  ('eth_sendRawTransaction',    0.00005000, 'write',    'Transaction broadcast'),
  ('eth_estimateGas',           0.00003000, 'standard', 'Gas estimation'),
  ('eth_gasPrice',              0.00001000, 'cheap',    'Gas price oracle'),
  ('eth_chainId',               0.00000500, 'cheap',    'Chain ID'),
  ('eth_getCode',               0.00002000, 'standard', 'Contract code'),
  ('eth_getStorageAt',          0.00003000, 'standard', 'Storage slot read'),
  ('net_version',               0.00000500, 'cheap',    'Network version'),
  ('web3_clientVersion',        0.00000500, 'cheap',    'Client version'),
  ('eth_syncing',               0.00001000, 'cheap',    'Sync status'),
  ('eth_getTransactionCount',   0.00001000, 'cheap',    'Nonce lookup'),
  ('eth_feeHistory',            0.00003000, 'standard', 'Fee history'),
  ('debug_traceTransaction',    0.00050000, 'premium',  'Transaction trace'),
  ('trace_transaction',         0.00050000, 'premium',  'Trace call'),
  ('eth_subscribe',             0.00005000, 'stream',   'WebSocket subscription')
ON CONFLICT (method_name) DO UPDATE SET
  price_usdt = EXCLUDED.price_usdt,
  active = true;

COMMIT;
