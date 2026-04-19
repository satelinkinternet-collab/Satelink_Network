/**
 * db_config.js — Single source of truth for database connection resolution.
 *
 * Resolution priority:
 *   1. DATABASE_URL env var (used as-is if it's a valid postgres:// URL)
 *   2. Constructed from individual PG_ and DB_ env vars
 *   3. Auto-detect Docker vs local from RUN_CONTEXT / DOCKER_ENV
 *
 * IMPORTANT: This module must NEVER rewrite the hostname in DATABASE_URL.
 * In Docker, the host is a container service name (e.g. "postgres", "database").
 * Replacing it with 127.0.0.1 breaks inter-container networking.
 */

function resolveDbUrl() {
    // Priority 1: Explicit DATABASE_URL — trust it completely
    const envUrl = process.env.DATABASE_URL;
    if (envUrl && (envUrl.startsWith('postgres://') || envUrl.startsWith('postgresql://'))) {
        return envUrl;
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
    if (!url) return '<not set>';
    return url.replace(/\/\/[^@]+@/, '//<credentials>@');
}

const DATABASE_URL = resolveDbUrl();

export { DATABASE_URL, resolveDbUrl, maskUrl };
