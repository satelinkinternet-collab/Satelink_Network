// src/config/featureFlags.js

/**
 * Returns the current state of operational feature flags.
 * Defaults are all false.
 */
export function getFeatureFlags() {
    return {
        FLAG_DISABLE_RPC: process.env.FLAG_DISABLE_RPC === 'true',
        FLAG_DISABLE_ADMIN_DIAGNOSTICS: process.env.FLAG_DISABLE_ADMIN_DIAGNOSTICS === 'true',
        FLAG_DISABLE_SIMULATION_ROUTES: process.env.FLAG_DISABLE_SIMULATION_ROUTES === 'true',
        FLAG_READONLY_MODE: process.env.FLAG_READONLY_MODE === 'true'
    };
}

export function isRpcDisabled() {
    return getFeatureFlags().FLAG_DISABLE_RPC;
}

export function isDiagnosticsDisabled() {
    return getFeatureFlags().FLAG_DISABLE_ADMIN_DIAGNOSTICS;
}

export function isSimulationRoutesDisabled() {
    return getFeatureFlags().FLAG_DISABLE_SIMULATION_ROUTES;
}

export function isReadonlyMode() {
    return getFeatureFlags().FLAG_READONLY_MODE;
}
