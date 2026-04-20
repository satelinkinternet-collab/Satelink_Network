/**
 * Production Readiness Checklist
 *
 * Validates all subsystems are properly configured and operational
 * before the platform accepts production traffic. Run via CLI or
 * mounted at /ops/readiness (admin-only).
 */

import { logger } from '../monitoring/logger.js';

const CHECKS = [
    // ── Environment & Config ──────────────────────────────────────
    {
        name: 'env_node_env',
        category: 'config',
        description: 'NODE_ENV is set to production',
        check: () => process.env.NODE_ENV === 'production',
        severity: 'critical'
    },
    {
        name: 'env_jwt_secret',
        category: 'config',
        description: 'JWT_SECRET is configured and strong (64+ chars)',
        check: () => {
            const s = process.env.JWT_SECRET;
            return s && s.length >= 64 && !s.toLowerCase().includes('dev');
        },
        severity: 'critical'
    },
    {
        name: 'env_jwt_refresh',
        category: 'config',
        description: 'JWT_REFRESH_SECRET is configured',
        check: () => !!process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length >= 64,
        severity: 'critical'
    },
    {
        name: 'env_ip_hash_salt',
        category: 'config',
        description: 'IP_HASH_SALT is configured',
        check: () => !!process.env.IP_HASH_SALT && !process.env.IP_HASH_SALT.includes('dev_salt'),
        severity: 'critical'
    },
    {
        name: 'env_password_salt',
        category: 'config',
        description: 'PASSWORD_SALT is configured',
        check: () => !!process.env.PASSWORD_SALT && !process.env.PASSWORD_SALT.includes('dev_salt'),
        severity: 'critical'
    },

    // ── Database ──────────────────────────────────────────────────
    {
        name: 'db_type',
        category: 'database',
        description: 'Database is PostgreSQL (not SQLite)',
        check: () => process.env.DB_TYPE !== 'sqlite',
        severity: 'critical'
    },
    {
        name: 'db_url',
        category: 'database',
        description: 'DATABASE_URL is configured',
        check: () => !!process.env.DATABASE_URL,
        severity: 'critical'
    },
    {
        name: 'db_connection',
        category: 'database',
        description: 'Database is reachable',
        check: (ctx) => {
            try {
                ctx.db.prepare('SELECT 1').get();
                return true;
            } catch { return false; }
        },
        severity: 'critical'
    },

    // ── Redis / Queue ─────────────────────────────────────────────
    {
        name: 'redis_url',
        category: 'infrastructure',
        description: 'REDIS_URL is configured',
        check: () => !!process.env.REDIS_URL,
        severity: 'critical'
    },

    // ── Settlement ────────────────────────────────────────────────
    {
        name: 'settlement_adapter',
        category: 'blockchain',
        description: 'Settlement adapter is not SIMULATED',
        check: () => process.env.SETTLEMENT_ADAPTER !== 'SIMULATED',
        severity: 'critical'
    },
    {
        name: 'settlement_rpc',
        category: 'blockchain',
        severity: 'warn'
    },
    {
        name: 'settlement_contract',
        category: 'blockchain',
        description: 'Contract addresses are configured',
        check: () => !!process.env.NODE_REGISTRY_ADDRESS || !!process.env.REVENUE_DISTRIBUTOR_ADDRESS,
        severity: 'warn'
    },

    // ── Security ──────────────────────────────────────────────────
    {
        name: 'rate_limiting',
        category: 'security',
        description: 'Rate limiting is enabled',
        check: () => process.env.DISABLE_RATE_LIMIT !== 'true',
        severity: 'critical'
    },
    {
        name: 'cors_origin',
        category: 'security',
        description: 'CORS origin is restricted (not wildcard)',
        check: () => {
            const origin = process.env.CORS_ORIGIN;
            return !origin || origin !== '*';
        },
        severity: 'warn'
    },

    // ── Monitoring ────────────────────────────────────────────────
    {
        name: 'logging_level',
        category: 'monitoring',
        description: 'Log level is info or warn (not debug)',
        check: () => {
            const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
            return level !== 'debug' && level !== 'trace';
        },
        severity: 'warn'
    },

    // ── Node Network ──────────────────────────────────────────────
    {
        name: 'active_nodes',
        category: 'network',
        description: 'At least one node is registered and active',
        check: (ctx) => {
            try {
                const row = ctx.db.prepare("SELECT COUNT(*) as cnt FROM registered_nodes WHERE active = 1").get();
                return (row?.cnt || 0) > 0;
            } catch { return false; }
        },
        severity: 'warn'
    },

    // ── Memory ────────────────────────────────────────────────────
    {
        name: 'memory_headroom',
        category: 'runtime',
        description: 'Heap usage below 512MB at startup',
        check: () => process.memoryUsage().heapUsed / 1024 / 1024 < 512,
        severity: 'warn'
    }
];

/**
 * Run all production readiness checks.
 * @param {object} ctx - Context object with { db }
 * @returns {{ passed: number, failed: number, warnings: number, results: Array }}
 */
export function runChecklist(ctx = {}) {
    const results = [];
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const check of CHECKS) {
        let ok = false;
        try {
            ok = check.check(ctx);
        } catch {
            ok = false;
        }

        const status = ok ? 'pass' : (check.severity === 'critical' ? 'FAIL' : 'WARN');

        if (ok) passed++;
        else if (check.severity === 'critical') failed++;
        else warnings++;

        results.push({
            name: check.name,
            category: check.category,
            description: check.description,
            status,
            severity: check.severity
        });
    }

    return {
        ready: failed === 0,
        passed,
        failed,
        warnings,
        total: CHECKS.length,
        results
    };
}

/**
 * Print checklist to console (for CLI usage).
 */
export function printChecklist(ctx = {}) {
    const report = runChecklist(ctx);

    console.log('\n=== Satelink Production Readiness Checklist ===\n');

    const categories = [...new Set(CHECKS.map(c => c.category))];
    for (const cat of categories) {
        console.log(`  [${cat.toUpperCase()}]`);
        for (const r of report.results.filter(r => r.category === cat)) {
            const icon = r.status === 'pass' ? 'PASS' : r.status === 'WARN' ? 'WARN' : 'FAIL';
            console.log(`    [${icon}] ${r.description}`);
        }
        console.log('');
    }

    console.log(`  Score: ${report.passed}/${report.total} passed, ${report.failed} critical failures, ${report.warnings} warnings`);
    console.log(`  Production Ready: ${report.ready ? 'YES' : 'NO'}\n`);

    return report;
}

/**
 * Express route handler for /ops/readiness
 */
export function readinessHandler(db) {
    return (req, res) => {
        const report = runChecklist({ db });

        if (report.ready) {
            logger.info('Production readiness check passed', { passed: report.passed, total: report.total });
        } else {
            logger.warn('Production readiness check FAILED', { failed: report.failed, warnings: report.warnings });
        }

        res.status(report.ready ? 200 : 503).json(report);
    };
}
