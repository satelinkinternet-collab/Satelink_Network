import fetch from 'node-fetch';

export class AlertService {
    constructor(logger) {
        this.logger = logger;
        this.telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        this.chatId = process.env.TELEGRAM_CHAT_ID;
        this.lastAlerts = new Map();
    }

    async send(message, level = 'info') {
        // Log locally first
        if (this.logger) {
            await this.logger.error('alerts', message, { level, meta: { sentToTelegram: !!this.telegramToken } });
        } else {
            console.log(`[ALERT] [${level.toUpperCase()}] ${message}`);
        }

        // Throttle duplicates (same message within 5 mins)
        const now = Date.now();
        const lastTime = this.lastAlerts.get(message);
        if (lastTime && (now - lastTime) < 5 * 60 * 1000) {
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
}
