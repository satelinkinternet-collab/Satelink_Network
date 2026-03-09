
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
    { pattern: /JWT_SECRET \|\|/i, file: "src/routes/auth_v2.js", forbidden: true },
    { pattern: /adminKey=/i, file: "src/routes/dashboard.js", forbidden: true },
    { pattern: /process\.env\.ADMIN_API_KEY/i, file: "src/middleware/auth.js", forbidden: true },
    { pattern: /createAdminAuth/i, file: "src/middleware/auth.js", forbidden: true },
    { pattern: /createAdminAuth/i, file: "server.js", forbidden: true },

    // Config Enforcement (Must exist)
    { pattern: /validateEnv/i, file: "server.js", forbidden: false },
    { pattern: /requireJWT/i, file: "src/middleware/auth.js", forbidden: false },
    { pattern: /requireRole/i, file: "src/middleware/auth.js", forbidden: false },
    { pattern: /requireJWT/i, file: "src/routes/dashboard.js", forbidden: false },
    { pattern: /requireRole/i, file: "src/routes/dashboard.js", forbidden: false },
    { pattern: /requireJWT/i, file: "src/routes/admin_api_v2.js", forbidden: false },
    { pattern: /requireRole/i, file: "src/routes/admin_api_v2.js", forbidden: false },
    { pattern: /requireJWT/i, file: "src/routes/ui.js", forbidden: false },
    { pattern: /DB_TYPE/, file: "src/config/env.js", forbidden: false },
    { pattern: /getValidatedDB/, file: "src/db/index.js", forbidden: false },
    { pattern: /getValidatedDB/, file: "server.js", forbidden: false },
    { pattern: /TriageEngine/, file: "src/ops-agent/triage.js", forbidden: false },
    { pattern: /TriageEngine/, file: "tools/self_heal.js", forbidden: false },

    // B1: Postgres Enforcement
    { pattern: /DB_TYPE=sqlite is forbidden/i, file: "src/config/env.js", forbidden: false },
    { pattern: /Production requires DATABASE_URL/i, file: "src/db/index.js", forbidden: false },
    { pattern: /process\.env\.DATABASE_URL/, file: "src/db/index.js", forbidden: false }
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
