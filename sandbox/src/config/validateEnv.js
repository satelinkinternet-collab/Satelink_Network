
export default function validateEnv() {
    const isProd = process.env.NODE_ENV === "production";
    if (!isProd) return;

    const required = ["JWT_SECRET", "DATABASE_URL"];
    const missing = required.filter(
        (k) => !process.env[k] || String(process.env[k]).trim() === ""
    );

    if (missing.length) {
        console.error("[FATAL] Missing required env vars for production:", missing.join(", "));
        process.exit(1);
    }

    if (process.env.DB_TYPE !== 'postgres') {
        console.error("[FATAL] DB_TYPE must be 'postgres' in production.");
        process.exit(1);
    }
}
