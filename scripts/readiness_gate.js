// scripts/readiness_gate.js
/**
 * Safe-Zone Readiness Gate
 * 
 * Verifies that the API surface is behaving according to the operational guardrails.
 * Checks modes, health, live guard, security headers, and safe endpoints.
 * 
 * Usage: API_BASE_URL=http://localhost:8080 node scripts/readiness_gate.js
 */

const baseUrl = process.env.API_BASE_URL || 'http://localhost:8080';

async function checkEndpoint(name, path, options = {}) {
    const { expectedStatus, method = 'GET', expectedHeader } = options;
    console.log(`[CHECK] ${name} -> ${method} ${path}`);
    try {
        const res = await fetch(`${baseUrl}${path}`, { method });

        let pass = true;
        let reason = '';

        if (expectedStatus && res.status !== expectedStatus) {
            pass = false;
            reason += `Expected status ${expectedStatus} but got ${res.status}. `;
        }

        if (expectedHeader) {
            const headerVal = res.headers.get(expectedHeader);
            if (!headerVal) {
                pass = false;
                reason += `Missing header ${expectedHeader}. `;
            }
        }

        if (pass) {
            console.log(`  └─ [PASS] ${name}`);
            return true;
        } else {
            console.log(`  └─ [FAIL] ${reason.trim()}`);
            return false;
        }

    } catch (e) {
        console.log(`  └─ [FAIL] Network error connecting to ${baseUrl}${path}`);
        return false;
    }
}

async function run() {
    console.log(`=========================================`);
    console.log(` Satelink Readiness Gate: ${baseUrl}`);
    console.log(`=========================================\n`);

    let isLive = false;
    try {
        const modeRes = await fetch(`${baseUrl}/api/mode`);
        if (modeRes.ok) {
            const m = await modeRes.json();
            isLive = m.mode === 'live';
            console.log(`[INFO] MODE: Detected ${isLive ? 'LIVE' : 'SIMULATION'} Mode\n`);
        } else {
            console.log(`[FAIL] Could not verify mode.`);
            process.exit(1);
        }
    } catch (e) {
        console.log(`[FAIL] Server unreachable.`);
        process.exit(1);
    }

    const checks = [];

    // 1. Base Health
    checks.push(checkEndpoint('Healthz', '/healthz', { expectedStatus: 200 }));
    checks.push(checkEndpoint('Runtime Info', '/api/runtime-info', { expectedStatus: 200 }));

    // 2. Security Headers (from Task 36)
    checks.push(checkEndpoint('Security Headers', '/api/mode', {
        expectedStatus: 200,
        expectedHeader: 'content-security-policy-report-only'
    }));

    // 3. Live Guard & Safe-Zone Endpoints
    if (isLive) {
        // In LIVE mode, simulation namespace should be 403
        checks.push(checkEndpoint('Config Snapshot Route', '/api/config-snapshot', { expectedStatus: 403 }));
        checks.push(checkEndpoint('Route Inventory', '/api/routes', { expectedStatus: 403 }));
    } else {
        // In SIMULATION mode, check flag responsiveness
        // Fetch current flags first to adjust expected responses dynamically
        const flagRes = await fetch(`${baseUrl}/api/config-snapshot`);
        let rpcDisabled = false;
        let diagDisabled = false;
        let simDisabled = false;
        let readOnly = false;
        if (flagRes.ok) {
            const data = await flagRes.json();
            const flags = data.flags || {};
            rpcDisabled = flags.FLAG_DISABLE_RPC === true;
            diagDisabled = flags.FLAG_DISABLE_ADMIN_DIAGNOSTICS === true;
            simDisabled = flags.FLAG_DISABLE_SIMULATION_ROUTES === true;
            readOnly = flags.FLAG_READONLY_MODE === true;
        }

        checks.push(checkEndpoint('Simulation Status', '/simulation/status', {
            expectedStatus: simDisabled ? 503 : 200
        }));

        checks.push(checkEndpoint('RPC Stub GET', '/rpc', {
            expectedStatus: rpcDisabled ? 503 : 200
        }));

        checks.push(checkEndpoint('RPC Stub POST (Readonly check)', '/rpc', {
            method: 'POST',
            expectedStatus: (rpcDisabled || readOnly) ? 503 : 200
        }));

        checks.push(checkEndpoint('Diagnostics Audit', '/admin-api/diagnostics/surface-audit', {
            expectedStatus: diagDisabled ? 503 : 200
        }));
    }

    const results = await Promise.all(checks);
    const passed = results.every(r => r === true);

    console.log(`\n=========================================`);
    if (passed) {
        console.log(` [PASS] Readiness Gate Cleared`);
        process.exit(0);
    } else {
        console.log(` [FAIL] Readiness Gate Failed Check(s)`);
        process.exit(1);
    }
}

run();
