/**
 * Compatibility Gateway
 *
 * Provides drop-in compatible HTTP endpoints for common infrastructure APIs.
 * All traffic must be intentionally sent to Satelink endpoints.
 *
 * Supported API surfaces:
 *   POST /rpc/eth           — Ethereum JSON-RPC (eth_call, eth_blockNumber, eth_getBalance, eth_getLogs)
 *   POST /compute/job       — Generic compute jobs (ai_inference, data_processing)
 *   POST /webhook/execute   — Webhook event processing
 *
 * Pipeline:
 *   Incoming request → normalize → abuse_firewall check → DemandBuffer.enqueue()
 *
 * Does NOT modify demand_buffer, execution_router, abuse_firewall,
 * reputation_engine, or economic_ledger.
 */

import { DemandBuffer } from '../queue/demand_buffer.js';
import { GatewayAbuseFirewall } from './compatibility/abuse_firewall.js';
import { normalizeEthRpc, normalizeComputeJob, normalizeWebhook } from './compatibility/normalizers.js';

// Ethereum RPC methods the gateway will accept
const ALLOWED_ETH_METHODS = new Set([
    'eth_call', 'eth_blockNumber', 'eth_getBalance', 'eth_getLogs',
    'eth_getTransactionReceipt', 'eth_getTransactionByHash', 'eth_gasPrice',
    'eth_chainId', 'net_version', 'eth_estimateGas'
]);

export class CompatibilityGateway {
    /**
     * @param {DemandBuffer} demandBuffer
     * @param {Object}       [opts]
     * @param {boolean}      [opts.paused]   — start paused
     */
    constructor(demandBuffer, opts = {}) {
        if (!demandBuffer) throw new Error('[CompatibilityGateway] demandBuffer is required');

        this.buffer = demandBuffer;
        this.firewall = new GatewayAbuseFirewall();
        this._paused = opts.paused ?? false;

        this._stats = {
            total_requests: 0,
            total_accepted: 0,
            total_rejected: 0,
            rejected_by_type: { rpc: 0, compute: 0, webhook: 0 },
            accepted_by_type: { rpc: 0, compute: 0, webhook: 0 },
            firewall_blocks: 0,
            clients: new Map()   // client_id → { requests, accepted, last_seen }
        };
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    pause() { this._paused = true; }
    resume() { this._paused = false; }
    get isPaused() { return this._paused; }

    /**
     * Handle Ethereum JSON-RPC request.
     *
     * @param {Object} body        — raw JSON-RPC request body
     * @param {string} clientId    — caller identifier
     * @returns {{ ok, result?, error?, code? }}
     */
    handleEthRpc(body, clientId = 'anonymous') {
        this._stats.total_requests++;

        if (this._paused) return { ok: false, error: 'gateway paused', code: 503 };

        // Validate JSON-RPC structure
        if (!body?.method) {
            this._reject('rpc', clientId);
            return { ok: false, error: 'invalid JSON-RPC: method required', code: 400 };
        }

        if (!ALLOWED_ETH_METHODS.has(body.method)) {
            this._reject('rpc', clientId);
            return { ok: false, error: `method not supported: ${body.method}`, code: 400 };
        }

        // Abuse firewall check
        const fireResult = this.firewall.check(clientId, 'rpc');
        if (!fireResult.ok) {
            this._stats.firewall_blocks++;
            this._reject('rpc', clientId);
            return { ok: false, error: fireResult.reason, code: 429 };
        }

        // Normalize → DemandBuffer
        const workload = normalizeEthRpc(body, clientId);
        const enqResult = this.buffer.enqueue(workload, 'rpc');

        if (!enqResult.accepted) {
            this._reject('rpc', clientId);
            return { ok: false, error: enqResult.reason, code: 429 };
        }

        this._accept('rpc', clientId);
        return { ok: true, result: { queued: true, job_type: 'rpc_call', method: body.method } };
    }

    /**
     * Handle generic compute job.
     *
     * @param {Object} body     — { type, model?, input }
     * @param {string} clientId
     * @returns {{ ok, result?, error?, code? }}
     */
    handleComputeJob(body, clientId = 'anonymous') {
        this._stats.total_requests++;

        if (this._paused) return { ok: false, error: 'gateway paused', code: 503 };

        const ALLOWED_TYPES = new Set(['ai_inference', 'data_processing', 'embedding', 'llm_completion']);
        if (!body?.type || !ALLOWED_TYPES.has(body.type)) {
            this._reject('compute', clientId);
            return { ok: false, error: `type must be one of: ${[...ALLOWED_TYPES].join(', ')}`, code: 400 };
        }

        const fireResult = this.firewall.check(clientId, 'compute');
        if (!fireResult.ok) {
            this._stats.firewall_blocks++;
            this._reject('compute', clientId);
            return { ok: false, error: fireResult.reason, code: 429 };
        }

        const workload = normalizeComputeJob(body, clientId);
        const enqResult = this.buffer.enqueue(workload, 'compute');

        if (!enqResult.accepted) {
            this._reject('compute', clientId);
            return { ok: false, error: enqResult.reason, code: 429 };
        }

        this._accept('compute', clientId);
        return { ok: true, result: { queued: true, job_type: 'ai_inference', model: body.model } };
    }

    /**
     * Handle webhook event.
     *
     * @param {Object} body     — { url?, event?, payload? }
     * @param {string} clientId
     * @returns {{ ok, result?, error?, code? }}
     */
    handleWebhook(body, clientId = 'anonymous') {
        this._stats.total_requests++;

        if (this._paused) return { ok: false, error: 'gateway paused', code: 503 };

        if (!body || typeof body !== 'object') {
            this._reject('webhook', clientId);
            return { ok: false, error: 'body must be a JSON object', code: 400 };
        }

        const fireResult = this.firewall.check(clientId, 'webhook');
        if (!fireResult.ok) {
            this._stats.firewall_blocks++;
            this._reject('webhook', clientId);
            return { ok: false, error: fireResult.reason, code: 429 };
        }

        const workload = normalizeWebhook(body, clientId);
        const enqResult = this.buffer.enqueue(workload, 'webhook');

        if (!enqResult.accepted) {
            this._reject('webhook', clientId);
            return { ok: false, error: enqResult.reason, code: 429 };
        }

        this._accept('webhook', clientId);
        return { ok: true, result: { queued: true, job_type: 'webhook_delivery' } };
    }

    // ─── Stats ────────────────────────────────────────────────────────────────

    getStats() {
        return {
            total_requests: this._stats.total_requests,
            total_accepted: this._stats.total_accepted,
            total_rejected: this._stats.total_rejected,
            firewall_blocks: this._stats.firewall_blocks,
            accepted_by_type: { ...this._stats.accepted_by_type },
            rejected_by_type: { ...this._stats.rejected_by_type },
            buffer_depth: this.buffer.size(),
            paused: this._paused
        };
    }

    getClients() {
        return [...this._stats.clients.entries()].map(([id, c]) => ({ client_id: id, ...c }));
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    _accept(type, clientId) {
        this._stats.total_accepted++;
        this._stats.accepted_by_type[type] = (this._stats.accepted_by_type[type] || 0) + 1;
        this._touchClient(clientId, true);
    }

    _reject(type, clientId) {
        this._stats.total_rejected++;
        this._stats.rejected_by_type[type] = (this._stats.rejected_by_type[type] || 0) + 1;
        this._touchClient(clientId, false);
    }

    _touchClient(clientId, accepted) {
        const existing = this._stats.clients.get(clientId) || { requests: 0, accepted: 0, rejected: 0, last_seen: 0 };
        existing.requests++;
        if (accepted) existing.accepted++; else existing.rejected++;
        existing.last_seen = Date.now();
        this._stats.clients.set(clientId, existing);
    }
}
