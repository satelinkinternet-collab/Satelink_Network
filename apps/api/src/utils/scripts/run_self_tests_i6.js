import { getValidatedDB } from '../../core/db/index.js';

async function run() {
    const db = await getValidatedDB();
    const mockOpsEngine = { db };
    const runner = new SelfTestRunner(mockOpsEngine, 8080);

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
