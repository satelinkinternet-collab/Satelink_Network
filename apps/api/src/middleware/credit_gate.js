// apps/api/src/middleware/credit_gate.js
// Pre-pay credit gate for RPC calls
// Deducts USDT from credit_balances before serving request
// Returns 402 Payment Required if balance insufficient
// Only activates for requests with x-wallet-address header
// Fail-open: on DB error, request is served (never blocks on infra failure)

const DEFAULT_COST_USDT = 0.00003; // $0.000030 — matches seed pricing
const LOG_PREFIX = '[CreditGate]';

export function createCreditGate(db, logger) {
  const log = logger || console;

  // Cache pricing table in memory for 5 min (avoids DB hit per call)
  let pricingCache = null;
  let pricingCacheExpiry = 0;

  async function getPricing() {
    const now = Date.now();
    if (pricingCache && now < pricingCacheExpiry) return pricingCache;

    try {
      const result = await db.query(
        'SELECT method_name, price_usdt FROM rpc_method_pricing WHERE active = true'
      );
      pricingCache = {};
      for (const row of result.rows) {
        pricingCache[row.method_name] = parseFloat(row.price_usdt);
      }
      pricingCacheExpiry = now + 5 * 60 * 1000; // 5 min TTL
      return pricingCache;
    } catch {
      return {}; // fallback to default on DB error
    }
  }

  async function getCost(methodName) {
    const pricing = await getPricing();
    return pricing[methodName] ?? DEFAULT_COST_USDT;
  }

  return async function creditGate(req, res, next) {
    // Only gate wallet-authenticated requests
    const rawWallet = req.headers['x-wallet-address'];
    if (!rawWallet) return next(); // public/unauthenticated — pass through

    const wallet = rawWallet.toLowerCase();

    // Validate wallet format
    if (!wallet.match(/^0x[0-9a-f]{40}$/)) {
      return res.status(400).json({
        error: 'Invalid x-wallet-address header format'
      });
    }

    // Get method from JSON-RPC body
    const method = req.body?.method || 'eth_call';
    const cost = await getCost(method);

    try {
      // Atomic deduct — only succeeds if balance >= cost
      const result = await db.query(
        `UPDATE credit_balances
         SET balance_usdt = balance_usdt - $1,
             total_spent  = total_spent + $1,
             updated_at   = NOW()
         WHERE lower(wallet_address) = $2
           AND balance_usdt >= $1
         RETURNING balance_usdt`,
        [cost, wallet]
      );

      if (result.rowCount === 0) {
        // Check if wallet exists at all
        const balRow = await db.query(
          'SELECT balance_usdt FROM credit_balances WHERE lower(wallet_address) = $1',
          [wallet]
        );

        const currentBalance = parseFloat(balRow.rows[0]?.balance_usdt ?? 0);

        log.warn(`${LOG_PREFIX} Payment required: wallet=${wallet} balance=${currentBalance} needed=${cost}`);

        return res.status(402).json({
          error: 'Insufficient credits',
          balance_usdt: currentBalance,
          required_usdt: cost,
          rpc_method: method,
          deposit_address: process.env.REVENUE_VAULT_ADDRESS || 'not deployed yet',
          network: 'Polygon Amoy (chainId: 80002)',
          usdt_contract: process.env.USDT_CONTRACT_ADDRESS || 'not deployed yet',
          message: 'Deposit USDT to RevenueVault to continue. Low-balance auto-refill recommended.'
        });
      }

      // Attach metadata for downstream logging
      req.creditDeducted = cost;
      req.creditWallet = wallet;
      req.creditBalanceAfter = parseFloat(result.rows[0].balance_usdt);

      next();

    } catch (err) {
      // Fail-open: log error but do NOT block the request
      log.error(`${LOG_PREFIX} DB error (fail-open): ${err.message}`);
      next();
    }
  };
}
