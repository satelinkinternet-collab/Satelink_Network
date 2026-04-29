/**
 * S6-003: Self-healing RPC Failover
 *
 * Autonomous recovery for RPC providers:
 * - Background health probing of circuit-broken providers
 * - Fallback chain routing when all primaries fail
 * - Cascade failure detection and alerting
 * - Provider ranking adjustment based on reliability
 */

import { getCircuitStats, forceClose, STATE } from '../workloads/rpc_gateway/circuit_breaker.js';
import { getProviders, CHAIN_ALIASES } from '../workloads/rpc_gateway/providers.js';

const PROBE_INTERVAL = 60000; // 60s
const PROBE_TIMEOUT = 5000;
const CASCADE_THRESHOLD = 0.5; // Alert if >50% providers fail

const FALLBACK_CHAINS = {
  polygon: ['polygon-amoy'],
  'polygon-amoy': ['polygon'],
  ethereum: ['arbitrum', 'base'],
  arbitrum: ['ethereum', 'base'],
  base: ['ethereum', 'arbitrum']
};

export async function probeProvider(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) return { healthy: false, error: `HTTP ${response.status}` };

    const result = await response.json();
    if (result.error) return { healthy: false, error: result.error.message };

    return { healthy: true, blockNumber: result.result };
  } catch (e) {
    clearTimeout(timeout);
    return { healthy: false, error: e.message };
  }
}

export async function getFailedProviders(chain) {
  const providers = getProviders(chain);
  const failed = [];

  for (const p of providers) {
    const stats = await getCircuitStats(chain, p.id);
    if (stats.state === STATE.OPEN) {
      failed.push({ ...p, circuit: stats });
    }
  }

  return failed;
}

export async function healProvider(chain, provider) {
  const probe = await probeProvider(provider.url);

  if (probe.healthy) {
    await forceClose(chain, provider.id);
    console.log(`[RPC-Healer] ${provider.id} recovered — circuit closed`);
    return { healed: true, provider: provider.id };
  }

  return { healed: false, provider: provider.id, error: probe.error };
}

export async function detectCascadeFailure(chain) {
  const providers = getProviders(chain);
  if (providers.length === 0) return { cascade: false };

  const failed = await getFailedProviders(chain);
  const failRatio = failed.length / providers.length;

  return {
    cascade: failRatio >= CASCADE_THRESHOLD,
    failedCount: failed.length,
    totalCount: providers.length,
    failRatio: (failRatio * 100).toFixed(1) + '%',
    failedProviders: failed.map(p => p.id)
  };
}

export function getFallbackChain(chain) {
  const normalized = CHAIN_ALIASES[chain] || chain;
  const fallbacks = FALLBACK_CHAINS[normalized] || [];
  return fallbacks[0] || null;
}

export async function tryFallbackRoute(chain, method, params, id) {
  const fallback = getFallbackChain(chain);
  if (!fallback) return null;

  const providers = getProviders(fallback);
  if (providers.length === 0) return null;

  for (const p of providers.slice(0, 3)) {
    const stats = await getCircuitStats(fallback, p.id);
    if (stats.state !== STATE.OPEN) {
      console.log(`[RPC-Healer] Routing ${chain} → ${fallback} via ${p.id}`);
      return { fallbackChain: fallback, provider: p };
    }
  }

  return null;
}

export async function getHealerStats(chain) {
  const providers = getProviders(chain);
  const stats = {
    chain,
    total: providers.length,
    healthy: 0,
    failing: 0,
    recovering: 0,
    providers: []
  };

  for (const p of providers) {
    const circuit = await getCircuitStats(chain, p.id);
    const status = circuit.state === STATE.CLOSED ? 'healthy' :
                   circuit.state === STATE.HALF_OPEN ? 'recovering' : 'failing';

    if (status === 'healthy') stats.healthy++;
    else if (status === 'recovering') stats.recovering++;
    else stats.failing++;

    stats.providers.push({
      id: p.id,
      status,
      failures: circuit.failures,
      timeUntilReset: circuit.timeUntilReset
    });
  }

  const cascade = await detectCascadeFailure(chain);
  stats.cascadeAlert = cascade.cascade;

  return stats;
}

export async function runHealingCycle(chains = ['polygon', 'polygon-amoy', 'ethereum', 'arbitrum', 'base']) {
  const results = {
    healed: [],
    stillFailing: [],
    cascadeAlerts: []
  };

  for (const chain of chains) {
    const cascade = await detectCascadeFailure(chain);
    if (cascade.cascade) {
      results.cascadeAlerts.push({ chain, ...cascade });
      console.log(`[RPC-Healer] CASCADE ALERT: ${chain} — ${cascade.failRatio} providers failing`);
    }

    const failed = await getFailedProviders(chain);
    for (const provider of failed) {
      const result = await healProvider(chain, provider);
      if (result.healed) {
        results.healed.push({ chain, provider: result.provider });
      } else {
        results.stillFailing.push({ chain, provider: result.provider, error: result.error });
      }
    }
  }

  return results;
}

export async function startRpcHealer(redis) {
  console.log('[RPC-Healer] Started — probing failed providers every 60s');

  setInterval(async () => {
    try {
      const results = await runHealingCycle();

      if (results.healed.length > 0) {
        console.log(`[RPC-Healer] Healed ${results.healed.length} provider(s)`);
      }

      if (results.cascadeAlerts.length > 0) {
        for (const alert of results.cascadeAlerts) {
          await redis?.set(`healer:cascade:${alert.chain}`, JSON.stringify(alert), 'EX', 300);
        }
      }

      await redis?.set('healer:last_run', Date.now());
      await redis?.set('healer:last_results', JSON.stringify(results), 'EX', 300);
    } catch (e) {
      console.error('[RPC-Healer] Error:', e.message);
    }
  }, PROBE_INTERVAL);
}

export { PROBE_INTERVAL, CASCADE_THRESHOLD, FALLBACK_CHAINS };
