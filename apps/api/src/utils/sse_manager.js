
// Phase K5: SSE Load Protection
// This class tracks active SSE connections and enforcing limits.
// Singleton-ish pattern usage in stream_api.js

export class SSEManager {
    constructor() {
        this.activeConnections = new Map(); // IP -> Set<res>
        this.totalConnections = 0;
        this.MAX_PER_IP = 10;
        this.MAX_TOTAL = 500;
    }

    add(req, res) {
        // IP identifier
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Check Limits
        if (this.totalConnections >= this.MAX_TOTAL) {
            return false;
        }

        if (!this.activeConnections.has(ip)) {
            this.activeConnections.set(ip, new Set());
        }

        const userConns = this.activeConnections.get(ip);
        if (userConns.size >= this.MAX_PER_IP) {
            return false;
        }

        // Add
        userConns.add(res);
        this.totalConnections++;

        // Cleanup on close
        res.on('close', () => {
            this.remove(ip, res);
        });

        return true;
    }

    remove(ip, res) {
        if (this.activeConnections.has(ip)) {
            const userConns = this.activeConnections.get(ip);
            if (userConns.delete(res)) {
                this.totalConnections--;
            }
            if (userConns.size === 0) {
                this.activeConnections.delete(ip);
            }
        }
    }

    getStats() {
        return {
            total: this.totalConnections,
            unique_ips: this.activeConnections.size
        };
    }
}
