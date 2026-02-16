
export const validateEnv = () => {
    const isProd = process.env.NODE_ENV === "production";

    const required = [
        "JWT_SECRET",
        "DATABASE_URL"
    ];
    const missing = [];


    if (isProd) {
        required.forEach(key => {
            if (!process.env[key]) missing.push(key);
        });

        // Strict DB Type Check
        if (process.env.DB_TYPE !== 'postgres') {
            missing.push("DB_TYPE=postgres (Production requires Postgres)");
        }

        if (missing.length > 0) {
            console.error(`[FATAL] Missing required production env vars or config: ${missing.join(", ")}`);
            process.exit(1);
        }
    }

    return {
        port: process.env.PORT || 8080,
        isProd,
        jwtSecret: process.env.JWT_SECRET || (isProd ? null : "insecure_dev_secret_replace_immediately"),
        dbType: process.env.DB_TYPE || 'sqlite',
        dbUrl: process.env.DATABASE_URL
    };
};
