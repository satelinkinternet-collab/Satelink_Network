
/**
 * SSE Utility Helper
 */
export const sseHelper = {
    /**
     * Set up headers for SSE
     */
    init: (req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no' // Nginx support
        });

        // Send "hello" event immediately
        res.write(`event: hello\ndata: "connected"\n\n`);

        // Send "ping" every 15s
        const heartbeat = setInterval(() => {
            res.write(`event: ping\ndata: ${Date.now()}\n\n`);
        }, 15000);

        // Cleanup on close
        req.on('close', () => {
            clearInterval(heartbeat);
            res.end();
            console.log(`[SSE] Client disconnected: ${req.user?.wallet || 'anon'}`);
        });

        return {
            send: (event, data) => {
                res.write(`event: ${event}\n`);
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            },
            close: () => {
                clearInterval(heartbeat);
                res.end();
            }
        };
    }
};
