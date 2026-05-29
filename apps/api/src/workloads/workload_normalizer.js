/**
 * Workload Normalizer (Module 4)
 *
 * Converts all three Day-1 workload types into the canonical internal format:
 *   { op_type, target, payload, reward }
 *
 * Then wraps that into a JobScheduler-compatible job object:
 *   { id, type, chain, reward, payload, priority, client_id, is_universal_op, is_demand_job }
 *
 * Pricing defaults (USD):
 *   rpc_call          0.0005
 *   webhook_delivery  0.001
 *   automation_job    0.002
 */

import crypto from 'crypto';

const REWARD_TABLE = {
    rpc_call: 0.0005,
    webhook_delivery: 0.001,
    automation_job: 0.002
};

const PRIORITY_TABLE = {
    rpc_call: 'developer',
    webhook_delivery: 'free',
    automation_job: 'free'
};

/**
 * Normalise any workload into the canonical { op_type, target, payload, reward } shape.
 *
 * @param {'rpc_call'|'webhook_delivery'|'automation_job'} op_type
 * @param {string}  target
 * @param {Object}  payload
 * @param {number}  [rewardOverride]
 * @returns {{ op_type, target, payload, reward }}
 */
export function normalizeWorkload(op_type, target, payload, rewardOverride) {
    if (!op_type) throw new Error('[Normalizer] op_type is required');
    if (!target) throw new Error('[Normalizer] target is required');
    if (!payload || typeof payload !== 'object') throw new Error('[Normalizer] payload must be an object');

    const reward = typeof rewardOverride === 'number' && rewardOverride > 0
        ? rewardOverride
        : (REWARD_TABLE[op_type] ?? 0.001);

    return { op_type, target, payload, reward };
}

/**
 * Convert a normalised workload into a ready-to-queue job object.
 *
 * @param {{ op_type, target, payload, reward }} workload
 * @param {string} [clientId]
 * @returns {Object} job compatible with JobQueue.push_job()
 */
export function workloadToJob(workload, clientId = 'workload_engine') {
    const { op_type, target, payload, reward } = workload;
    return {
        id: `wl_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        type: op_type,
        chain: target === 'generic' ? null : target,
        reward,
        payload,
        priority: PRIORITY_TABLE[op_type] ?? 'free',
        client_id: clientId,
        is_universal_op: true,
        is_demand_job: true
    };
}
