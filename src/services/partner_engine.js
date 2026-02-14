
import crypto from 'crypto';

/**
 * Phase 35.2 — Partner Engine
 * Manages partner API access, rate limits, revenue share, and suspension.
 */
export class PartnerEngine {
    constructor(db) {
        this.db = db;
    }

    /** Generate a new API key (returns plaintext key + stores hash) */
    async registerPartner({ partner_name, wallet, rate_limit_per_min, revenue_share_percent }) {
        const partnerId = `PARTNER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
        const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const now = Date.now();

        await this.db.query(`
            INSERT INTO partner_registry (partner_id, partner_name, wallet, api_key_hash, status, rate_limit_per_min, revenue_share_percent, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)
        `, [partnerId, partner_name || '', wallet || '', apiKeyHash, rate_limit_per_min || 60, revenue_share_percent || 10, now, now]);

        return { partner_id: partnerId, api_key: apiKey, status: 'pending' };
    }

    /** Approve a pending partner */
    async approvePartner(partnerId) {
        await this.db.query(
            "UPDATE partner_registry SET status = 'active', updated_at = ? WHERE partner_id = ?",
            [Date.now(), partnerId]
        );
        return { ok: true, partner_id: partnerId, status: 'active' };
    }

    /** Suspend a partner instantly */
    async suspendPartner(partnerId) {
        await this.db.query(
            "UPDATE partner_registry SET status = 'suspended', updated_at = ? WHERE partner_id = ?",
            [Date.now(), partnerId]
        );
        return { ok: true, partner_id: partnerId, status: 'suspended' };
    }

    /** Validate an API key — returns partner if valid, null if not */
    async validateApiKey(apiKey) {
        if (!apiKey) return null;
        const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const partner = await this.db.get(
            "SELECT * FROM partner_registry WHERE api_key_hash = ? AND status = 'active'", [hash]
        );
        return partner || null;
    }

    /** Update partner settings */
    async updatePartner(partnerId, updates) {
        const { rate_limit_per_min, revenue_share_percent } = updates;
        await this.db.query(`
            UPDATE partner_registry SET 
                rate_limit_per_min = COALESCE(?, rate_limit_per_min),
                revenue_share_percent = COALESCE(?, revenue_share_percent),
                updated_at = ?
            WHERE partner_id = ?
        `, [rate_limit_per_min, revenue_share_percent, Date.now(), partnerId]);
        return { ok: true };
    }

    /** Get all partners */
    async getPartners() {
        return await this.db.query("SELECT partner_id, partner_name, wallet, status, rate_limit_per_min, revenue_share_percent, total_revenue, total_ops, created_at, updated_at FROM partner_registry ORDER BY created_at DESC");
    }

    /** Get approved partners for public display (no sensitive data) */
    async getPublicPartners() {
        return await this.db.query(
            "SELECT partner_id, partner_name, status, total_ops, created_at FROM partner_registry WHERE status = 'active' ORDER BY total_ops DESC"
        );
    }

    /** Increment partner usage stats */
    async recordPartnerOp(partnerId, amountUsdt) {
        await this.db.query(
            "UPDATE partner_registry SET total_ops = total_ops + 1, total_revenue = total_revenue + ?, updated_at = ? WHERE partner_id = ?",
            [amountUsdt || 0, Date.now(), partnerId]
        );
    }
}
