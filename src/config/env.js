import "dotenv/config";

export function validateEnv() {
    console.log("[CONFIG] Validating environment...");

    const isProd = process.env.NODE_ENV === "production";

    if (isProd) {
        const required = ["JWT_SECRET", "DATABASE_URL"];
        const missing = required.filter(k => !process.env[k]);
        if (missing.length) {
            console.error("[FATAL] Missing required production env vars:", missing.join(", "));
            process.exit(1);
        }
        if (process.env.DB_TYPE && process.env.DB_TYPE.toLowerCase() === 'sqlite') {
            console.error("[FATAL] DB_TYPE=sqlite is forbidden in production.");
            process.exit(1);
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
