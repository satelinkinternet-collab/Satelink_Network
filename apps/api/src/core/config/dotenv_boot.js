/**
 * Centralized dotenv bootstrap — loads .env then .env.local (if present) with override.
 * Import this ONCE at the top of every entry point instead of "dotenv/config".
 *
 * Load order:
 *   1. .env          — base config (Docker defaults, shared secrets)
 *   2. .env.local    — local overrides (never committed), wins over .env
 */
import dotenv from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

// 1. Load base .env if it exists (local dev only)
// On Railway/production, env vars are injected directly into process.env
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

// 2. Load .env.local with override so local values win (if it exists)
const localPath = resolve(process.cwd(), ".env.local");
if (existsSync(localPath)) {
    dotenv.config({ path: localPath, override: true });
}
