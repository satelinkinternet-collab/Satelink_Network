import crypto from 'crypto';

/**
 * Canonical JSON Stringify
 * Ensures stable key ordering for consistent hashing.
 */
export function canonicalStringify(obj) {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        return JSON.stringify(obj);
    }

    // Sort keys alphabetically
    const sortedKeys = Object.keys(obj).sort();
    const result = {};
    for (const key of sortedKeys) {
        const val = obj[key];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            result[key] = canonicalStringify(val); // Internal objects get stringified early or handled recursively?
            // Actually, for full canonical, we need to recursively handle objects.
        } else {
            result[key] = val;
        }
    }

    // Since result has sorted keys, a simple stringify with a replacer could work, 
    // but better to manually build or handle recursion correctly.

    return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Recursively sort object keys for canonical representation
 */
export function sortObject(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sortObject);
    }
    return Object.keys(obj).sort().reduce((acc, key) => {
        acc[key] = sortObject(obj[key]);
        return acc;
    }, {});
}

export function canonicalJSON(obj) {
    return JSON.stringify(sortObject(obj));
}

export function sha256Hex(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

export function hashObject(obj) {
    return sha256Hex(canonicalJSON(obj));
}
