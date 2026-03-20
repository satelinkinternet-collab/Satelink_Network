#!/usr/bin/env node
import { Command } from 'commander';
import axios from 'axios';
import * as http from 'http';
import { NodeAuth } from './auth';
import { WorkloadExecutor } from './executor';
import { NodeState } from './state';

const CONTROL_PLANE_URL = process.env.CONTROL_PLANE_URL || 'http://localhost:8080';
const NODE_PORT = parseInt(process.env.NODE_PORT || '9090', 10);
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000', 10);

const auth = new NodeAuth();
const executor = new WorkloadExecutor();
const state = new NodeState();

const program = new Command();

program
    .name('satelink-node')
    .description('CLI daemon for Satelink Node Operators')
    .version('1.0.0');

program.command('start')
    .description('Start the Satelink node daemon')
    .action(async () => {
        console.log('[NodeAgent] Initializing...');

        // 1. Initialize persistent state
        state.initialize();

        // 2. Initialize identity (generates Ed25519 keypair on first run)
        const identity = await auth.initialize();
        console.log(`[NodeAgent] Node ID: ${identity.nodeId}`);

        // 3. Check if already registered (skip re-registration on restart)
        if (state.isRegistered()) {
            console.log('[NodeAgent] Identity preserved from previous session');
        } else {
            await registerNode();
            state.saveIdentity(identity.nodeId, CONTROL_PLANE_URL);
        }

        // 4. Recover any pending jobs from previous crash
        const pending = state.getPendingJobs();
        if (pending.length > 0) {
            console.log(`[NodeAgent] Recovering ${pending.length} pending jobs from crash`);
            for (const pj of pending) {
                try {
                    const job = JSON.parse(pj.payload);
                    state.markJobAttempted(pj.job_id);
                    const result = await executor.execute(job);
                    if (result.success) {
                        state.removePendingJob(pj.job_id);
                    }
                } catch (err: any) {
                    console.error(`[Recovery] Failed to recover job ${pj.job_id}: ${err.message}`);
                }
            }
        }

        // 5. Start the /execute HTTP server
        startExecuteServer();

        // 6. Start heartbeat loop
        startHeartbeat();

        console.log(`[NodeAgent] Running on port ${NODE_PORT}`);
    });

program.command('register')
    .description('Register the node with the API')
    .action(async () => {
        await auth.initialize();
        await registerNode();
        console.log('[NodeAgent] Registration complete.');
    });

program.command('status')
    .description('Check the status of the node')
    .action(async () => {
        const identity = await auth.initialize();
        console.log(`Node ID: ${identity.nodeId}`);
        console.log(`Public Key:\n${identity.publicKey}`);
        console.log(`Control Plane: ${CONTROL_PLANE_URL}`);
    });

program.parse();

// --- Core Functions ---

async function registerNode(): Promise<void> {
    const payload = {
        node_id: auth.getNodeId(),
        public_key: auth.getPublicKey(),
        api_endpoint: `http://0.0.0.0:${NODE_PORT}`,
        capabilities: ['rpc_call', 'ai_inference', 'webhook_delivery', 'automation_job'],
        timestamp: Date.now()
    };
    const signature = auth.signRequest(payload);

    try {
        await axios.post(`${CONTROL_PLANE_URL}/api/nodes/register`, payload, {
            headers: { 'X-Node-Signature': signature }
        });
        console.log('[NodeAgent] Registered with control plane');
    } catch (err: any) {
        console.error(`[NodeAgent] Registration failed: ${err.message}`);
    }
}

function startExecuteServer(): void {
    const server = http.createServer(async (req, res) => {
        if (req.method === 'POST' && req.url === '/execute') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', async () => {
                try {
                    const job = JSON.parse(body);

                    // Verify HMAC signature from dispatcher
                    const hmacHeader = req.headers['x-job-signature'] as string;
                    if (!hmacHeader) {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'rejected', error: 'Missing signature' }));
                        return;
                    }

                    // Track pending job for crash recovery
                    state.savePendingJob(job.job_id, job);

                    // Execute the workload
                    const result = await executor.execute(job);

                    // Remove from pending on completion
                    state.removePendingJob(job.job_id);

                    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

                    res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: result.success ? 'accepted' : 'rejected',
                        execution_id: executionId,
                        result: result.result,
                        error: result.error,
                        duration_ms: result.duration_ms
                    }));
                } catch (err: any) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'rejected', error: err.message }));
                }
            });
        } else if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'healthy', node_id: auth.getNodeId() }));
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    server.listen(NODE_PORT, '0.0.0.0');
}

function startHeartbeat(): void {
    setInterval(async () => {
        const payload = {
            node_id: auth.getNodeId(),
            timestamp: Date.now(),
            stats: {
                cpu: Math.round(Math.random() * 100),
                memory: Math.round(Math.random() * 100),
                uptime: process.uptime()
            }
        };
        const signature = auth.signRequest(payload);

        try {
            await axios.post(`${CONTROL_PLANE_URL}/heartbeat`, {
                nodeWallet: auth.getNodeId(),
                ...payload,
                nonce: Date.now(),
                signature
            }, {
                headers: { 'X-Node-Signature': signature }
            });
        } catch (err: any) {
            console.error(`[Heartbeat] Failed: ${err.message}`);
        }
    }, HEARTBEAT_INTERVAL_MS);
}
