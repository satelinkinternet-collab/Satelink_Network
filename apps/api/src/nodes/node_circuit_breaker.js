/**
 * Per-Node Circuit Breaker
 *
 * Tracks failure rates per node and opens circuit when failure threshold is exceeded.
 * States: CLOSED (normal) → OPEN (blocked) → HALF_OPEN (testing) → CLOSED
 *
 * In-memory for speed, with periodic DB persistence for durability.
 */

const FAILURE_THRESHOLD = 5;        // failures before opening circuit
const WINDOW_MS = 60_000;           // 1-minute rolling window
const OPEN_DURATION_MS = 300_000;   // 5 minutes before half-open
const HALF_OPEN_MAX_TRIALS = 2;     // successful trials to close

export class NodeCircuitBreaker {
    constructor(db) {
        this.db = db;
        this._states = new Map(); // nodeId → { state, failures: [], openedAt, halfOpenSuccesses }
        this._ensureTable();
        this._loadFromDb();
    }

    /**
     * Check if a node is allowed to receive jobs.
     * @param {string} nodeId
     * @returns {{ allowed: boolean, state: string }}
     */
    check(nodeId) {
        const entry = this._getOrCreate(nodeId);

        if (entry.state === 'CLOSED') {
            return { allowed: true, state: 'CLOSED' };
        }

        if (entry.state === 'OPEN') {
            // Check if enough time has passed to transition to half-open
            if (Date.now() - entry.openedAt >= OPEN_DURATION_MS) {
                entry.state = 'HALF_OPEN';
                entry.halfOpenSuccesses = 0;
                this._persist(nodeId, entry);
                return { allowed: true, state: 'HALF_OPEN' };
            }
            return { allowed: false, state: 'OPEN' };
        }

        // HALF_OPEN — allow limited traffic for testing
        return { allowed: true, state: 'HALF_OPEN' };
    }

    /**
     * Record a successful execution for a node.
     * @param {string} nodeId
     */
    recordSuccess(nodeId) {
        const entry = this._getOrCreate(nodeId);

        if (entry.state === 'HALF_OPEN') {
            entry.halfOpenSuccesses++;
            if (entry.halfOpenSuccesses >= HALF_OPEN_MAX_TRIALS) {
                entry.state = 'CLOSED';
                entry.failures = [];
                entry.halfOpenSuccesses = 0;
                console.log(`[NodeCircuitBreaker] ${nodeId} circuit CLOSED (recovered)`);
            }
            this._persist(nodeId, entry);
        }
    }

    /**
     * Record a failure for a node. Opens circuit if threshold exceeded.
     * @param {string} nodeId
     */
    recordFailure(nodeId) {
        const entry = this._getOrCreate(nodeId);
        const now = Date.now();

        if (entry.state === 'HALF_OPEN') {
            // Any failure in half-open → back to open
            entry.state = 'OPEN';
            entry.openedAt = now;
            entry.halfOpenSuccesses = 0;
            console.log(`[NodeCircuitBreaker] ${nodeId} circuit re-OPENED (half-open failure)`);
            this._persist(nodeId, entry);
            return;
        }

        // Sliding window: remove old failures
        entry.failures = entry.failures.filter(ts => now - ts < WINDOW_MS);
        entry.failures.push(now);

        if (entry.failures.length >= FAILURE_THRESHOLD && entry.state === 'CLOSED') {
            entry.state = 'OPEN';
            entry.openedAt = now;
            console.log(`[NodeCircuitBreaker] ${nodeId} circuit OPENED (${entry.failures.length} failures in ${WINDOW_MS}ms)`);
        }

        this._persist(nodeId, entry);
    }

    /**
     * Get circuit state for all tracked nodes.
     * @returns {Array<{ node_id, state, failure_count, opened_at }>}
     */
    getAll() {
        const result = [];
        for (const [nodeId, entry] of this._states) {
            result.push({
                node_id: nodeId,
                state: entry.state,
                failure_count: entry.failures.length,
                opened_at: entry.openedAt || null
            });
        }
        return result;
    }

    // ── Private ──────────────────────────────────────────────────────

    _getOrCreate(nodeId) {
        if (!this._states.has(nodeId)) {
            this._states.set(nodeId, {
                state: 'CLOSED',
                failures: [],
                openedAt: null,
                halfOpenSuccesses: 0
            });
        }
        return this._states.get(nodeId);
    }

    _ensureTable() {
        try {
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS node_circuit_state (
                    node_id TEXT PRIMARY KEY,
                    state TEXT NOT NULL DEFAULT 'CLOSED',
                    failure_count INTEGER NOT NULL DEFAULT 0,
                    opened_at INTEGER,
                    updated_at INTEGER NOT NULL
                )
            `).run();
        } catch (e) { /* non-fatal */ }
    }

    _loadFromDb() {
        try {
            const rows = this.db.prepare('SELECT * FROM node_circuit_state').all();
            for (const row of rows) {
                this._states.set(row.node_id, {
                    state: row.state,
                    failures: [],
                    openedAt: row.opened_at,
                    halfOpenSuccesses: 0
                });
            }
        } catch (e) { /* non-fatal */ }
    }

    _persist(nodeId, entry) {
        try {
            this.db.prepare(`
                INSERT INTO node_circuit_state (node_id, state, failure_count, opened_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(node_id) DO UPDATE SET
                    state = excluded.state,
                    failure_count = excluded.failure_count,
                    opened_at = excluded.opened_at,
                    updated_at = excluded.updated_at
            `).run(nodeId, entry.state, entry.failures.length, entry.openedAt, Date.now());
        } catch (e) { /* non-fatal */ }
    }
}
