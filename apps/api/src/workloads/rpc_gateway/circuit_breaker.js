/**
 * Circuit Breaker for RPC Providers
 * S1-RPC-003: 3-state circuit breaker with in-memory state
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Provider failing, immediately skip to next
 * - HALF_OPEN: Testing if provider recovered (1 test request)
 *
 * Transitions:
 * - CLOSED → OPEN: after FAILURE_THRESHOLD consecutive failures
 * - OPEN → HALF_OPEN: after RESET_TIMEOUT_MS
 * - HALF_OPEN → CLOSED: on success
 * - HALF_OPEN → OPEN: on failure
 *
 * Storage: In-memory Map (no Redis dependency)
 * - Faster than Redis (no network hop during failure cascade)
 * - Each server tracks provider health independently (standard practice)
 * - Saves 3-4 Redis commands per RPC call
 */

import { CHAIN_ALIASES } from './providers.js';

const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT_MS = 30000;
const CIRCUIT_TTL_MS = 60 * 60 * 1000; // 1 hour - cleanup stale entries

const STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

// In-memory circuit state storage (replaces Redis)
// Key: "chain:providerId" → { state, failures, lastFailure, lastTest, updatedAt }
const circuits = new Map();

// Cleanup stale circuit entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupHandle = null;

function startCleanup() {
  if (cleanupHandle) return;

  cleanupHandle = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, circuit] of circuits) {
      // Remove circuits that haven't been updated in over an hour
      // and are in CLOSED state (healthy)
      if (circuit.state === STATE.CLOSED &&
          circuit.updatedAt &&
          now - circuit.updatedAt > CIRCUIT_TTL_MS) {
        circuits.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[CircuitBreaker] Cleaned ${cleaned} stale entries`);
    }
  }, CLEANUP_INTERVAL_MS);

  cleanupHandle.unref?.();
}

// Start cleanup on module load
startCleanup();

function getCircuitKey(chain, providerId) {
  const normalized = CHAIN_ALIASES[chain] || chain;
  return `${normalized}:${providerId}`;
}

function getCircuitState(chain, providerId) {
  const key = getCircuitKey(chain, providerId);
  const circuit = circuits.get(key);

  if (!circuit) {
    return { state: STATE.CLOSED, failures: 0, lastFailure: 0, lastTest: 0 };
  }

  return circuit;
}

function setCircuitState(chain, providerId, circuitState) {
  const key = getCircuitKey(chain, providerId);
  circuits.set(key, {
    ...circuitState,
    updatedAt: Date.now()
  });
}

export async function isOpen(chain, providerId) {
  const circuit = getCircuitState(chain, providerId);
  const now = Date.now();

  if (circuit.state === STATE.CLOSED) {
    return false;
  }

  if (circuit.state === STATE.OPEN) {
    if (now - circuit.lastFailure >= RESET_TIMEOUT_MS) {
      const newState = {
        ...circuit,
        state: STATE.HALF_OPEN,
        lastTest: now
      };
      setCircuitState(chain, providerId, newState);
      console.log(`[CircuitBreaker] ${providerId}: OPEN → HALF_OPEN (testing)`);
      return false;
    }
    return true;
  }

  if (circuit.state === STATE.HALF_OPEN) {
    return false;
  }

  return false;
}

export async function recordSuccess(chain, providerId) {
  const circuit = getCircuitState(chain, providerId);

  if (circuit.state === STATE.HALF_OPEN) {
    console.log(`[CircuitBreaker] ${providerId}: HALF_OPEN → CLOSED (recovered)`);
  }

  setCircuitState(chain, providerId, {
    state: STATE.CLOSED,
    failures: 0,
    lastFailure: 0,
    lastTest: 0
  });
}

export async function recordFailure(chain, providerId) {
  const circuit = getCircuitState(chain, providerId);
  const now = Date.now();

  if (circuit.state === STATE.HALF_OPEN) {
    console.log(`[CircuitBreaker] ${providerId}: HALF_OPEN → OPEN (still failing)`);
    setCircuitState(chain, providerId, {
      state: STATE.OPEN,
      failures: circuit.failures + 1,
      lastFailure: now,
      lastTest: circuit.lastTest
    });
    return;
  }

  const newFailures = circuit.failures + 1;

  if (newFailures >= FAILURE_THRESHOLD) {
    console.log(`[CircuitBreaker] ${providerId}: CLOSED → OPEN (${newFailures} failures)`);
    setCircuitState(chain, providerId, {
      state: STATE.OPEN,
      failures: newFailures,
      lastFailure: now,
      lastTest: 0
    });
  } else {
    setCircuitState(chain, providerId, {
      state: STATE.CLOSED,
      failures: newFailures,
      lastFailure: now,
      lastTest: 0
    });
  }
}

export async function getCircuitStats(chain, providerId) {
  const circuit = getCircuitState(chain, providerId);
  const now = Date.now();

  let effectiveState = circuit.state;
  if (circuit.state === STATE.OPEN && now - circuit.lastFailure >= RESET_TIMEOUT_MS) {
    effectiveState = STATE.HALF_OPEN;
  }

  return {
    state: effectiveState,
    failures: circuit.failures,
    lastFailure: circuit.lastFailure,
    lastTest: circuit.lastTest,
    timeUntilReset: circuit.state === STATE.OPEN
      ? Math.max(0, RESET_TIMEOUT_MS - (now - circuit.lastFailure))
      : 0
  };
}

export async function forceOpen(chain, providerId) {
  setCircuitState(chain, providerId, {
    state: STATE.OPEN,
    failures: FAILURE_THRESHOLD,
    lastFailure: Date.now(),
    lastTest: 0
  });
  console.log(`[CircuitBreaker] ${providerId}: FORCED OPEN`);
}

export async function forceClose(chain, providerId) {
  setCircuitState(chain, providerId, {
    state: STATE.CLOSED,
    failures: 0,
    lastFailure: 0,
    lastTest: 0
  });
  console.log(`[CircuitBreaker] ${providerId}: FORCED CLOSED`);
}

// For testing/admin
export function getMemoryStats() {
  let open = 0, closed = 0, halfOpen = 0;

  for (const circuit of circuits.values()) {
    if (circuit.state === STATE.OPEN) open++;
    else if (circuit.state === STATE.HALF_OPEN) halfOpen++;
    else closed++;
  }

  return {
    total: circuits.size,
    open,
    closed,
    halfOpen
  };
}

export function stopCleanup() {
  if (cleanupHandle) {
    clearInterval(cleanupHandle);
    cleanupHandle = null;
  }
}

export { STATE, FAILURE_THRESHOLD, RESET_TIMEOUT_MS };
