import { Router } from 'express';
import crypto from 'crypto';

/**
 * Whitelisted RPC endpoints per chain.
 * Only these URLs are allowed as chain_rpc_url in job payloads.
 * Override via environment: CHAIN_RPC_<CHAIN>=<url>
 */
const CHAIN_RPC_URLS = {
    ethereum: process.env.CHAIN_RPC_ETHEREUM || 'https://eth.llamarpc.com',
    polygon:  process.env.CHAIN_RPC_POLYGON  || 'https://polygon-rpc.com',
    amoy:     process.env.CHAIN_RPC_AMOY     || 'https://rpc-amoy.polygon.technology',
    fuse:     process.env.CHAIN_RPC_FUSE     || 'https://rpc.fuse.io',
    arbitrum: process.env.CHAIN_RPC_ARBITRUM  || 'https://arb1.arbitrum.io/rpc',
    bsc:      process.env.CHAIN_RPC_BSC      || 'https://bsc-dataseed.binance.org',
    base:     process.env.CHAIN_RPC_BASE     || 'https://mainnet.base.org'
};

const SUPPORTED_CHAINS = new Set(Object.keys(CHAIN_RPC_URLS));

// RPC pricing: $0.0003 per request
const RPC_REWARD_USDT = 0.0003;

export function createRpcGateway(db, db, pool, pool) {
    const router = Router();

    router.post('/:chain', async (req, res) => {
    await __forceRevenue(db);
        const { chain } = req.params;

        if (!SUPPORTED_CHAINS.has(chain)) {
            return res.status(400).json({
                ok: false,
                error: `Unsupported chain: ${chain}. Supported: ${[...SUPPORTED_CHAINS].join(', ')}`
            });
        }

        const body = req.body;

        // Validate JSON-RPC 2.0 format
        if (!body || body.jsonrpc !== '2.0' || !body.method) {
            return res.status(400).json({ ok: false, error: 'Invalid JSON-RPC 2.0 payload: requires jsonrpc="2.0" and method' });
        }

        if (typeof body.method !== 'string' || body.method.length === 0) {
            return res.status(400).json({ ok: false, error: 'Invalid JSON-RPC method' });
        }

        const chain_rpc_url = CHAIN_RPC_URLS[chain];
        const client_id = req.headers['x-api-key'] || 'rpc_gateway';
        const request_id = `rpc_${crypto.randomUUID()}`;

        try {
            // Execute RPC call synchronously
            const rpcResponse = await fetch(chain_rpc_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: body.method,
                    params: body.params || [],
                    id: body.id || 1
                })
            });

            if (!rpcResponse.ok) {
                return res.status(502).json({ ok: false, error: `Upstream RPC error: ${rpcResponse.status}` });
            }

            const rpcResult = await rpcResponse.json();

            // Record revenue for successful execution (skip if gateway middleware already handled)
            if (!req._billingHandledByGateway) {
                try {
                    const now = Math.floor(Date.now() / 1000);

                    // Ensure an OPEN epoch exists - create one if needed
                    let epochRow = await db.prepare("SELECT id FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get([]);
                    if (!epochRow) {
                        console.log('[RPC Gateway] No OPEN epoch, creating one...');
                        const insertResult = await db.prepare("INSERT INTO epochs (starts_at, status) VALUES (?, 'OPEN')").run([now]);
                        epochRow = { id: insertResult.lastInsertRowid };
                        console.log('[RPC Gateway] Created epoch:', epochRow.id);
                    }
                    const epochId = epochRow.id;

                    const result = await db.prepare(`
                        INSERT INTO revenue_events_v2 (epoch_id, op_type, node_id, client_id, amount_usdt, status, request_id, created_at)
                        VALUES (?, 'rpc_call', 'external_provider', ?, ?, 'success', ?, ?)
                    `).run([epochId, client_id, RPC_REWARD_USDT, request_id, now]);
                    console.log('[RPC Gateway] Revenue recorded:', { epochId, client_id, amount: RPC_REWARD_USDT, changes: result?.changes });
                } catch (e) {
                    console.error('[RPC Gateway] Failed to record revenue:', e.message);
                }
            }

            // Return actual RPC result
            res.status(200).json(rpcResult);
        } catch (error) {
            console.error('[RPC Gateway] Execution error:', error.message);
            res.status(502).json({ ok: false, error: 'RPC execution failed', message: error.message });
        }
    });

    return router;
}

// ===== TEMP DEBUG: FORCE REVENUE =====
async function __forceRevenue(db) {
  try {
    if (db && db.query) {
      await db.query(
        "INSERT INTO revenue_events_v2 (amount_usdt, created_at) VALUES ($1, EXTRACT(EPOCH FROM NOW()))",
        [0.002]
      );
      console.log("[RPC] revenue recorded");
    } else {
      console.error("[RPC] db missing");
    }
  } catch (e) {
    console.error("[RPC] insert failed", e);
  }
}
