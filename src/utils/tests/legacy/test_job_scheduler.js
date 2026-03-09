import { JobScheduler } from '../../../scheduler/job_scheduler.js';

// Mock DB for Operations Engine, Pricing Engine, router, etc
const mockDb = {
    prepare: (query) => {
        return {
            get: (params) => {
                // For node capacity:
                if (query.includes('node_metrics')) return { current_load: 10 }; // Safe load
                // For router
                if (query.includes('registered_nodes')) return { node_id: 'com-1', endpoint: 'http://test' };
                // For pricing
                if (query.includes('ops_pricing')) return { price_usdt: 0.005 };
                // Ops Engine checks
                if (query.includes('system_config')) return { value: 'LIVE' };
                if (query.includes('epochs')) return { id: 1 };
                return null;
            },
            run: () => ({ lastInsertRowid: 1, changes: 1 })
        };
    },
    transaction: (cb) => cb(mockDb) // mock standard TX
};

async function run() {
    const scheduler = new JobScheduler(mockDb);

    // Wipe and seed queue
    await scheduler.queue.wipe();

    // We expect this one to be accepted and executed
    await scheduler.queue.push_job({
        type: 'AUTOMATION_JOB',
        priority: 'enterprise',
        client_id: 'client_A',
        reward: 0.05
    });

    // We expect this one to be rejected as unprofitable (cost > reward)
    await scheduler.queue.push_job({
        type: 'AI_INFERENCE', // cost ~0.004 config
        priority: 'developer',
        client_id: 'client_B',
        reward: 0.0001
    });

    console.log("Scheduler starting to process 2 jobs...");

    // Process manually instead of loop for deterministic testing
    const job1 = await scheduler.queue.pop_job();
    const result1 = await scheduler.processJob(job1);
    console.log("Result Job 1:", result1.status);

    const job2 = await scheduler.queue.pop_job();
    const result2 = await scheduler.processJob(job2);
    console.log("Result Job 2:", result2.status);

    if (result1.status === 'success' && result2.status === 'rejected_unprofitable') {
        console.log("Scheduler Logic Verified!");
        process.exit(0);
    } else {
        console.error("Scheduler Logic Failed", result1, result2);
        process.exit(1);
    }
}

run();
