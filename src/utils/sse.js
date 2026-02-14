
/**
 * SSE Utility Helper
 */
const MAX_CONNS_PER_IP = 10;
const activeConnections = new Map(); // IP -> Set<Response>

export const sseHelper = {
    init: (req, res) => {
        const ip = req.ip || 'unknown';

        if (!activeConnections.has(ip)) {
            activeConnections.set(ip, new Set());
        }

        const ipConns = activeConnections.get(ip);
        if (ipConns.size >= MAX_CONNS_PER_IP) {
            console.warn(`[SSE] Max connections exceeded for IP ${ip}`);
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Too many SSE connections' }));
            return null;
        }

        ipConns.add(res);

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no' // Nginx support
        });

        // Send "hello" event immediately
        res.write(`event: hello\ndata: "connected"\n\n`);

        // Send "ping" every 15s to keep alive
        const heartbeat = setInterval(() => {
            res.write(`event: ping\ndata: ${Date.now()}\n\n`);
        }, 15000);

        // Cleanup on close
        req.on('close', () => {
            clearInterval(heartbeat);
            ipConns.delete(res);
            if (ipConns.size === 0) activeConnections.delete(ip);
            res.end();
            // console.log(`[SSE] Client disconnected: ${req.user?.wallet || 'anon'} (${ip})`);
        });

        return {
            send: (event, data) => {
                res.write(`event: ${event}\n`);
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            },
            close: () => {
                clearInterval(heartbeat);
                ipConns.delete(res);
                if (ipConns.size === 0) activeConnections.delete(ip);
                res.end();
            }
        };
    }
};
