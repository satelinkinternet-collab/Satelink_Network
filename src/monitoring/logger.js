import pino from 'pino';

// Initialize Pino logger with pretty printing for development
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
        }
    } : undefined
});

/**
 * LoggerService provides structured logging with optional database persistence.
 * Primarily used for auditing critical events (errors, webhooks).
 */
export class LoggerService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Log an error event with optional database persistence and Pino output.
     */
    async error(source, message, opts = {}) {
        const { route, meta, level = 'error' } = opts;

        // Output to Pino
        logger.error({ source, route, ...meta }, message);

        if (!this.db) return;

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
            // Use internal logger for failures to log to DB
            logger.error({ err: e }, "FAILED TO WRITE TO DB LOG");
        }
    }

    /**
     * Log a webhook event to the database.
     */
    async webhook(provider, eventId, status, details = {}) {
        const { amount_usdt, payer_wallet, source_type } = details;

        logger.info({ provider, eventId, status }, "Webhook received");

        if (!this.db) return;

        try {
            await this.db.query(
                `INSERT INTO webhook_logs (ts, provider, event_id, status, amount_usdt, payer_wallet, source_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [Date.now(), provider, eventId, status, amount_usdt || 0, payer_wallet, source_type]
            );
        } catch (e) {
            logger.error({ err: e }, "FAILED TO WRITE WEBHOOK LOG");
        }
    }

    async getRecentErrors(limit = 50) {
        return this.db.query(`SELECT * FROM error_logs ORDER BY ts DESC LIMIT ?`, [limit]);
    }

    async getRecentWebhooks(limit = 20) {
        return this.db.query(`SELECT * FROM webhook_logs ORDER BY ts DESC LIMIT ?`, [limit]);
    }
}
