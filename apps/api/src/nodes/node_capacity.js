/**
 * Node Capacity Tracker
 *
 * Tracks the available compute capacity (0–100 units) for every registered
 * node.  The scheduler consumes this module to decide where to route jobs;
 * the heartbeat module writes back real-time capacity readings.
 */

export class NodeCapacity {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Update available capacity for a node.
     * Reflects the latest capacity_available value received from a heartbeat.
     *
     * @param {string} node_id
     * @param {number} capacity_available  - units of spare compute (0–100)
     */
    update(node_id, capacity_available) {
        const cap = Math.max(0, Number(capacity_available) || 0);
        if (this.registry) {
            this.registry.setCapacity(node_id, cap);
        }
        return { node_id, capacity_available: cap };
    }

    /**
     * Return nodes sorted by available capacity descending.
     * Used by the scheduler to pick the best-capacity node.
     *
     * @returns {Array} list of node objects ordered by capacity
     */
    getAvailableNodes() {
        if (!this.registry) return [];
        const active = this.registry.list('ACTIVE');
        return active
            .filter(n => n.capacity > 0)
            .sort((a, b) => b.capacity - a.capacity);
    }

    /**
     * Aggregate snapshot consumed by the metrics layer.
     */
    summary() {
        if (!this.registry) return { total_nodes: 0, active_nodes: 0, capacity_available: 0 };
        return this.registry.getMetrics();
    }
}
