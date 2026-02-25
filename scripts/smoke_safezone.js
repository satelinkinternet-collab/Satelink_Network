// scripts/smoke_safezone.js
/**
 * Executes a lightweight validation cycle testing the API infrastructure boundaries
 * strictly utilizing read-only diagnostics without disturbing ledger models.
 * 
 * Usage: API_BASE_URL=http://localhost:8080 node scripts/smoke_safezone.js
 */

const baseUrl = process.env.API_BASE_URL || 'http://localhost:8080';

async function verifyEndpoint(name, path, expectedStatus = 200, isLive = false) {
    let res;
    try {
        res = await fetch(`${baseUrl}${path}`);
    } catch (e) {
        console.log(`[FAIL] ${name}: Failed to connect to ${baseUrl}${path}`);
        return false;
    }

    if (res.status === expectedStatus) {
        console.log(`[PASS] ${name} (${res.status})`);
        return true;
    } else {
        console.log(`[FAIL] ${name} Expected ${expectedStatus}, got ${res.status}`);
        return false;
    }
}

async function run() {
    console.log(`Starting Safe Smoke Sequence on ${baseUrl}\n`);

    // 1. Initial Contact / Mode Extraction
    let modeLabel = 'unknown';
    try {
        const modeRes = await fetch(`${baseUrl}/api/mode`);
        if (modeRes.ok) {
            const m = await modeRes.json();
            modeLabel = m.mode;
            console.log(`[PASS] MODE: Detected ${modeLabel.toUpperCase()} Mode`);
        } else {
            console.log(`[FAIL] MODE: Could not parse /api/mode endpoint status`);
            process.exit(1);
        }
    } catch (e) {
        console.log(`[FAIL] API Reachability: Failed binding. Is the server running?`);
        process.exit(1);
    }

    // 2. Health & RPC Checks
    const isLive = modeLabel === 'live';
    const checks = [
        verifyEndpoint('Runtime Info', '/api/runtime-info', 200),
        verifyEndpoint('Healthz Probe', '/healthz', 200),
        verifyEndpoint('RPC Listener', '/rpc', 200)
    ];

    if (isLive) {
        checks.push(verifyEndpoint('LiveGuard Test Isolation', '/__test/error', 403, true));
        checks.push(verifyEndpoint('LiveGuard Sim Isolation', '/simulation/status', 403, true));
    } else {
        checks.push(verifyEndpoint('Simulation Namespace', '/simulation/status', 200, false));
    }

    const results = await Promise.all(checks);
    const passed = results.every(r => r === true);

    console.log(`\n============================`);
    console.log(passed ? `[OK] SMOKE TEST PASSED` : `[ERR] SMOKE TEST FAILED`);
    console.log(`============================`);

    process.exit(passed ? 0 : 1);
}

run();
