import assert from 'assert';
import { DynamicProfitGuard } from '../src/economics/dynamic_profit_guard.js';

// Mock DB
const mockDb = {
    prepare: () => ({
        all: () => [
            { key: 'dynamic_profit_guard_enabled', value: '1' },
            { key: 'default_profit_margin', value: '25' },
            { key: 'launch_mode_profit_margin', value: '40' }
        ]
    })
};

async function testDynamicProfitGuard() {
    console.log('--- Testing DynamicProfitGuard ---');
    const guard = new DynamicProfitGuard(mockDb);

    // 1. Normal Mode
    let threshold = guard.calculateTargetMargin({ queueLength: 100, nodeUtilization: 50 });
    console.log(`Normal Mode: Expected 25%, Got ${threshold}%`);
    assert.strictEqual(threshold, 25);

    // 2. High Demand Mode (> 1M jobs)
    threshold = guard.calculateTargetMargin({ queueLength: 1500000, nodeUtilization: 90 });
    console.log(`High Demand: Expected 15%, Got ${threshold}%`);
    assert.strictEqual(threshold, 15);

    // 3. Launch Mode
    threshold = guard.calculateTargetMargin({ queueLength: 100, nodeUtilization: 50, isLaunchMode: true });
    console.log(`Launch Mode: Expected 40%, Got ${threshold}%`);
    assert.strictEqual(threshold, 40);

    // 4. Low Utilization Mode (< 30%)
    threshold = guard.calculateTargetMargin({ queueLength: 100, nodeUtilization: 20 });
    console.log(`Low Utilization: Expected 35%, Got ${threshold}%`);
    assert.strictEqual(threshold, 35);

    console.log('[PASS] DynamicProfitGuard logic verified.');
}

testDynamicProfitGuard().catch(err => {
    console.error(err);
    process.exit(1);
});
