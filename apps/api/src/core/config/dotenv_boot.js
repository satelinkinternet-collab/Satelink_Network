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

// 1. Load base .env (no override — first writer wins, standard dotenv behavior)
dotenv.config();

// 2. Load .env.local with override so local values win
const localPath = resolve(process.cwd(), ".env.local");
if (existsSync(localPath)) {
    dotenv.config({ path: localPath, override: true });
}
