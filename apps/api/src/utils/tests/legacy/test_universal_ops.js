import { JobScheduler } from '../../../scheduler/job_scheduler.js';
import { OpsExecutionAdapter } from '../../../ops-agent/ops_execution_adapter.js';
import { createOpsRouter } from '../../../gateway/routes/ops_api.js';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { attachSchema } from '../../../core/schema.js';

async function test_universal_ops() {
    console.log("== Initiating End-to-End Universal Ops Integration Test ==");

    // Setup SQLite DB mapping 1:1 to schema structures
    const db = new Database(':memory:');
    attachSchema(db);

    // Instantiate pipeline logic
    const scheduler = new JobScheduler(db);

    // Disconnect real redis safely
    if (scheduler.queue.redis) scheduler.queue.redis.disconnect();

    // Mock the queue completely with a memory object
    scheduler.queue = {
        _q: [],
        async push_job(job) { this._q.push(job); },
        async pop_job() { return this._q.shift() || null; },
        async wipe() { this._q = []; },
        async retry_job(job) { this._q.push(job); }
    };

    const opsAdapter = new OpsExecutionAdapter(db, scheduler.queue);

    // Setup Express App
    const app = express();
    app.use(express.json());
    app.use('/v1/ops', createOpsRouter(db, opsAdapter));

    // Wiping the queue initially in case memory artifacts carried over
    await scheduler.queue.wipe();

    // 1. Simulate External API Submission
    console.log("1. External Developer submits 'ai_inference' request via Universal Ops API.");
    const response = await request(app)
        .post('/v1/ops')
        .set('X-API-Key', 'trusted_dev_key')
        .send({
            op_type: "ai_inference",
            target: "generic",
            payload: { model: "mixtral", task: "summarize_logs" }
        });

    if (response.statusCode !== 201) {
        console.error("FAIL: Could not submit operations payload.", response.body);
        process.exit(1);
    }

    const opId = response.body.op_id;
    console.log(`SUCCESS: Payload mapped natively. Op ID: ${opId}. Auto-mapped Cost: ${response.body.cost}`);

    // Verify Registry Database State
    const regCheck = db.prepare(`SELECT status FROM ops_registry WHERE op_id = ?`).get(opId);
    if (!regCheck || regCheck.status !== 'scheduled') {
        console.error("FAIL: Operations Registry failed to reflect 'scheduled' status.");
        process.exit(1);
    }
    console.log("SUCCESS: Database status isolated correctly.");

    // 2. Poll the Scheduler Loop
    console.log("2. Scheduler intercepts Universal Job Queue payload natively bypassing strict marketplace limitations.");
    let job = await scheduler.queue.pop_job();
    if (!job) {
        console.error("FAIL: Job bypassed Queue execution.");
        process.exit(1);
    }

    // Force node topology mock inside db
    db.prepare(`INSERT INTO genesis_nodes (node_id, endpoint, status) VALUES ('node_x1', 'http://node', 'ACTIVE')`).run();

    // Inject operations_engine dependency dynamically to intercept for test verification 
    scheduler.global.opsEngine.executeOp = async (args) => {
        console.log(`[Mock OpsEngine] Processing execution ${args.request_id} mapped to node ${args.node_id}`);
    };

    // Inject router mock since we bypass full external routing connections in unit tests
    scheduler.router.selectExecutionSource = async (chain, payload) => {
        return { id: 'node_x1', endpoint: 'http://node' };
    };

    // 3. Process the Job Execution
    const execResult = await scheduler.processJob(job);
    console.log("Scheduler Output:", execResult);

    // 4. Verification Check
    const metrics = db.prepare(`SELECT * FROM universal_ops_metrics WHERE id=1`).get();
    console.log("Global System Metrics Extracted:", metrics);

    if (metrics.operations_executed !== 1 || Math.abs(metrics.revenue_generated - 0.012) > 0.0001) {
        console.error("FAIL: Global metrics were not aggregated accurately post-execution.");
        process.exit(1);
    }

    const finalReg = db.prepare(`SELECT status FROM ops_registry WHERE op_id = ?`).get(opId);
    if (finalReg.status !== 'completed') {
        console.error(`FAIL: Job sequence did not map to 'completed'. Captured as: ${finalReg.status}`);
        process.exit(1);
    }

    console.log("SUCCESS: End-to-End Execution successfully routed Universal execution logic into the Job Pipeline!");
    process.exit(0);
}

test_universal_ops();
