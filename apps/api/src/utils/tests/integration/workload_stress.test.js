/**
 * Stage 7 — Network Stress Tests
 *
 * Tests all workload types under load to verify:
 *   - Input validation holds under rapid requests
 *   - Queue backpressure activates correctly
 *   - Circuit breakers trip and recover
 *   - Revenue attribution records correctly
 *   - No crashes under concurrent load
 *
 * Run: node --test apps/api/src/utils/tests/integration/workload_stress.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import Database from 'better-sqlite3';
import { createRpcGateway } from '../../../workloads/rpc_gateway/rpc_gateway.js';
import { createWebhookRouter } from '../../../workloads/webhook_delivery/webhook_worker.js';
import { createAiRouter } from '../../../gateway/routes/ai_api.js';
import { AutomationScheduler, createAutomationRouter } from '../../../workloads/automation_jobs/automation_scheduler.js';
import { NodeCircuitBreaker } from '../../../nodes/node_circuit_breaker.js';
import { WorkloadMetrics } from '../../../workloads/workload_metrics.js';
import { DemandBuffer } from '../../../queue/demand_buffer.js';

// ── Test Helpers ─────────────────────────────────────────────────────────

function createTestDb() {
    const db = new Database(':memory:');
    db.pragma('journal_mode = WAL');

    // Minimal tables for testing
    db.exec(`
        CREATE TABLE IF NOT EXISTS job_queue_log (
            job_id TEXT PRIMARY KEY,
            client_id TEXT,
            job_type TEXT,
            payload TEXT,
            priority TEXT,
            reward REAL,
            status TEXT DEFAULT 'QUEUED',
            route TEXT DEFAULT 'INTERNAL',
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS workload_metrics (
            key TEXT PRIMARY KEY,
            value REAL NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS node_circuit_state (
            node_id TEXT PRIMARY KEY,
            state TEXT NOT NULL DEFAULT 'CLOSED',
            failure_count INTEGER NOT NULL DEFAULT 0,
            opened_at INTEGER,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS automation_jobs (
            job_id TEXT PRIMARY KEY,
            job_type TEXT NOT NULL,
            schedule TEXT NOT NULL,
            interval_ms INTEGER NOT NULL,
            payload TEXT NOT NULL DEFAULT '{}',
            status TEXT NOT NULL DEFAULT 'active',
            created_at INTEGER NOT NULL,
            last_fire INTEGER
        );
    `);

    // Mock db.query for compatibility
    db.query = (sql, params) => {
        const stmt = db.prepare(sql);
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            return params ? stmt.all(...params) : stmt.all();
        }
        return params ? stmt.run(...params) : stmt.run();
    };

    return db;
}

function postJson(server, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const addr = server.address();
        const req = http.request({
            hostname: '127.0.0.1',
            port: addr.port,
            path,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': data.length, ...headers }
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
                catch { resolve({ status: res.statusCode, body }); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function getJson(server, path) {
    return new Promise((resolve, reject) => {
        const addr = server.address();
        http.get({ hostname: '127.0.0.1', port: addr.port, path }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
                catch { resolve({ status: res.statusCode, body }); }
            });
        }).on('error', reject);
    });
}

// ── Test Suite ───────────────────────────────────────────────────────────

describe('Stage 7: Workload Stress Tests', () => {
    let db, app, server;

    before((_, done) => {
        db = createTestDb();
        app = express();
        app.use(express.json());
        app.use('/rpc', createRpcGateway(db));
        app.use('/webhook', createWebhookRouter(db));
        app.use('/ai', createAiRouter(db));
        const scheduler = new AutomationScheduler(db);
        app.use('/automation', createAutomationRouter(scheduler));
        server = app.listen(0, done);
    });

    after((_, done) => {
        server.close(done);
        db.close();
    });

    // ── RPC Stress Tests ──────────────────────────────────────────────

    describe('RPC Gateway', () => {
        it('accepts valid JSON-RPC 2.0 requests', async () => {
            const res = await postJson(server, '/rpc/ethereum', {
                jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1
            });
            assert.equal(res.status, 202);
            assert.equal(res.body.ok, true);
            assert.ok(res.body.job_id);
        });

        it('rejects unsupported chains', async () => {
            const res = await postJson(server, '/rpc/solana', {
                jsonrpc: '2.0', method: 'getSlot', params: [], id: 1
            });
            assert.equal(res.status, 400);
            assert.match(res.body.error, /Unsupported chain/);
        });

        it('rejects invalid JSON-RPC format', async () => {
            const res = await postJson(server, '/rpc/ethereum', { method: 'test' });
            assert.equal(res.status, 400);
            assert.match(res.body.error, /Invalid JSON-RPC/);
        });

        it('handles rapid concurrent requests', async () => {
            const promises = Array.from({ length: 20 }, (_, i) =>
                postJson(server, '/rpc/polygon', {
                    jsonrpc: '2.0', method: 'eth_getBalance', params: [`0x${'a'.repeat(40)}`, 'latest'], id: i
                })
            );
            const results = await Promise.all(promises);
            const accepted = results.filter(r => r.status === 202);
            assert.ok(accepted.length > 0, 'At least some requests should be accepted');
        });

        it('validates all supported chains', async () => {
            for (const chain of ['ethereum', 'polygon', 'fuse', 'arbitrum', 'bsc', 'base']) {
                const res = await postJson(server, `/rpc/${chain}`, {
                    jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1
                });
                assert.equal(res.status, 202, `Chain ${chain} should be accepted`);
            }
        });
    });

    // ── AI Inference Stress Tests ─────────────────────────────────────

    describe('AI Inference', () => {
        it('accepts valid inference request', async () => {
            const res = await postJson(server, '/ai/inference', {
                model: 'llama-3-8b', prompt: 'Hello world', client_id: 'test'
            });
            assert.equal(res.status, 202);
            assert.equal(res.body.model, 'llama-3-8b');
        });

        it('rejects unsupported model', async () => {
            const res = await postJson(server, '/ai/inference', {
                model: 'gpt-99', prompt: 'test'
            });
            assert.equal(res.status, 400);
            assert.match(res.body.error, /Unsupported model/);
        });

        it('rejects oversized prompt', async () => {
            const res = await postJson(server, '/ai/inference', {
                model: 'mistral-7b', prompt: 'x'.repeat(33000)
            });
            assert.equal(res.status, 400);
            assert.match(res.body.error, /max length/);
        });

        it('lists available models', async () => {
            const res = await getJson(server, '/ai/models');
            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.models));
            assert.ok(res.body.models.length >= 6);
        });
    });

    // ── Webhook Stress Tests ──────────────────────────────────────────

    describe('Webhook Delivery', () => {
        it('accepts valid webhook', async () => {
            const res = await postJson(server, '/webhook', {
                url: 'https://example.com/hook', payload: { event: 'test' }
            });
            assert.equal(res.status, 202);
        });

        it('blocks private IPs (SSRF protection)', async () => {
            for (const url of ['http://127.0.0.1/hook', 'http://10.0.0.1/hook', 'http://192.168.1.1/hook', 'http://localhost/hook']) {
                const res = await postJson(server, '/webhook', { url, payload: {} });
                assert.equal(res.status, 400, `Should block ${url}`);
                assert.match(res.body.error, /public endpoint/);
            }
        });

        it('validates retry policy', async () => {
            const res = await postJson(server, '/webhook', {
                url: 'https://example.com/hook',
                payload: { test: true },
                retry_policy: { max_retries: 3, backoff: 'exponential' }
            });
            assert.equal(res.status, 202);
        });

        it('rejects invalid URL', async () => {
            const res = await postJson(server, '/webhook', { url: 'not-a-url', payload: {} });
            assert.equal(res.status, 400);
        });
    });

    // ── Automation Stress Tests ───────────────────────────────────────

    describe('Automation Jobs', () => {
        it('registers a scheduled job', async () => {
            const res = await postJson(server, '/automation', {
                job_type: 'data_sync', schedule: 'hourly',
                payload: { steps: [{ action: 'http_request', url: 'https://api.example.com/data', method: 'GET' }] }
            });
            assert.equal(res.status, 201);
            assert.ok(res.body.job_id);
        });

        it('rejects invalid schedule', async () => {
            const res = await postJson(server, '/automation', {
                job_type: 'test', schedule: 'every_second', payload: {}
            });
            assert.equal(res.status, 400);
            assert.match(res.body.error, /invalid schedule/i);
        });

        it('validates automation steps with SSRF protection', async () => {
            const res = await postJson(server, '/automation/run', {
                steps: [{ action: 'http_request', url: 'http://127.0.0.1/internal' }]
            });
            assert.equal(res.status, 400);
            assert.match(res.body.error, /public endpoint/);
        });

        it('rejects too many steps', async () => {
            const steps = Array.from({ length: 11 }, () => ({
                action: 'http_request', url: 'https://example.com/api'
            }));
            const res = await postJson(server, '/automation/run', { steps });
            assert.equal(res.status, 400);
            assert.match(res.body.error, /Maximum 10/);
        });

        it('lists scheduled jobs', async () => {
            const res = await getJson(server, '/automation');
            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.jobs));
        });
    });

    // ── Circuit Breaker Tests ─────────────────────────────────────────

    describe('Node Circuit Breaker', () => {
        it('starts in CLOSED state', () => {
            const cb = new NodeCircuitBreaker(db);
            const result = cb.check('node_1');
            assert.equal(result.state, 'CLOSED');
            assert.equal(result.allowed, true);
        });

        it('opens after threshold failures', () => {
            const cb = new NodeCircuitBreaker(db);
            for (let i = 0; i < 5; i++) cb.recordFailure('node_2');
            const result = cb.check('node_2');
            assert.equal(result.state, 'OPEN');
            assert.equal(result.allowed, false);
        });

        it('recovers through HALF_OPEN after successes', () => {
            const cb = new NodeCircuitBreaker(db);
            // Open the circuit
            for (let i = 0; i < 5; i++) cb.recordFailure('node_3');
            assert.equal(cb.check('node_3').state, 'OPEN');

            // Manually transition to half-open (simulate time passing)
            const entry = cb._states.get('node_3');
            entry.state = 'HALF_OPEN';
            entry.halfOpenSuccesses = 0;

            assert.equal(cb.check('node_3').allowed, true);
            cb.recordSuccess('node_3');
            cb.recordSuccess('node_3');
            assert.equal(cb.check('node_3').state, 'CLOSED');
        });

        it('returns to OPEN if half-open fails', () => {
            const cb = new NodeCircuitBreaker(db);
            for (let i = 0; i < 5; i++) cb.recordFailure('node_4');
            const entry = cb._states.get('node_4');
            entry.state = 'HALF_OPEN';

            cb.recordFailure('node_4');
            assert.equal(cb.check('node_4').state, 'OPEN');
        });
    });

    // ── Demand Buffer Tests ───────────────────────────────────────────

    describe('Demand Buffer Backpressure', () => {
        it('accepts valid workloads', () => {
            const buffer = new DemandBuffer();
            const result = buffer.enqueue({
                op_type: 'rpc_call', target: 'ethereum', payload: { method: 'eth_blockNumber' }, reward: 0.01
            }, 'test');
            assert.equal(result.accepted, true);
        });

        it('rejects invalid op_type', () => {
            const buffer = new DemandBuffer();
            const result = buffer.enqueue({
                op_type: 'invalid_op', target: 'test', payload: {}, reward: 0.01
            }, 'test');
            assert.equal(result.accepted, false);
        });

        it('enforces rate limiting per source', () => {
            const buffer = new DemandBuffer();
            let rejected = 0;
            for (let i = 0; i < 110; i++) {
                const result = buffer.enqueue({
                    op_type: 'rpc_call', target: 'eth', payload: { i }, reward: 0.01
                }, 'rate_test');
                if (!result.accepted) rejected++;
            }
            assert.ok(rejected > 0, 'Should reject some requests due to rate limiting');
        });
    });

    // ── Revenue Attribution Tests ─────────────────────────────────────

    describe('Workload Metrics & Attribution', () => {
        it('tracks workload counts', () => {
            const metrics = new WorkloadMetrics(db);
            metrics.incRpc(5);
            metrics.incAi(3);
            metrics.incWebhook(2);
            metrics.incAutomation(1);
            const snap = metrics.snapshot();
            assert.equal(snap.rpc_requests, 5);
            assert.equal(snap.ai_inferences, 3);
            assert.equal(snap.webhook_events, 2);
            assert.equal(snap.automation_jobs, 1);
        });

        it('records revenue attribution', () => {
            const metrics = new WorkloadMetrics(db);
            metrics.recordAttribution('rpc_call', 0.15, 'rpc_gateway');
            metrics.recordAttribution('rpc_call', 0.10, 'rpc_gateway');
            metrics.recordAttribution('ai_inference', 0.50, 'ai_gateway');

            const profitability = metrics.getProfitability();
            assert.ok(profitability.length >= 2);
            const rpc = profitability.find(p => p.workload_type === 'rpc_call');
            assert.ok(rpc);
            assert.equal(rpc.total_jobs, 2);
        });
    });
});
