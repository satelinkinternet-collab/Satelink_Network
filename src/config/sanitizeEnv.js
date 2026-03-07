// src/config/sanitizeEnv.js
import { getMode } from './mode.js';

/**
 * Returns a sanitized snapshot of critical environment variable configurations.
 * Crucially, relies STRICTLY on boolean mapping without logging or leaking ACTUAL values.
 * 
 * @returns {Record<string, { isSet: boolean, label: string }>} 
 */
export function getSanitizedEnvSnapshot() {
    const keysToCheck = [
        'SATELINK_MODE',
        'DATABASE_URL',
        'JWT_SECRET',
        'TREASURY_ADDRESS',
        'RPC_DEFAULT_TARGET',
        'CLAIM_EXPIRY_DAYS',
        'MOONPAY_WEBHOOK_SECRET',
        'FUSE_WEBHOOK_IP_ALLOWLIST',
        'NODEOPS_API_KEY'
    ];

    const snapshot = {
        mode: getMode()
    };

    keysToCheck.forEach(key => {
        const isSet = !!process.env[key] && process.env[key].trim() !== '';
        snapshot[key] = {
            isSet,
            label: isSet ? "configured" : "missing"
        };
    });

    return snapshot;
}
