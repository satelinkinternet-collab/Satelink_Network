import "dotenv/config";

export function validateEnv() {
    console.log("[CONFIG] Validating environment...");

    // DATABASE_URL is required in all environments — PostgreSQL only
    if (!process.env.DATABASE_URL) {
        console.error("[FATAL] Missing DATABASE_URL. PostgreSQL is the only supported database.");
        process.exit(1);
    }

    if (process.env.DB_TYPE === "sqlite") {
        console.error("[FATAL] SQLite is not allowed. Use DB_TYPE=postgres.");
        process.exit(1);
    }

    if (!process.env.JWT_SECRET) {
        console.error("[FATAL] Missing JWT_SECRET. Set it in .env or environment. No fallbacks allowed.");
        process.exit(1);
    }

    return {
        isProd: process.env.NODE_ENV === "production",
        port: parseInt(process.env.PORT || "8080", 10),
        dbUrl: process.env.DATABASE_URL,
        moonpaySecret: process.env.MOONPAY_WEBHOOK_SECRET || "",
        moonpaySigMode: process.env.MOONPAY_SIG_MODE || "raw",
        fuseAllowlist: process.env.FUSE_WEBHOOK_IP_ALLOWLIST || "",
        nodeopsKey: process.env.NODEOPS_API_KEY || ""
    };
}
