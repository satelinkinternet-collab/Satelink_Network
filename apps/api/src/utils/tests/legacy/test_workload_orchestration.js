import { WorkloadDiscoveryEngine } from '../../../scheduler/workload_discovery.js';
import { JobScheduler } from '../../../scheduler/job_scheduler.js';

// Global execution metrics bucket
const testExecutionMetrics = {
    workloads_discovered: 0,
    jobs_generated: 0,
    jobs_executed: 0,
    profit_generated: 0
};

// Mock DB wrapper to handle both services locally
const mockDb = {
    prepare: (query) => {
        return {
            get: (params) => {
                if (query.includes('node_metrics')) return { current_load: 20 };
                if (query.includes('registered_nodes')) return { node_id: 'test_node_1', endpoint: 'http://test' };
                if (query.includes('ops_pricing')) return { price_usdt: 0.005 };
                if (query.includes('system_config')) return { value: 'LIVE' };
                if (query.includes('epochs')) return { id: 1 };
                return null;
            },
            run: (...args) => {
                // Intercept workload registry insertions to increment discovered metric
                if (query.includes('workload_registry')) {
                    testExecutionMetrics.workloads_discovered++;
                    const status = args[4];
                    if (status === 'queued') testExecutionMetrics.jobs_generated++;
                }

                // Intercept execution record to tally finalized jobs
                if (query.includes('revenue_events_v2') || query.includes('executeOp')) {
                    testExecutionMetrics.jobs_executed++;
                    // Hardcoded profit simulation for the unit test
                    testExecutionMetrics.profit_generated += 0.002;
                }

                return { lastInsertRowid: 1, changes: 1 };
            }
        };
    },
    transaction: (cb) => cb(mockDb) // mock standard TX
};

async function test_orchestration() {
    console.log("== Initiating End-to-End Workload Discovery -> Scheduler Simulation ==");

    const scheduler = new JobScheduler(mockDb);
    const discovery = new WorkloadDiscoveryEngine(mockDb);

    // Wipe queue
    await scheduler.queue.wipe();

    // 1. Force discovery to run one tick
    await discovery.discoverAndDispatch();

    // 2. Poll scheduler until queue runs dry
    let job = await scheduler.queue.pop_job();
    while (job) {
        await scheduler.processJob(job);
        job = await scheduler.queue.pop_job();
    }

    console.log("== Simulation Completed ==");
    console.log("Metrics:", testExecutionMetrics);

    if (testExecutionMetrics.workloads_discovered > 0 && testExecutionMetrics.jobs_generated > 0 && testExecutionMetrics.jobs_executed > 0) {
        console.log("SUCCESS: End-to-End workload routing verified!");
        process.exit(0);
    } else {
        console.error("FAIL: Pipeline failed to produce complete end-to-end execution.");
        process.exit(1);
    }
}

test_orchestration();
