import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOT_DIR = path.join(__dirname, '../test/contracts');

const BASE_URL = 'http://localhost:8080';

async function main() {
    console.log('[ContractTest] Starting API Contract Verification...');

    // 1. Authenticate
    const token = await getAdminToken();
    if (!token) {
        console.error('[ContractTest] Failed to get admin token. ensure server is running.');
        process.exit(1);
    }

    // 2. Define Endpoints to Test
    const endpoints = [
        { method: 'GET', path: '/auth/me', name: 'auth_me' },
        { method: 'GET', path: '/admin/command/summary', name: 'admin_summary' },
        { method: 'GET', path: '/admin/reports/daily?limit=1', name: 'ops_reports_list' },
        { method: 'GET', path: '/admin/nodes?limit=1', name: 'node_list' },
        { method: 'GET', path: '/admin/beta/users?limit=1', name: 'beta_users_list' },
        { method: 'GET', path: '/admin/security/enforcement?limit=1', name: 'enforcement_list' } // Phase 21
    ];

    let failures = 0;

    for (const ep of endpoints) {
        try {
            console.log(`[ContractTest] Testing ${ep.method} ${ep.path}...`);
            const res = await fetch(`${BASE_URL}${ep.path}`, {
                method: ep.method,
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await res.json();
            const schema = generateSchema(data);

            const snapshotPath = path.join(SNAPSHOT_DIR, `${ep.name}.json`);

            if (fs.existsSync(snapshotPath)) {
                // Verify
                const expectedSchema = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
                const diff = compareSchemas(expectedSchema, schema);
                if (diff.length > 0) {
                    console.error(`[FAIL] ${ep.name} schema mismatch:`, diff);
                    failures++;
                } else {
                    console.log(`[PASS] ${ep.name}`);
                }
            } else {
                // Create Snapshot
                fs.writeFileSync(snapshotPath, JSON.stringify(schema, null, 2));
                console.log(`[Snapshot] Created for ${ep.name}`);
            }

        } catch (e) {
            console.error(`[ERROR] Failed ${ep.name}:`, e.message);
            failures++;
        }
    }

    if (failures > 0) {
        console.error(`[ContractTest] Finished with ${failures} failures.`);
        process.exit(1);
    } else {
        console.log('[ContractTest] All contracts passed.');
    }
}

async function getAdminToken() {
    try {
        const res = await fetch(`${BASE_URL}/__test/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: '0xcontract_tester' })
        });
        const data = await res.json();
        return data.token;
    } catch (e) {
        return null;
    }
}

function generateSchema(obj) {
    if (obj === null) return 'null';
    if (Array.isArray(obj)) {
        // We only care about the schema of the first item (if any)
        if (obj.length > 0) {
            return [generateSchema(obj[0])];
        } else {
            return []; // Empty array
        }
    }
    if (typeof obj === 'object') {
        const schema = {};
        for (const key of Object.keys(obj).sort()) {
            schema[key] = generateSchema(obj[key]);
        }
        return schema;
    }
    return typeof obj;
}

function compareSchemas(expected, actual, path = '') {
    const diffs = [];

    if (typeof expected !== typeof actual) {
        // Allow 'number' vs 'null' if nullable? For MVP simplified: strict check
        // Exception: actual could be null if expected was object/string?
        // Let's be strict.
        if (expected === 'null' && actual !== 'null') return [`${path}: expected null, got ${actual}`];
        // ...
    }

    if (Array.isArray(expected)) {
        if (!Array.isArray(actual)) return [`${path}: expected array`];
        if (expected.length > 0 && actual.length > 0) {
            return compareSchemas(expected[0], actual[0], `${path}[]`);
        }
        return [];
    }

    if (typeof expected === 'object' && expected !== null && actual !== null) {
        const expectedKeys = Object.keys(expected);
        const actualKeys = Object.keys(actual);

        // Missing keys
        for (const key of expectedKeys) {
            if (!actualKeys.includes(key)) {
                diffs.push(`${path}.${key} missing`);
            } else {
                const subDiffs = compareSchemas(expected[key], actual[key], `${path}.${key}`);
                diffs.push(...subDiffs);
            }
        }

        // New keys are ALLOWED (backward compatible), so we don't check for them as errors.
        // We only check for breaking changes (missing keys or type changes).
    } else {
        if (expected !== actual) {
            diffs.push(`${path}: expected ${expected}, got ${actual}`);
        }
    }

    return diffs;
}

main();
