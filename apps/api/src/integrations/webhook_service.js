import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class WebhookService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Dispatch an event to all subscribed partners
     */
    async dispatchEvent(eventType, payload, partnerId = null) {
        // Find webhooks interested in this event
        // If partnerId is provided, only send to that partner (e.g. op_completed)
        // If global event (e.g. network_update), send to all? (Not scoped for now)

        let query = `SELECT * FROM partner_webhooks WHERE enabled = 1`;
        const args = [];

        if (partnerId) {
            query += ` AND partner_id = ?`;
            args.push(partnerId);
        }

        const webhooks = await this.db.query(query, args);

        for (const wh of webhooks) {
            const events = JSON.parse(wh.events_json || '[]');
            if (events.includes(eventType)) {
                await this._queueDelivery(wh, eventType, payload);
            }
        }
    }

    async _queueDelivery(webhook, eventType, payload) {
        const attemptId = uuidv4();
        const now = Date.now();

        console.log(`[Webhook] Queuing ${eventType} for ${webhook.id}`);

        await this.db.query(`
            INSERT INTO webhook_delivery_attempts 
            (id, webhook_id, event_type, payload_json, status, created_at, next_retry_at)
            VALUES (?, ?, ?, ?, 'pending', ?, ?)
        `, [attemptId, webhook.id, eventType, JSON.stringify(payload), now, now]);

        // In a real message queue system, we'd trigger a worker. 
        // Here we attempt immediately async
        this._attemptDelivery(attemptId).catch(console.error);
    }

    async _attemptDelivery(attemptId) {
        const attempt = await this.db.get(`
            SELECT a.*, w.url, w.secret_hash 
            FROM webhook_delivery_attempts a
            JOIN partner_webhooks w ON a.webhook_id = w.id
            WHERE a.id = ?
        `, [attemptId]);

        if (!attempt) return;

        try {
            const signature = this._signPayload(attempt.payload_json, attempt.secret_hash);

            // Allow self-signed certs for local dev/testing if needed
            // import axios or fetch
            const fetch = (await import('node-fetch')).default; // Dynamic import for node-fetch if needed or use global fetch in Node 18+

            const res = await fetch(attempt.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Satelink-Signature': signature,
                    'X-Satelink-Event': attempt.event_type
                },
                body: attempt.payload_json
            });

            if (res.ok) {
                await this.db.query(
                    `UPDATE webhook_delivery_attempts SET status = 'success', last_attempt_at = ? WHERE id = ?`,
                    [Date.now(), attemptId]
                );
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (e) {
            // Retry logic
            const nextRetry = this._calculateNextRetry(attempt.attempt_count);
            const status = nextRetry ? 'retrying' : 'failed';

            await this.db.query(`
                UPDATE webhook_delivery_attempts 
                SET status = ?, error_message = ?, attempt_count = attempt_count + 1, last_attempt_at = ?, next_retry_at = ?
                WHERE id = ?
            `, [status, e.message, Date.now(), nextRetry, attemptId]);
        }
    }

    _signPayload(payloadString, secret) {
        // secret_hash in DB is actually the secret itself for HMAC? 
        // Or if it's hashed, we can't use it to sign. 
        // Usually we store the secret encrypted or plain if we need to sign. 
        // For this MVP let's assume 'secret_hash' holds the actual secret string provided by user.
        return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
    }

    _calculateNextRetry(currentAttempts) {
        if (currentAttempts >= 5) return null; // Max 5 retries
        // Exponential backoff: 30s, 60s, 120s...
        return Date.now() + Math.pow(2, currentAttempts) * 1000 * 30;
    }
}
