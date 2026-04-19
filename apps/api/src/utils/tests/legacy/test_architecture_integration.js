import express from 'express';
import request from 'supertest';
import { createRpcRouter } from '../../../gateway/routes/rpc.js';

const mockDb = {
    prepare: (query) => {
        return {
            get: (params) => {
                if (query.includes('registered_nodes')) {
                    return null; // Force fallback Genesis
                }
                if (query.includes('genesis_nodes')) {
                    return { node_id: 'gen-456', endpoint: 'http://mock-genesis:8545' };
                }
                if (query.includes('system_config') && query.includes('system_state')) return { value: 'LIVE' };
                if (query.includes('ops_pricing')) return { price_usdt: 0.01, enabled: 1, max_per_minute_per_client: 60, max_per_minute_per_node: 120 };
                if (query.includes('revenue_events_v2')) {
                    if (query.includes('COUNT')) return { c: 0 };
                    return null;
                }
                if (query.includes('pricing_rules')) return null;
                if (query.includes('epochs')) return { id: 1 };
                return null;
            },
            run: (params) => {
                return { lastInsertRowid: 99 };
            }
        };
    }
};

// Hack the forward method so we don't actually fetch
import { BaseAdapter } from '../../../providers/adapters/base_adapter.js';
BaseAdapter.prototype.forward = async function (payload, targetUrl) {
    return { success: true, data: { jsonrpc: '2.0', id: payload.id, result: 'mock_integration_success' }, latency: 15 };
};

const app = express();
app.use(express.json());
app.use('/rpc', createRpcRouter(mockDb));

async function runTest() {
    const res = await request(app)
        .post('/rpc/ethereum')
        .send({ "jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1 });

    console.log("Integration Test Result:", res.body);
    if (res.body.result === 'mock_integration_success') {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

runTest();
