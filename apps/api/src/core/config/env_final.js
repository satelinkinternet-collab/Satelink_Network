import "dotenv/config";

export function validateEnvStrict() {
    const isProd = process.env.NODE_ENV === "production";

    console.log("[CONFIG] Validating environment (STRICT)...");

    if (!process.env.JWT_SECRET) {
        console.error("[FATAL] JWT_SECRET is required");
        process.exit(1);
    }

    if (!process.env.DATABASE_URL) {
        console.error("[FATAL] DATABASE_URL is required");
        process.exit(1);
    }

    return {
        isProd,
        port: parseInt(process.env.PORT || "8080", 10),
        dbUrl: process.env.DATABASE_URL,
        treasury: process.env.TREASURY_ADDRESS || "",
        nodeopsKey: process.env.NODEOPS_API_KEY || ""
    };
}
