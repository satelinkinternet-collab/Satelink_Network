// src/middleware/featureGate.js
import {
    isRpcDisabled,
    isDiagnosticsDisabled,
    isSimulationRoutesDisabled,
    isReadonlyMode
} from '../config/featureFlags.js';

function disabledResponse(res) {
    return res.status(503).json({
        ok: false,
        error: "Temporarily disabled by operator flag"
    });
}

export function rpcGate(req, res, next) {
    if (isRpcDisabled()) {
        return disabledResponse(res);
    }
    next();
}

export function diagnosticsGate(req, res, next) {
    if (isDiagnosticsDisabled()) {
        return disabledResponse(res);
    }
    next();
}

export function simulationGate(req, res, next) {
    if (isSimulationRoutesDisabled()) {
        return disabledResponse(res);
    }
    next();
}

export function readonlyGate(req, res, next) {
    if (isReadonlyMode()) {
        // Block only non-core POST/PUT/DELETE endpoints
        if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
            return disabledResponse(res);
        }
    }
    next();
}
