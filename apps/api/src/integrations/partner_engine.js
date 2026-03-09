
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
    registerPartner({ partner_name, wallet, rate_limit_per_min, revenue_share_percent }) {
        const partnerId = `PARTNER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
        const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const now = Date.now();

        this.db.prepare(`
            INSERT INTO partner_registry (partner_id, partner_name, wallet, api_key_hash, status, rate_limit_per_min, revenue_share_percent, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)
        `).run([partnerId, partner_name || '', wallet || '', apiKeyHash, rate_limit_per_min || 60, revenue_share_percent || 10, now, now]);

        return { partner_id: partnerId, api_key: apiKey, status: 'pending' };
    }

    /** Approve a pending partner */
    approvePartner(partnerId) {
        this.db.prepare(
            "UPDATE partner_registry SET status = 'active', updated_at = ? WHERE partner_id = ?"
        ).run([Date.now(), partnerId]);
        return { ok: true, partner_id: partnerId, status: 'active' };
    }

    /** Suspend a partner instantly */
    suspendPartner(partnerId) {
        this.db.prepare(
            "UPDATE partner_registry SET status = 'suspended', updated_at = ? WHERE partner_id = ?"
        ).run([Date.now(), partnerId]);
        return { ok: true, partner_id: partnerId, status: 'suspended' };
    }

    /** Validate an API key — returns partner if valid, null if not */
    validateApiKey(apiKey) {
        if (!apiKey) return null;
        const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const partner = this.db.prepare(
            "SELECT * FROM partner_registry WHERE api_key_hash = ? AND status = 'active'"
        ).get([hash]);
        return partner || null;
    }

    /** Update partner settings */
    updatePartner(partnerId, updates) {
        const { rate_limit_per_min, revenue_share_percent } = updates;
        this.db.prepare(`
            UPDATE partner_registry SET 
                rate_limit_per_min = COALESCE(?, rate_limit_per_min),
                revenue_share_percent = COALESCE(?, revenue_share_percent),
                updated_at = ?
            WHERE partner_id = ?
        `).run([rate_limit_per_min, revenue_share_percent, Date.now(), partnerId]);
        return { ok: true };
    }

    /** Get all partners */
    getPartners() {
        return this.db.prepare("SELECT partner_id, partner_name, wallet, status, rate_limit_per_min, revenue_share_percent, total_revenue, total_ops, created_at, updated_at FROM partner_registry ORDER BY created_at DESC").all([]);
    }

    /** Get approved partners for public display (no sensitive data) */
    getPublicPartners() {
        return this.db.prepare(
            "SELECT partner_id, partner_name, status, total_ops, created_at FROM partner_registry WHERE status = 'active' ORDER BY total_ops DESC"
        ).all([]);
    }

    /** Increment partner usage stats */
    recordPartnerOp(partnerId, amountUsdt) {
        this.db.prepare(
            "UPDATE partner_registry SET total_ops = total_ops + 1, total_revenue = total_revenue + ?, updated_at = ? WHERE partner_id = ?"
        ).run([amountUsdt || 0, Date.now(), partnerId]);
    }
}
