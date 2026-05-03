/**
 * S6-005: Treasury Auto-refill Monitor
 *
 * Monitors treasury balances and alerts on low funds:
 * - MATIC balance for gas
 * - USDT balance for settlements
 * - Alerts at configurable thresholds
 * - Redis-cached for fast reads
 */

const MONITOR_INTERVAL = 600000; // 10 min
const MATIC_LOW_THRESHOLD = 1; // 1 MATIC for gas
const USDT_LOW_THRESHOLD = 100; // $100 USDT for settlements
const MATIC_CRITICAL_THRESHOLD = 0.1;
const USDT_CRITICAL_THRESHOLD = 10;

export async function getMaticBalance(rpcUrl, address) {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1
      })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);

    const safeHex = (result.result || '0x0') === '0x' ? '0x0' : (result.result || '0x0');
    const wei = BigInt(safeHex);
    return Number(wei) / 1e18;
  } catch (e) {
    console.error('[Treasury] Failed to get MATIC balance:', e.message);
    return null;
  }
}

export async function getUsdtBalance(rpcUrl, usdtContract, address) {
  const balanceOfSig = '0x70a08231';
  const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0');
  const data = balanceOfSig + paddedAddress;

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: usdtContract, data }, 'latest'],
        id: 1
      })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);

    const safeHex = (result.result || '0x0') === '0x' ? '0x0' : (result.result || '0x0');
    const raw = BigInt(safeHex);
    return Number(raw) / 1e6; // USDT has 6 decimals
  } catch (e) {
    console.error('[Treasury] Failed to get USDT balance:', e.message);
    return null;
  }
}

export function checkThresholds(matic, usdt) {
  const alerts = [];

  if (matic !== null) {
    if (matic < MATIC_CRITICAL_THRESHOLD) {
      alerts.push({
        type: 'MATIC_CRITICAL',
        severity: 'CRITICAL',
        message: `MATIC balance critically low: ${matic.toFixed(4)}`,
        balance: matic,
        threshold: MATIC_CRITICAL_THRESHOLD
      });
    } else if (matic < MATIC_LOW_THRESHOLD) {
      alerts.push({
        type: 'MATIC_LOW',
        severity: 'WARNING',
        message: `MATIC balance low: ${matic.toFixed(4)}`,
        balance: matic,
        threshold: MATIC_LOW_THRESHOLD
      });
    }
  }

  if (usdt !== null) {
    if (usdt < USDT_CRITICAL_THRESHOLD) {
      alerts.push({
        type: 'USDT_CRITICAL',
        severity: 'CRITICAL',
        message: `USDT balance critically low: $${usdt.toFixed(2)}`,
        balance: usdt,
        threshold: USDT_CRITICAL_THRESHOLD
      });
    } else if (usdt < USDT_LOW_THRESHOLD) {
      alerts.push({
        type: 'USDT_LOW',
        severity: 'WARNING',
        message: `USDT balance low: $${usdt.toFixed(2)}`,
        balance: usdt,
        threshold: USDT_LOW_THRESHOLD
      });
    }
  }

  return alerts;
}

export async function getTreasuryStatus(redis) {
  const cached = await redis?.get('treasury:status');
  if (cached) return JSON.parse(cached);
  return null;
}

export async function checkTreasury(redis) {
  const rpcUrl = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
  const treasuryAddress = process.env.TREASURY_ADDRESS;
  const usdtContract = process.env.USDT_CONTRACT || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

  if (!treasuryAddress) {
    return {
      ok: false,
      error: 'TREASURY_ADDRESS not configured',
      timestamp: Date.now()
    };
  }

  const matic = await getMaticBalance(rpcUrl, treasuryAddress);
  const usdt = await getUsdtBalance(rpcUrl, usdtContract, treasuryAddress);
  const alerts = checkThresholds(matic, usdt);

  const status = {
    ok: alerts.length === 0,
    timestamp: Date.now(),
    address: treasuryAddress,
    balances: {
      matic: matic !== null ? matic.toFixed(4) : 'unknown',
      usdt: usdt !== null ? usdt.toFixed(2) : 'unknown'
    },
    alerts,
    hasAlerts: alerts.length > 0
  };

  await redis?.set('treasury:status', JSON.stringify(status), 'EX', 1200);
  return status;
}

export async function startTreasuryMonitor(redis) {
  console.log('[Treasury-Monitor] Started — checking balances every 10min');

  const check = async () => {
    try {
      const status = await checkTreasury(redis);

      if (status.hasAlerts) {
        for (const a of status.alerts) {
          console.log(`[Treasury-Monitor] ${a.severity}: ${a.message}`);
        }
      }

      await redis?.set('treasury:last_check', Date.now());
    } catch (e) {
      console.error('[Treasury-Monitor] Error:', e.message);
    }
  };

  await check();
  setInterval(check, MONITOR_INTERVAL);
}

export {
  MATIC_LOW_THRESHOLD,
  USDT_LOW_THRESHOLD,
  MATIC_CRITICAL_THRESHOLD,
  USDT_CRITICAL_THRESHOLD
};
