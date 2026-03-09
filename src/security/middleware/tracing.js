import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const IP_SALT = process.env.IP_HASH_SALT || 'satelink_default_salt_change_me';

export const tracingMiddleware = (req, res, next) => {
    // 1. Generate or Propagate Trace ID
    const traceId = req.headers['x-trace-id'] || uuidv4();
    const requestId = req.headers['x-request-id'] || uuidv4();

    req.traceId = traceId;
    req.requestId = requestId;

    // Attach to response headers
    res.setHeader('X-Trace-ID', traceId);
    res.setHeader('X-Request-ID', requestId);

    const start = performance.now();

    // 2. Capture Response Finish
    res.on('finish', () => {
        const duration = Math.round(performance.now() - start);
        const { method, originalUrl, route } = req;
        const statusCode = res.statusCode;

        // Extract Identity (if auth middleware ran)
        const clientId = req.user?.id || req.user?.wallet || null;
        const nodeId = req.node?.node_id || req.node?.wallet || null;

        // Record Trace asynchronously
        recordTrace(req, {
            traceId,
            requestId,
            route: route?.path || originalUrl, // route.path is available if router matched
            method,
            statusCode,
            duration,
            clientId,
            nodeId,
            ip: req.ip
        });
    });

    next();
};

async function recordTrace(req, data) {
    if (!req.opsEngine?.db) return; // Guard against early boot

    // Skip health checks to reduce noise
    if (data.route.includes('/health') || data.route.includes('/stream')) return;

    try {
        const db = req.opsEngine.db;
        // Obscure IP
        const ipHash = crypto.createHash('sha256').update(data.ip + IP_SALT).digest('hex').substring(0, 16);

        // We use direct DB exec if possible or query
        // "INSERT INTO request_traces ..."
        await db.query(`
            INSERT INTO request_traces (trace_id, request_id, route, method, status_code, duration_ms, client_id, node_id, ip_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.traceId,
            data.requestId,
            data.route,
            data.method,
            data.statusCode,
            data.duration,
            data.clientId,
            data.nodeId,
            ipHash,
            Date.now()
        ]);
    } catch (e) {
        // Silent fail for telemetry
        // console.error("Trace Log Error", e.message);
    }
}
