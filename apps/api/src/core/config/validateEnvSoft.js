// src/config/validateEnvSoft.js
import { isLive } from './mode.js';

export function validateEnvSoft() {
    let ok = true;
    const warnings = [];

    const mode = isLive() ? 'live' : 'simulation';

    if (mode === 'live') {
        if (!process.env.JWT_SECRET) warnings.push("Missing JWT_SECRET in LIVE mode");
        if (!process.env.DATABASE_URL) warnings.push("Missing DATABASE_URL in LIVE mode");
        if (!process.env.TREASURY_ADDRESS) warnings.push("Missing TREASURY_ADDRESS in LIVE mode");
    } else {
        if (!process.env.JWT_SECRET) warnings.push("Missing JWT_SECRET in SIMULATION mode");
    }

    if (warnings.length > 0) {
        ok = false;
        console.warn("\n=======================================================");
        console.warn("||             SOFT ENVIRONMENT WARNINGS             ||");
        warnings.forEach(w => console.warn(`||   [WARN] ${w.padEnd(46)} ||`));
        console.warn("=======================================================\n");
    }

    return { ok, warnings };
}
