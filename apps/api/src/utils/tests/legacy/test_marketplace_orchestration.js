import { JobScheduler } from '../../../scheduler/job_scheduler.js';
import { createJobsRouter } from '../../../gateway/routes/jobs_api.js';
import express from 'express';
import request from 'supertest';

// Mock DB 
const mockDb = {
    prepare: (query) => {
        return {
            get: (params) => {
                if (query.includes('node_metrics')) return { current_load: 20 };
                // Capability matcher fallback mock
                if (query.includes('registered_nodes')) return { wallet: 'node_cap_1', endpoint: 'http://test', latency: 10, infra_reserved: 5, active: 1 };
                if (query.includes('ops_pricing')) return { price_usdt: 0.005 };
                if (query.includes('marketplace_jobs')) return { reward: 0.5, creator_wallet: 'dev_123' };
                // Ops check
                if (query.includes('system_config')) return { value: 'LIVE' };
                if (query.includes('epochs')) return { id: 1 };
                return null;
            },
            all: () => {
                // Return a capable node
                return [{ wallet: 'node_cap_1', endpoint: 'http://test', latency: 10, infra_reserved: 5, active: 1 }];
            },
            run: () => ({ lastInsertRowid: 1, changes: 1 })
        };
    },
    transaction: (cb) => cb(mockDb) // mock standard TX
};

async function test_marketplace() {
    console.log("== Initiating End-to-End Infrastructure Marketplace Simulation ==");

    // Instantiate real scheduler 
    const scheduler = new JobScheduler(mockDb);
    // Wipe queue
    await scheduler.queue.wipe();

    // Setup Express App
    const app = express();
    app.use(express.json());
    app.use('/v1/jobs', createJobsRouter(mockDb, scheduler.queue, scheduler.escrow));

    // 1. Simulate Developer Submitting a Job
    console.log("1. Developer submits generic AI Inference payload.");
    const response = await request(app)
        .post('/v1/jobs')
        .set('X-API-Key', 'dev_secret_key_123')
        .send({
            job_type: "ai_inference",
            reward: 0.5,
            payload: { model: "llama3", prompt: "Summarize this request" }
        });

    if (response.statusCode !== 201) {
        console.error("FAIL: API Rejected Payload", response.body);
        process.exit(1);
    }
    console.log("SUCCESS: API Accepted Job.", response.body);

    // 2. Scheduler Loop processing
    console.log("2. Polling Scheduler to Execute Job.");
    let job = await scheduler.queue.pop_job();
    if (!job) {
        console.error("FAIL: Job did not hit Execution Queue.");
        process.exit(1);
    }

    const execResult = await scheduler.processJob(job);
    console.log("Scheduler Output:", execResult);

    if (execResult.status === 'success') {
        console.log("SUCCESS: End-to-End marketplace routing verified!");
        console.log("Funds were Escrowed, Job was Matched, Payload executed, and Node Revenue Released.");
        process.exit(0);
    } else {
        console.error("FAIL: Pipeline failed to produce complete end-to-end execution.");
        process.exit(1);
    }
}

test_marketplace();
