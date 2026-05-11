import "dotenv/config";

export function validateEnv() {
    console.log("[CONFIG] Validating environment...");

    const isProd = process.env.NODE_ENV === "production";

    if (isProd) {
        if (!process.env.DATABASE_URL) {
            console.error("[FATAL] Missing required production env var: DATABASE_URL (PostgreSQL required)");
            process.exit(1);
        }

        const securityRequired = ["IP_HASH_SALT", "IP_SALT"];
        const missingSecVars = securityRequired.filter(k => !process.env[k]);
        if (missingSecVars.length) {
            console.error("[FATAL] Missing required production security env vars:", missingSecVars.join(", "));
            process.exit(1);
        }
    }

    if (!process.env.JWT_SECRET) {
        console.error("[FATAL] Missing JWT_SECRET.");
        process.exit(1);
    }

    return {
        isProd: process.env.NODE_ENV === "production",
        port: parseInt(process.env.PORT || "8080", 10),
        dbUrl: process.env.DATABASE_URL,
        moonpaySecret: process.env.MOONPAY_WEBHOOK_SECRET || "",
        moonpaySigMode: process.env.MOONPAY_SIG_MODE || "raw",
        nodeopsKey: process.env.NODEOPS_API_KEY || ""
    };
}
