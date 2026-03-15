export function validateEnv() {
    const errors = [];

    // ── Required in ALL environments ──────────────────────────────────
    const requiredVars = ['JWT_SECRET', 'NODE_ENV'];
    for (const variable of requiredVars) {
        if (!process.env[variable]) {
            errors.push(`${variable} is not defined`);
        }
    }

    // JWT Length assertion
    const secret = process.env.JWT_SECRET;
    if (secret && secret.length < 64) {
        errors.push(`JWT_SECRET is too short (${secret.length} chars). Minimum 64 chars required.`);
    }

    // JWT Refresh Secret
    if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 64) {
        errors.push(`JWT_REFRESH_SECRET is too short. Minimum 64 chars required.`);
    }

    // ── Production-only checks ────────────────────────────────────────
    if (process.env.NODE_ENV === "production") {
        // Database
        if (process.env.DB_TYPE === "sqlite") {
            errors.push("SQLite is not allowed in production");
        }
        if (!process.env.DATABASE_URL) {
            errors.push("DATABASE_URL must be provided in production");
        }

        // Required secrets in production
        const prodRequired = ['JWT_REFRESH_SECRET', 'IP_HASH_SALT', 'PASSWORD_SALT'];
        for (const v of prodRequired) {
            if (!process.env[v]) {
                errors.push(`${v} must be provided in production`);
            }
        }

        // Dev-only secret detection — block known dev values
        const devPatterns = ['dev_secret', 'dev_salt', 'dev_refresh', 'local_use', 'changeme', 'password'];
        for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'IP_HASH_SALT', 'PASSWORD_SALT']) {
            const val = process.env[key];
            if (val && devPatterns.some(p => val.toLowerCase().includes(p))) {
                errors.push(`${key} appears to contain a dev/test value — use real secrets in production`);
            }
        }

        // Redis required in production
        if (!process.env.REDIS_URL) {
            errors.push("REDIS_URL must be provided in production");
        }

        // Settlement adapter should be EVM in production
        if (process.env.SETTLEMENT_ADAPTER === 'SIMULATED') {
            errors.push("SETTLEMENT_ADAPTER cannot be SIMULATED in production");
        }
    }

    // ── Report errors ─────────────────────────────────────────────────
    if (errors.length > 0) {
        console.error('\n=== Environment Validation Failed ===');
        for (const err of errors) {
            console.error(`  ❌ ${err}`);
        }
        console.error(`\n${errors.length} error(s) found. Fix before starting.\n`);
        process.exit(1);
    }

    console.log(`✅ Environment validated (${process.env.NODE_ENV})`);
}
