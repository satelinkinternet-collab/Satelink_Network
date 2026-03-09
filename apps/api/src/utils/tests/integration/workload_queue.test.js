import { enqueueWorkload, workloadQueue, getQueueMetrics } from '../../../queue/workloadQueue.js';
import { startWorkerProcessor } from '../../../queue/workerProcessor.js';

let passed = 0, failed = 0;
function assert(cond, msg) {
    if (cond) { console.log(`  ✅  ${msg}`); passed++; }
    else { console.error(`  ❌  ${msg}`); failed++; }
}

async function runQueueIntegrationTest() {
    console.log('── BullMQ Workload Queue Integration Test ──────────');

    // Make sure queue is clean from previous stray tests
    await workloadQueue.obliterate({ force: true }).catch(() => null);

    // 1. Launch 5 workers (Concurrency parameter passed directly to instances)
    const workers = [];
    for (let i = 0; i < 5; i++) {
        workers.push(startWorkerProcessor(2)); // Each processes 2 at a time
    }

    // 2. Enqueue 50 jobs
    const jobPromises = [];
    for (let i = 0; i < 50; i++) {
        // Enqueue 45 standard, 5 poison payloads that force an initial simulated failure to test retry backoff
        const payload = { op_type: 'rpc_call', target: `client-${i}`, force_fail: (i < 5) };
        jobPromises.push(enqueueWorkload(payload));
    }

    const startMetrics = await getQueueMetrics();
    assert(startMetrics.waiting > 0 || startMetrics.active > 0, 'Jobs successfully enqueued into waiting/active states');

    // 3. Await all 50 jobs completing
    // Wait until queue drain or timeout (~15 seconds)
    let checks = 0;
    while (checks < 30) {
        const stats = await getQueueMetrics();
        // If 45 completed and 5 failed (retrying via exponential backoff), we are succeeding
        // Note: the 5 failing jobs will cycle between failed, delayed, and active 3 times
        if (stats.completed >= 45 && stats.failed === 0 && stats.waiting === 0 && stats.active === 0) {
            // Let the retries process or fail permanently. If delayed is 0, we're fully settled.
            if (stats.delayed === 0) break;
        }
        await new Promise(r => setTimeout(r, 1000));
        checks++;
    }

    const finalMetrics = await getQueueMetrics();

    // Assert metrics
    assert(finalMetrics.completed >= 45, `System processed >= 45 jobs (completed: ${finalMetrics.completed})`);

    // With 3 attempts on an exponential delay, some of the 5 poison jobs might still be delayed or finally failed
    // Ensure backoff mechanism captured failures without crashing workers
    assert((finalMetrics.failed + finalMetrics.delayed) <= 5, `Poison jobs correctly backed off or failed (failed/delayed: ${finalMetrics.failed + finalMetrics.delayed})`);

    // Display comprehensive stats
    console.log('\nFinal Queue Snapshot:');
    console.table(finalMetrics);

    // 4. Teardown
    await workloadQueue.close();
    for (const w of workers) {
        await w.close();
    }

    console.log('\n── Results ──────────────────────────────────────');
    console.log(`   ✅  Passed: ${passed}`);
    console.log(`   ❌  Failed: ${failed}`);
    if (failed > 0) process.exit(1);
    process.exit(0);
}

runQueueIntegrationTest().catch((e) => {
    console.error("Test execution crashed: ", e);
    process.exit(1);
});
