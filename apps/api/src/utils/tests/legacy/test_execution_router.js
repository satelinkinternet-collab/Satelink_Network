// test_execution_router.js
import { ExecutionRouter } from '../../../execution/execution_router_legacy.js';

// Mock DB
const db = {
    prepare: (query) => {
        return {
            get: (param) => {
                if (query.includes('registered_nodes')) {
                    if (param === 'solana') return null; // Force fallback
                    return { wallet: 'comm-123', latency: 12, endpoint: 'http://community:8545' };
                }
                if (query.includes('genesis_nodes')) {
                    if (param.includes('fuse')) return null; // Force external fallback
                    return { node_id: 'gen-456', endpoint: 'http://genesis:8545' };
                }
                if (query.includes('external_providers')) {
                    return { provider_name: 'ext-789', endpoint: 'http://external:8545' };
                }
                return null;
            }
        };
    }
};

async function runTest() {
    const router = new ExecutionRouter(db);

    try {
        const res1 = await router.selectExecutionSource('ethereum', {});
        console.log('Ethereum routed to:', res1);

        const res2 = await router.selectExecutionSource('solana', {});
        console.log('Solana routed to:', res2);

        const res3 = await router.selectExecutionSource('fuse', {});
        console.log('Fuse routed to:', res3);
    } catch (e) {
        console.error('Test failed:', e);
    }
}

runTest();
