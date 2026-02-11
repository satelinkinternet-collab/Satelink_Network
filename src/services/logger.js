
export class LoggerService {
    constructor(db) {
        this.db = db;
    }

    async error(source, message, opts = {}) {
        const { route, meta, level = 'error' } = opts;
        try {
            // Trim stack if present in meta
            if (meta && meta.stack) {
                meta.stack = meta.stack.split('\n').slice(0, 5).join('\n');
            }
            // Redact potential secrets from meta if passing full objects (basic check)
            // Implementation detail: caller should sanitise, but we can do a pass

            await this.db.query(
                `INSERT INTO error_logs (ts, level, source, route, message, meta_json) VALUES (?, ?, ?, ?, ?, ?)`,
                [Date.now(), level, source, route || '', message, JSON.stringify(meta || {})]
            );
        } catch (e) {
            console.error("FAILED TO WRITE TO DB LOG:", e);
            console.error("ORIGINAL ERROR:", message);
        }
    }

    async webhook(provider, eventId, status, details = {}) {
        const { amount_usdt, payer_wallet, source_type } = details;
        try {
            await this.db.query(
                `INSERT INTO webhook_logs (ts, provider, event_id, status, amount_usdt, payer_wallet, source_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [Date.now(), provider, eventId, status, amount_usdt || 0, payer_wallet, source_type]
            );
        } catch (e) {
            console.error("FAILED TO WRITE WEBHOOK LOG:", e);
        }
    }

    async getRecentErrors(limit = 50) {
        return this.db.query(`SELECT * FROM error_logs ORDER BY ts DESC LIMIT ?`, [limit]);
    }

    async getRecentWebhooks(limit = 20) {
        return this.db.query(`SELECT * FROM webhook_logs ORDER BY ts DESC LIMIT ?`, [limit]);
    }
}
