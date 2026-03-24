export function validateEnv() {
    const requiredVars = ['JWT_SECRET', 'NODE_ENV'];

    // Check baseline envs
    for (const variable of requiredVars) {
        if (!process.env[variable]) {
            console.error(`❌ ${variable} is not defined`);
            process.exit(1);
        }
    }

    // JWT Length assertion
    const secret = process.env.JWT_SECRET;
    if (secret && secret.length < 64) {
        console.error(`❌ JWT_SECRET is too short (${secret.length} chars). Minimum 64 chars required.`);
        process.exit(1);
    }

    // Enforce PostgreSQL — SQLite is not allowed in any environment
    if (process.env.DB_TYPE === "sqlite") {
        console.error("❌ SQLite is not allowed. Set DB_TYPE=postgres and provide DATABASE_URL.");
        process.exit(1);
    }

    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL must be provided. PostgreSQL is the only supported database.");
        process.exit(1);
    }

    console.log("[CONFIG] Environment validated — PostgreSQL enforced");
}
