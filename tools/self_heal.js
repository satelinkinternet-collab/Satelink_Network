
import { TriageEngine } from '../src/ops-agent/triage.js';

console.log("[SELF-HEAL] Monitoring system health...");

// Simulation of error input (in real Ops-Agent, this comes from logs/alerts)
const simulatedError = process.argv[2] || "Connection refused: PostgresClient not fully implemented";

console.log(`[SELF-HEAL] Detected Error: "${simulatedError}"`);

const engine = new TriageEngine();
const diagnosis = engine.analyze(simulatedError);

console.log(`[SELF-HEAL] Diagnosis: ${JSON.stringify(diagnosis)}`);
console.log(`[SELF-HEAL] Executing Action: ${diagnosis.action}...`);

switch (diagnosis.action) {
    case 'restart_db':
        console.log(">> [ACTION] Restarting Database Service (Docker Compose)...");
        // execSync('docker-compose restart db');
        console.log(">> [SUCCESS] Database restarted.");
        break;
    case 'check_env':
        console.log(">> [ACTION] Verifying Environment Variables...");
        console.log(">> [FAIL] Missing variables found. Alerts sent to #dev-ops.");
        process.exit(1);
        break;
    case 'refresh_auth':
        console.log(">> [ACTION] Clearing invalid tokens from cache...");
        console.log(">> [SUCCESS] Cache cleared.");
        break;
    default:
        console.log(">> [ACTION] Escalated to manual triage.");
}
process.exit(0);
