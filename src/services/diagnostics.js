import crypto from 'crypto';

export class DiagnosticsService {
    constructor(db, logger) {
        this.db = db;
        this.logger = logger;
    }

    async createShareToken(note = '') {
        const token = crypto.randomBytes(16).toString('hex');
        const now = Date.now();
        const expiresAt = now + (24 * 60 * 60 * 1000); // 24h

        await this.db.query(
            `INSERT INTO diag_share_tokens (token, created_at, expires_at, note) VALUES (?, ?, ?, ?)`,
            [token, now, expiresAt, note]
        );
        return { token, expiresAt };
    }

    async validateToken(token) {
        const row = await this.db.get(`SELECT * FROM diag_share_tokens WHERE token = ?`, [token]);
        if (!row) return false;
        if (Date.now() > row.expires_at) return false;
        return true;
    }

    async getSnapshot() {
        const now = Date.now();

        // 1. Service Info
        const service = {
            name: 'satelink-node',
            uptime: Math.floor(process.uptime()),
            timestamp: now
        };

        // 2. DB Stats
        const revCount = (await this.db.get(`SELECT COUNT(*) as c FROM revenue_events`)).c;
        const pendingWithdrawals = (await this.db.get(`SELECT COUNT(*) as c FROM withdrawals WHERE status = 'PENDING'`)).c;
        const nodesOnline = (await this.db.get(`SELECT COUNT(*) as c FROM registered_nodes WHERE active = 1`)).c; // heavily simplified "online" check

        const dbStats = {
            ok: true,
            counts: {
                revenue_events: revCount,
                pending_withdrawals: pendingWithdrawals,
                nodes_online: nodesOnline
            }
        };

        // 3. Webhooks (Sanitized)
        const recentWebhooks = await this.logger.getRecentWebhooks(20);
        const webhooksSanitized = recentWebhooks.map(w => ({
            ...w,
            payer_wallet: this.maskWallet(w.payer_wallet)
        }));

        // 4. Errors (Sanitized)
        const recentErrors = await this.logger.getRecentErrors(50);
        const errorsSanitized = recentErrors.map(e => ({
            ts: e.ts,
            level: e.level,
            source: e.source,
            route: e.route,
            message: e.message
            // Intentionally omitting meta_json in shareable snapshot or heavily redacting it?
            // Requirement says: "truncate stack traces to 5 lines". 
            // The logger stores truncated stacks. But meta_json might have other user info.
            // Safe bet: exclude meta_json from public snapshot or parse and field-select.
            // Let's exclude meta_json for safety in the "Shareable" snapshot unless explicitly critical.
        }));

        // 5. Distribution (Last 5)
        const recentDist = await this.db.query(`SELECT * FROM distribution_runs ORDER BY created_at DESC LIMIT 5`);

        return {
            service,
            db: dbStats,
            webhooks: webhooksSanitized,
            errors: errorsSanitized,
            distribution: recentDist
        };
    }

    maskWallet(wallet) {
        if (!wallet || wallet.length < 10) return wallet;
        return `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`;
    }
}
