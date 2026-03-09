import { ProfitProtection } from '../../economics/profitProtection.js';
import { logger } from '../../monitoring/logger.js';

async function runSimulation() {
    console.log('--- Profit Protection Simulation (100 Jobs) ---');
    const engine = new ProfitProtection();
    let stats = { passed: 0, rejected: 0, adjusted: 0 };

    for (let i = 1; i <= 100; i++) {
        const userPrice = Math.random() * 0.01;      // $0.00 to $0.01
        const nodeReward = Math.random() * 0.008;    // $0.00 to $0.008
        const providerCost = Math.random() * 0.002;  // $0.00 to $0.002

        const job = { id: `sim-job-${i}` };

        const result = engine.evaluateWorkload(job, userPrice, nodeReward, providerCost);

        const totalCost = result.allowed_execution ? (result.adjusted_node_reward + providerCost) : (nodeReward + providerCost);
        const margin = userPrice > 0 ? ((userPrice - totalCost) / userPrice) * 100 : 0;

        if (result.allowed_execution) {
            stats.passed++;
            if (result.adjusted_node_reward < nodeReward) stats.adjusted++;

            // Critical Verification
            if (margin < 29.9) { // Using 29.9 to account for float precision
                console.error(`[FAIL] Job ${i} executed with margin ${margin.toFixed(2)}% (Threshold: 30%)`);
                process.exit(1);
            }
        } else {
            stats.rejected++;
        }
    }

    console.log('\nSimulation Results:');
    console.log(`- Total Jobs: 100`);
    console.log(`- Passed:     ${stats.passed}`);
    console.log(`- Adjusted:   ${stats.adjusted}`);
    console.log(`- Rejected:   ${stats.rejected}`);
    console.log('\n[PASS] Profit Protection Engine successfully enforced 30% margin.');
}

runSimulation().catch(err => {
    console.error(err);
    process.exit(1);
});
