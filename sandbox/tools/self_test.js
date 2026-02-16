
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
    // Security (Must NOT exist)
    { pattern: /insecure_dev_secret_replace_immediately/i, file: "sandbox/src/routes/auth_v2.js", forbidden: true },
    { pattern: /JWT_SECRET \|\|/i, file: "sandbox/src/routes/auth_v2.js", forbidden: true },
    { pattern: /adminKey=/i, file: "sandbox/src/routes/dashboard.js", forbidden: true },
    { pattern: /process\.env\.ADMIN_API_KEY/i, file: "sandbox/src/middleware/auth.js", forbidden: true },
    { pattern: /createAdminAuth/i, file: "sandbox/src/middleware/auth.js", forbidden: true },
    { pattern: /createAdminAuth/i, file: "sandbox/server.js", forbidden: true },

    // Config Enforcement (Must exist)
    { pattern: /validateEnv/i, file: "sandbox/server.js", forbidden: false },
    { pattern: /requireJWT/i, file: "sandbox/src/middleware/auth.js", forbidden: false },
    { pattern: /requireRole/i, file: "sandbox/src/middleware/auth.js", forbidden: false },
    { pattern: /requireJWT/i, file: "sandbox/src/routes/dashboard.js", forbidden: false },
    { pattern: /requireRole/i, file: "sandbox/src/routes/dashboard.js", forbidden: false },
    { pattern: /requireJWT/i, file: "sandbox/src/routes/admin_api_v2.js", forbidden: false },
    { pattern: /requireRole/i, file: "sandbox/src/routes/admin_api_v2.js", forbidden: false },
    { pattern: /requireJWT/i, file: "sandbox/src/routes/ui.js", forbidden: false },
    { pattern: /DB_TYPE/, file: "sandbox/src/config/validateEnv.js", forbidden: false },
    { pattern: /getValidatedDB/, file: "sandbox/src/db/index.js", forbidden: false },
    { pattern: /getValidatedDB/, file: "sandbox/server.js", forbidden: false },
    { pattern: /TriageEngine/, file: "sandbox/src/ops-agent/triage.js", forbidden: false },
    { pattern: /TriageEngine/, file: "sandbox/tools/self_heal.js", forbidden: false },

    // B1: Postgres Enforcement
    { pattern: /DB_TYPE=sqlite is forbidden/i, file: "sandbox/src/config/validateEnv.js", forbidden: false },
    { pattern: /Production requires DATABASE_URL/i, file: "sandbox/src/db/index.js", forbidden: false },
    { pattern: /process\.env\.DATABASE_URL/, file: "sandbox/src/db/index.js", forbidden: false }
];

checks.forEach(check => {
    try {
        const content = fs.readFileSync(check.file, 'utf8');
        const match = check.pattern.test(content);

        if (check.forbidden) {
            if (match) {
                console.error(`[FAIL] Forbidden pattern found: '${check.pattern}' in ${check.file}`);
                failures++;
            } else {
                console.log(`[PASS] Forbidden pattern absent: '${check.pattern}' in ${check.file}`);
            }
        } else {
            if (!match) {
                console.error(`[FAIL] Required pattern missing: '${check.pattern}' in ${check.file}`);
                failures++;
            } else {
                console.log(`[PASS] Required pattern found: '${check.pattern}' in ${check.file}`);
            }
        }
    } catch (e) {
        console.error(`[FAIL] Could not read file: ${check.file} (${e.message})`);
        failures++;
    }
});

console.log(`[SELF-TEST] Finished with ${failures} failures.`);
if (failures > 0) process.exit(1);
process.exit(0);
