// src/config/buildInfo.js

/**
 * Returns build metadata for runtime endpoints.
 * @returns {{ version: string, commit: string, buildTime: string }}
 */
export function getBuildInfo() {
    return {
        version: process.env.npm_package_version || "1.0.0",
        commit: process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
        buildTime: process.env.BUILD_TIME || "unknown"
    };
}
