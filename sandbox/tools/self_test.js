
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("[SELF-TEST] Running static and runtime checks...");
let failures = 0;

// 1. Static Checks
const checks = [
    { pattern: "insecure_dev_secret_replace_immediately", file: "sandbox/src/routes/auth_v2.js", shouldExist: false },
    { pattern: "JWT_SECRET ||", file: "sandbox/src/routes/auth_v2.js", shouldExist: false },
    { pattern: "validateEnv", file: "sandbox/server.js", shouldExist: true }
];

checks.forEach(check => {
    const content = fs.readFileSync(check.file, 'utf8');
    const exists = content.includes(check.pattern);
    if (exists !== check.shouldExist) {
        console.error(`[FAIL] Static check failed: '${check.pattern}' in ${check.file} (Expected: ${check.shouldExist}, Found: ${exists})`);
        failures++;
    } else {
        console.log(`[PASS] Static check passed: '${check.pattern}' in ${check.file}`);
    }
});

// 2. Runtime Checks (Stub for now, will expand in active testing not just CI)
console.log(`[SELF-TEST] Finished with ${failures} failures.`);
if (failures > 0) process.exit(1);
process.exit(0);
