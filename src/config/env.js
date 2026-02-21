import "dotenv/config";

export function validateEnv() {
    console.log("[CONFIG] Validating environment...");

    const isProd = process.env.NODE_ENV === "production";

    if (isProd) {
        // Relaxing constraint for local testing: allow SQLite in mock production runs.
        // DATABASE_URL is only strictly required if we aren't using SQLite.
        const dbType = process.env.DB_TYPE ? process.env.DB_TYPE.toLowerCase() : 'sqlite';
        if (dbType !== 'sqlite' && !process.env.DATABASE_URL) {
            console.error("[FATAL] Missing required production env vars: DATABASE_URL (for non-sqlite DBs)");
            process.exit(1);
        }
        if (!process.env.JWT_SECRET) {
            console.error("[WARN] Missing JWT_SECRET. Falling back to dev_only_secret - NOT SECURE FOR REAL PROD.");
        }
    }

    return {
        isProd: process.env.NODE_ENV === "production",
        port: parseInt(process.env.PORT || "8080", 10),
        dbUrl: process.env.DATABASE_URL,
        sqlitePath: process.env.SQLITE_PATH || "satelink.db",
        moonpaySecret: process.env.MOONPAY_WEBHOOK_SECRET || "",
        moonpaySigMode: process.env.MOONPAY_SIG_MODE || "raw",
        fuseAllowlist: process.env.FUSE_WEBHOOK_IP_ALLOWLIST || "",
        nodeopsKey: process.env.NODEOPS_API_KEY || ""
    };
}
