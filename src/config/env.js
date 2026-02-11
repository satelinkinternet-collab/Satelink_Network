import "dotenv/config";

export function validateEnv() {
    console.log("[CONFIG] Validating environment...");

    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) {
        console.error("FATAL: ADMIN_API_KEY not set. Exiting.");
        process.exit(1);
    }

    if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
        console.error("FATAL: DATABASE_URL required in production. Exiting.");
        process.exit(1);
    }

    return {
        isProd: process.env.NODE_ENV === "production",
        port: parseInt(process.env.PORT || "8080", 10),
        dbUrl: process.env.DATABASE_URL,
        sqlitePath: process.env.SQLITE_PATH || "satelink.db",
        adminApiKey: adminKey,
        moonpaySecret: process.env.MOONPAY_WEBHOOK_SECRET || "",
        moonpaySigMode: process.env.MOONPAY_SIG_MODE || "raw",
        fuseAllowlist: process.env.FUSE_WEBHOOK_IP_ALLOWLIST || "",
        nodeopsKey: process.env.NODEOPS_API_KEY || ""
    };
}
