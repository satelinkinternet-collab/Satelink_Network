import dotenv from "dotenv";

// Load .env file if it exists (local dev). On Railway/production, env vars
// are injected directly into process.env — no file needed.
dotenv.config({ path: ".env" });

export function validateEnv() {
    console.log("[CONFIG] Validating environment...");

    if (!process.env.DATABASE_URL) {
        console.error("[FATAL] Missing required DATABASE_URL. PostgreSQL is now mandatory.");
        process.exit(1);
    }

    if (!process.env.JWT_SECRET) {
        console.error("[FATAL] Missing JWT_SECRET. Set it in .env or environment.");
        process.exit(1);
    }

    if (!process.env.PASSWORD_SALT) {
        console.error("[FATAL] Missing PASSWORD_SALT. Required for password hashing. Set it in .env or environment.");
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
