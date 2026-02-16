
import { fileURLToPath } from 'url';

export class TriageEngine {
    constructor() {
        this.rules = [
            {
                id: 'DB_CONNECTION_FAIL',
                regex: /Condition 'process\.env\.DB_TYPE'|Connection refused|SQLite error|PostgresClient not fully implemented/i,
                severity: 'HIGH',
                action: 'restart_db',
                reason: "Database connectivity issue detected."
            },
            {
                id: 'JWT_EXPIRED',
                regex: /jwt expired|invalid token|signature verification failed/i,
                severity: 'LOW',
                action: 'refresh_auth',
                reason: "User authentication token expired or invalid."
            },
            {
                id: 'MISSING_ENV',
                regex: /Missing required production env/i,
                severity: 'CRITICAL',
                action: 'check_env',
                reason: "Environment misconfiguration detected."
            }
        ];
    }

    analyze(errorLog) {
        for (const rule of this.rules) {
            if (rule.regex.test(errorLog)) {
                return {
                    rule_id: rule.id,
                    severity: rule.severity,
                    action: rule.action,
                    reason: rule.reason,
                    original_error: errorLog.substring(0, 100) + "..."
                };
            }
        }
        return {
            rule_id: 'UNKNOWN',
            severity: 'MEDIUM',
            action: 'escalate',
            reason: "No matching triage rule found.",
            original_error: errorLog.substring(0, 100) + "..."
        };
    }
}

// CLI Support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const errorInput = args.join(' ') || "Unknown error occurred";
    const engine = new TriageEngine();
    const result = engine.analyze(errorInput);
    console.log(JSON.stringify(result, null, 2));
}
