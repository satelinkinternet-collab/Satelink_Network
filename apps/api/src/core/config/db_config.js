/**
 * db_config.js — Single source of truth for database connection resolution.
 *
 * Supports two modes:
 *   MODE A — Docker Full Stack (API inside container)
 *     DB host = "database" (docker service name)
 *   MODE B — Local Dev (npm run dev)
 *     DB host = "127.0.0.1" (IPv4 explicit, avoids ::1 issues)
 *
 * Resolution priority:
 *   1. DATABASE_URL env var (if valid postgres:// URL)
 *   2. Constructed from individual PG_* env vars
 *   3. Auto-detect mode from RUN_CONTEXT or DOCKER_ENV
 */

function resolveDbUrl() {
    // Priority 1: Explicit DATABASE_URL
    const envUrl = process.env.DATABASE_URL;
    if (envUrl && (envUrl.startsWith('postgres://') || envUrl.startsWith('postgresql://'))) {
        // Force IPv4 for localhost connections (avoid ::1 ECONNREFUSED)
        const resolved = envUrl.replace('://localhost:', '://127.0.0.1:');
        return resolved;
    }

    // Priority 2: Construct from individual vars
    const isDocker = process.env.RUN_CONTEXT === 'docker' || process.env.DOCKER_ENV === 'true';
    const host = process.env.POSTGRES_HOST || process.env.DB_HOST || (isDocker ? 'database' : '127.0.0.1');
    const port = process.env.POSTGRES_PORT || process.env.DB_PORT || '5432';
    const user = process.env.POSTGRES_USER || process.env.DB_USER || 'satelink';
    const pass = process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'satelinkpass';
    const name = process.env.POSTGRES_DB || process.env.DB_NAME || 'satelink';

    return `postgresql://${user}:${pass}@${host}:${port}/${name}`;
}

function maskUrl(url) {
    return url.replace(/\/\/[^@]+@/, '//<credentials>@');
}

const DATABASE_URL = resolveDbUrl();

export { DATABASE_URL, resolveDbUrl, maskUrl };
