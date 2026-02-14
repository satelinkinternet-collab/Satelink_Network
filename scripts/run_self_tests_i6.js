import { SelfTestRunner } from '../src/services/self_test_runner.js';
import { OpsEngine } from '../src/services/ops_engine.js';
import db from '../src/db.js';

const mockOpsEngine = { db };
const runner = new SelfTestRunner(mockOpsEngine, 8080);

async function run() {
    console.log('Running I6 Self Tests...');

    // 1. Silent Reauth Contract
    const reauth = await runner.runKind('silent_reauth_contract');
    console.log('Silent Reauth:', reauth);

    // 2. Session Binding Sanity
    const binding = await runner.runKind('session_binding_sanity');
    console.log('Session Binding:', binding);

    if (reauth.status === 'pass' && binding.status === 'pass') {
        console.log('✅ I6 Self Tests Passed');
        process.exit(0);
    } else {
        console.error('❌ I6 Self Tests Failed');
        process.exit(1);
    }
}

run();
