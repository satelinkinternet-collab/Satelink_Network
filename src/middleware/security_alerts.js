import crypto from 'crypto';

/**
 * Security Alert Generator — Minimal v1
 * Creates security_alerts rows for suspicious patterns.
 */

const IP_SALT = process.env.IP_HASH_SALT || 'satelink_default_salt_change_me';

// In-memory rate tracking (reset on restart — good enough for MVP)
const rateLimitHits = new Map();   // clientId -> { count, firstSeen }
const authFailures = new Map();    // ipHash -> { count, firstSeen }
const nodeFailures = new Map();    // nodeId -> { count, firstSeen }

const WINDOW_MS = 5 * 60 * 1000;  // 5 min window
const RATE_THRESHOLD = 20;         // 20 rate limits in window
const AUTH_FAIL_THRESHOLD = 10;    // 10 auth failures in window
const NODE_FAIL_THRESHOLD = 15;    // 15 failures in window

function hashIp(ip) {
    return crypto.createHash('sha256').update(ip + IP_SALT).digest('hex').substring(0, 16);
}

function pruneMap(map) {
    const now = Date.now();
    for (const [key, val] of map) {
        if (now - val.firstSeen > WINDOW_MS) map.delete(key);
    }
}

async function createAlert(db, { severity, category, entity_type, entity_id, title, evidence }) {
    try {
        await db.query(`
            INSERT INTO security_alerts (severity, category, entity_type, entity_id, title, evidence_json, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
        `, [severity, category, entity_type, entity_id, title, JSON.stringify(evidence), Date.now()]);
    } catch (e) {
        console.error('[SecurityAlert] Failed to create alert:', e.message);
    }
}

/**
 * Record a rate-limit hit for a client. If threshold exceeded, create alert.
 */
export async function recordRateLimitHit(db, clientId, route) {
    if (!clientId || !db) return;
    pruneMap(rateLimitHits);

    const entry = rateLimitHits.get(clientId) || { count: 0, firstSeen: Date.now(), alerted: false };
    entry.count++;
    rateLimitHits.set(clientId, entry);

    if (entry.count >= RATE_THRESHOLD && !entry.alerted) {
        entry.alerted = true;
        await createAlert(db, {
            severity: 'med',
            category: 'abuse',
            entity_type: 'builder',
            entity_id: clientId,
            title: `Rate limit exceeded repeatedly: ${clientId}`,
            evidence: { hits: entry.count, route, window_ms: WINDOW_MS }
        });
    }
}

/**
 * Record an auth failure. If threshold exceeded, create alert.
 */
export async function recordAuthFailure(db, ip) {
    if (!ip || !db) return;
    pruneMap(authFailures);

    const ipHash = hashIp(ip);
    const entry = authFailures.get(ipHash) || { count: 0, firstSeen: Date.now(), alerted: false };
    entry.count++;
    authFailures.set(ipHash, entry);

    if (entry.count >= AUTH_FAIL_THRESHOLD && !entry.alerted) {
        entry.alerted = true;
        await createAlert(db, {
            severity: 'high',
            category: 'auth',
            entity_type: 'system',
            entity_id: ipHash,
            title: `Repeated invalid JWT from IP hash: ${ipHash}`,
            evidence: { failures: entry.count, ip_hash: ipHash, window_ms: WINDOW_MS }
        });
    }
}

/**
 * Record a node operation failure. If threshold exceeded, create alert.
 */
export async function recordNodeFailure(db, nodeId, error) {
    if (!nodeId || !db) return;
    pruneMap(nodeFailures);

    const entry = nodeFailures.get(nodeId) || { count: 0, firstSeen: Date.now(), alerted: false };
    entry.count++;
    nodeFailures.set(nodeId, entry);

    if (entry.count >= NODE_FAIL_THRESHOLD && !entry.alerted) {
        entry.alerted = true;
        await createAlert(db, {
            severity: 'high',
            category: 'infra',
            entity_type: 'node',
            entity_id: nodeId,
            title: `High failure rate for node: ${nodeId}`,
            evidence: { failures: entry.count, last_error: error, window_ms: WINDOW_MS }
        });
    }
}
