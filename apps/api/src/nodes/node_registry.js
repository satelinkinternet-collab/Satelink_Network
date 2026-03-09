/**
 * Node Registry
 * Centralized store for all node metadata, registration, and status tracking.
 */

export class NodeRegistry {
    constructor(db) {
        this.db = db;
        this._ensureTable();
    }

    _ensureTable() {
        try {
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS node_registry (
                    node_id     TEXT PRIMARY KEY,
                    node_type   TEXT NOT NULL DEFAULT 'community',
                    region      TEXT NOT NULL DEFAULT 'global',
                    capacity    REAL NOT NULL DEFAULT 10,
                    reputation  REAL NOT NULL DEFAULT 100,
                    status      TEXT NOT NULL DEFAULT 'ACTIVE',
                    created_at  INTEGER NOT NULL
                )
            `).run();
        } catch (e) {
            console.warn('[NodeRegistry] Table init warning:', e.message);
        }
    }

    /**
     * Register (or upsert) a node.
     * @param {Object} opts
     * @param {string} opts.node_id
     * @param {string} [opts.node_type]   - 'community' | 'genesis' | 'external'
     * @param {string} [opts.region]
     * @param {number} [opts.capacity]
     * @returns {Object} registered node
     */
    register({ node_id, node_type = 'community', region = 'global', capacity = 10 }) {
        if (!node_id) throw new Error('[NodeRegistry] node_id is required');

        const now = Date.now();
        this.db.prepare(`
            INSERT INTO node_registry (node_id, node_type, region, capacity, reputation, status, created_at)
            VALUES (?, ?, ?, ?, 100, 'ACTIVE', ?)
            ON CONFLICT(node_id) DO UPDATE SET
                node_type  = excluded.node_type,
                region     = excluded.region,
                capacity   = excluded.capacity,
                status     = 'ACTIVE'
        `).run(node_id, node_type, region, capacity, now);

        return this.get(node_id);
    }

    /**
     * Fetch a single node by id.
     */
    get(node_id) {
        try {
            return this.db.prepare('SELECT * FROM node_registry WHERE node_id = ?').get(node_id) || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Fetch all nodes, optionally filtered by status.
     * @param {string|null} status  - 'ACTIVE' | 'INACTIVE' | null (all)
     */
    list(status = null) {
        try {
            if (status) {
                return this.db.prepare('SELECT * FROM node_registry WHERE status = ?').all(status);
            }
            return this.db.prepare('SELECT * FROM node_registry').all();
        } catch (e) {
            return [];
        }
    }

    /**
     * Update status for a node.
     * @param {string} node_id
     * @param {string} status  - 'ACTIVE' | 'INACTIVE' | 'DEGRADED'
     */
    setStatus(node_id, status) {
        try {
            this.db.prepare('UPDATE node_registry SET status = ? WHERE node_id = ?').run(status, node_id);
        } catch (e) {
            console.warn('[NodeRegistry] setStatus failed:', e.message);
        }
    }

    /**
     * Update reputation score.
     */
    setReputation(node_id, reputation) {
        try {
            this.db.prepare('UPDATE node_registry SET reputation = ? WHERE node_id = ?')
                .run(Math.max(0, Math.min(100, reputation)), node_id);
        } catch (e) {
            console.warn('[NodeRegistry] setReputation failed:', e.message);
        }
    }

    /**
     * Update available capacity.
     */
    setCapacity(node_id, capacity) {
        try {
            this.db.prepare('UPDATE node_registry SET capacity = ? WHERE node_id = ?')
                .run(Math.max(0, capacity), node_id);
        } catch (e) {
            console.warn('[NodeRegistry] setCapacity failed:', e.message);
        }
    }

    /**
     * Returns summary metrics for the node network.
     */
    getMetrics() {
        try {
            const all = this.list();
            const active = all.filter(n => n.status === 'ACTIVE');
            const totalCap = active.reduce((sum, n) => sum + (n.capacity || 0), 0);
            return {
                total_nodes: all.length,
                active_nodes: active.length,
                capacity_available: totalCap
            };
        } catch (e) {
            return { total_nodes: 0, active_nodes: 0, capacity_available: 0 };
        }
    }
}
