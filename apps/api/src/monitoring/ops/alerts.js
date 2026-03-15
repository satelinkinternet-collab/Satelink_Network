import fetch from 'node-fetch';

// Escalation thresholds: how many occurrences within ESCALATION_WINDOW trigger an upgrade
const ESCALATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const ESCALATION_THRESHOLDS = { info: 5, warn: 3, error: 2 }; // occurrences → escalate
const SEVERITY_ORDER = ['info', 'warn', 'error', 'critical'];

export class AlertService {
    constructor(logger) {
        this.logger = logger;
        this.telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        this.chatId = process.env.TELEGRAM_CHAT_ID;
        this.lastAlerts = new Map();      // message → lastSentAt
        this._occurrences = new Map();    // message → { count, firstSeen, level }
    }

    async send(message, level = 'info') {
        // Auto-escalate severity based on repeated occurrences
        level = this._checkEscalation(message, level);

        // Log locally first
        if (this.logger) {
            await this.logger.error('alerts', message, { level, meta: { sentToTelegram: !!this.telegramToken } });
        } else {
            console.log(`[ALERT] [${level.toUpperCase()}] ${message}`);
        }

        // Throttle duplicates (same message within 5 mins) — but always send critical
        const now = Date.now();
        const lastTime = this.lastAlerts.get(message);
        if (level !== 'critical' && lastTime && (now - lastTime) < 5 * 60 * 1000) {
            console.log(`[ALERT] Suppressed duplicate: ${message}`);
            return;
        }
        this.lastAlerts.set(message, now);

        // Send to Telegram
        if (this.telegramToken && this.chatId) {
            try {
                const url = `https://api.telegram.org/bot${this.telegramToken}/sendMessage`;
                const body = {
                    chat_id: this.chatId,
                    text: `🚨 *SATELINK ALERT* [${level.toUpperCase()}]\n\n${message}`,
                    parse_mode: 'Markdown'
                };

                // Use built-in fetch if node 18+, or node-fetch
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!res.ok) {
                    console.error(`[ALERT] Telegram Failed: ${res.status} ${res.statusText}`);
                }
            } catch (e) {
                console.error(`[ALERT] Telegram Error: ${e.message}`);
            }
        }
    }

    /**
     * Check if an alert should be escalated based on occurrence frequency.
     * If the same message has been seen >= threshold times in ESCALATION_WINDOW, bump severity.
     */
    _checkEscalation(message, originalLevel) {
        const now = Date.now();
        let entry = this._occurrences.get(message);

        if (!entry || now - entry.firstSeen > ESCALATION_WINDOW_MS) {
            // New window
            entry = { count: 1, firstSeen: now, level: originalLevel };
            this._occurrences.set(message, entry);
            return originalLevel;
        }

        entry.count++;

        const threshold = ESCALATION_THRESHOLDS[originalLevel];
        if (threshold && entry.count >= threshold) {
            const currentIdx = SEVERITY_ORDER.indexOf(originalLevel);
            if (currentIdx < SEVERITY_ORDER.length - 1) {
                const escalated = SEVERITY_ORDER[currentIdx + 1];
                console.log(`[ALERT] Escalated "${message.substring(0, 50)}..." from ${originalLevel} → ${escalated} (${entry.count} occurrences)`);
                // Reset counter for the new level
                entry.count = 0;
                entry.level = escalated;
                return escalated;
            }
        }

        return entry.level || originalLevel;
    }

    /**
     * Get escalation stats for monitoring.
     */
    getEscalationStats() {
        const stats = [];
        for (const [message, entry] of this._occurrences) {
            stats.push({
                message: message.substring(0, 100),
                count: entry.count,
                current_level: entry.level,
                first_seen: entry.firstSeen
            });
        }
        return stats;
    }
}
