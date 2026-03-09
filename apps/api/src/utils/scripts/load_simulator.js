import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import http from 'http';
import https from 'https';

// Load Sim Configuration
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8080';
const DURATION_SEC = parseInt(process.env.DURATION || '60', 10);
const RPS = parseInt(process.env.RPS || '50', 10);

if (isMainThread) {
    // Main Orchestrator
    async function run() {
        console.log(`[LoadSim] Starting simulation: ${RPS} RPS against ${TARGET_URL} for ${DURATION_SEC}s`);

        const worker = new Worker(new URL(import.meta.url), {
            workerData: { target: TARGET_URL, rps: RPS, duration: DURATION_SEC }
        });

        worker.on('message', (msg) => console.log(msg));
        worker.on('error', (err) => console.error('[LoadSim] Worker error:', err));
        worker.on('exit', (code) => {
            if (code !== 0) console.error(`[LoadSim] Worker stopped with exit code ${code}`);
            else console.log('[LoadSim] Simulation completed.');
        });
    }

    // Only run if called directly
    if (process.argv[1] && process.argv[1].endsWith('load_simulator.js')) {
        run();
    }

    // Export for programmatic use if needed (though we likely spawn via child_process)
} else {
    // Worker Thread
    const { target, rps, duration } = workerData;
    const interval = 1000 / rps;
    const endTime = Date.now() + (duration * 1000);

    let sent = 0;
    let errors = 0;

    const agent = new http.Agent({ keepAlive: true, maxSockets: 100 });

    async function shoot() {
        if (Date.now() > endTime) {
            parentPort.postMessage(`[Final] Sent: ${sent}, Errors: ${errors}`);
            process.exit(0);
        }

        const start = Date.now();

        // Random endpoint selection
        const endpoints = ['/health', '/api/nodes/announce', '/api/ops/report'];
        const path = endpoints[Math.floor(Math.random() * endpoints.length)];

        const req = http.request(`${target}${path}`, {
            agent,
            method: 'GET',
            timeout: 2000
        }, (res) => {
            res.on('data', () => { }); // Consume
            res.on('end', () => { });
            if (res.statusCode >= 500) errors++;
        });

        req.on('error', () => errors++);
        req.end();

        sent++;

        // Schedule next
        const elapsed = Date.now() - start;
        const delay = Math.max(0, interval - elapsed);
        setTimeout(shoot, delay);
    }

    // Start multiple concurrent loops to achieve RPS?
    // Single loop with timeout limit RPS.
    // Actually, distinct timeouts are better.
    // For 50 RPS, we need to fire every 20ms.

    console.log(`[Worker] Firing...`);
    shoot();
    // Wait, recursive setTimeout drift. Better: setInterval
    setInterval(() => {
        if (Date.now() > endTime) process.exit(0);

        // Batch fire?
        // if RPS is high, setInterval might lag.
        // For MVP 50 RPS, setInterval 20ms is fine.
        shoot();
    }, interval);
}
