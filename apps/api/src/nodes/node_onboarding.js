/**
 * Node Onboarding Service (Module 4)
 *
 * Handles the full node operator onboarding flow.
 * Returns everything a new operator needs to get started.
 *
 * Primary endpoint: POST /v1/node/register  (supplements existing /v1/node/register)
 * This route is mounted under the growth layer at a separate path:
 *   POST /v1/growth/onboard
 * and returns richer bootstrap data than the base node_network route.
 *
 * Integration:
 *   - Writes to node_registry via NodeRegistry (from node_network layer)
 *   - Writes an entry to node_growth_stats via NodeLeaderboard
 *   - Applies first-join incentive preview via NodeIncentiveEngine
 */

import { NodeRegistry } from '../nodes/node_registry.js';
import { NodeLeaderboard } from '../monitoring/node_leaderboard.js';
import { NodeIncentiveEngine } from '../economics/node_incentives.js';

export class NodeOnboardingService {
    constructor(db) {
        this.db = db;
        this.registry = new NodeRegistry(db);
        this.leaderboard = new NodeLeaderboard(db);
        this.incentives = new NodeIncentiveEngine(db, this.registry, this.leaderboard);
    }

    /**
     * Register a new node operator and return full bootstrap package.
     *
     * @param {Object} opts
     * @param {string} opts.node_id      — unique node identifier
     * @param {string} [opts.node_type]  — 'community' | 'genesis'
     * @param {string} [opts.region]     — deployment region
     * @param {number} [opts.capacity]   — initial compute units
     * @returns {Object} bootstrap package
     */
    onboard({ node_id, node_type = 'community', region = 'global', capacity = 10 }) {
        if (!node_id) throw new Error('[NodeOnboarding] node_id is required');

        // 1. Register in node_registry
        const node = this.registry.register({ node_id, node_type, region, capacity });

        // 2. Seed leaderboard entry (0 jobs so far)
        try {
            this.leaderboard.recordJob(node_id, 0); // creates row without incrementing jobs
        } catch (_) { /* non-fatal */ }

        // 3. Preview incentives
        const incentivePreview = this.incentives.evaluate(node_id);

        // 4. Network position
        const networkStats = this._networkPosition(node_id);

        return {
            ok: true,
            node_id,
            status: node.status,
            node_type,
            region,
            capacity,
            registered_at: node.created_at,

            // Operator bootstrap package
            bootstrap: {
                instructions: this._bootstrapInstructions(node_id),
                configuration: this._nodeConfig(node_id, node_type, region),
            },

            // Growth incentives preview
            incentives: {
                current_multiplier: incentivePreview.multiplier,
                active_bonuses: incentivePreview.bonuses,
                breakdown: incentivePreview.breakdown
            },

            // Network context
            network: networkStats
        };
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    _bootstrapInstructions(node_id) {
        return [
            `1. Install the Satelink Node Agent: npm install -g @satelink/node-agent`,
            `2. Configure your node ID: satelink-agent configure --node-id ${node_id}`,
            `3. Start the agent: satelink-agent start`,
            `4. Send your first heartbeat: POST /v1/node/heartbeat with node_id="${node_id}"`,
            `5. Monitor earnings: GET /v1/nodes/leaderboard`
        ];
    }

    _nodeConfig(node_id, node_type, region) {
        return {
            node_id,
            node_type,
            region,
            heartbeat_interval_seconds: 30,
            heartbeat_endpoint: 'POST /v1/node/heartbeat',
            rpc_endpoint: 'POST /v1/workload/rpc/:chain',
            metrics_endpoint: 'GET /v1/network/metrics',
            leaderboard_endpoint: 'GET /v1/services/nodes/leaderboard',
            supported_op_types: ['rpc_call', 'webhook_delivery', 'automation_job', 'ai_inference']
        };
    }

    _networkPosition(node_id) {
        try {
            const total = this.db.prepare('SELECT COUNT(*) as c FROM node_registry').get()?.c || 0;
            const rank = this.db.prepare(`
                SELECT COUNT(*) AS pos FROM node_registry
                WHERE created_at <= (SELECT created_at FROM node_registry WHERE node_id = ?)
            `).get(node_id)?.pos || total;

            return {
                total_nodes: total,
                your_position: rank,
                early_node: rank <= 100
            };
        } catch (_) {
            return { total_nodes: 0, your_position: 1, early_node: true };
        }
    }
}
