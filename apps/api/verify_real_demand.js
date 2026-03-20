import { PgDatabase } from './src/database/pg_adapter.js';
import { OperationsEngine } from './src/core/operations_engine.js';
import crypto from 'crypto';

async function verifyRealDemand() {
    const DATABASE_URL = process.env.DATABASE_URL || "postgres://satelink:satelinkpassword@localhost:5432/satelink";
    const db = await PgDatabase.create(DATABASE_URL);
    const opsEngine = new OperationsEngine(db, null, null);
    await opsEngine.init();

    console.log('--- Phase 9 Verification Start ---');

    // 1. Initial count
    const initialRev = await db.prepare("SELECT COUNT(*) as count FROM revenue_events_v2").get();
    console.log(`Initial revenue events: ${initialRev.count}`);

    // 2. Simulate RPC Request with low pricing (eth_blockNumber)
    console.log('Simulating eth_blockNumber (low cost)...');
    await opsEngine.executeOp({
        op_type: 'api_relay_execution',
        node_id: 'external_provider',
        client_id: 'test_client_real_demand',
        request_id: 'rpc_test_' + Date.now(),
        timestamp: Date.now(),
        payload_hash: crypto.randomBytes(32).toString('hex'),
        amount_usdt: 0.0001
    });

    // 3. Verify increment
    const afterRev = await db.prepare("SELECT COUNT(*) as count FROM revenue_events_v2").get();
    console.log(`Final revenue events: ${afterRev.count}`);

    if (afterRev.count > initialRev.count) {
        console.log('VERIFICATION: PASS (Revenue events increased)');
    } else {
        console.log('VERIFICATION: FAIL (Revenue events did not increase)');
    }

    process.exit(0);
}

verifyRealDemand().catch(err => {
    console.error(err);
    process.exit(1);
});
