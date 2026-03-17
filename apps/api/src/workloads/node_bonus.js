export class NodeBonusService {
    constructor(db) {
        this.db = db;
    }

    async execute(rec) {
        // rec.recommendation_json: { action: 'grant_bonus', multiplier: 1.05, duration_hours: 24 }
        const data = JSON.parse(rec.recommendation_json);

        if (data.action === 'grant_bonus') {
            // Validate Max Bonus
            const max = parseFloat(await this._getConfig('node_bonus_max_multiplier') || '1.10');
            if (data.multiplier > max) {
                throw new Error(`Bonus multiplier ${data.multiplier} exceeds limit ${max}`);
            }

            const expiresAt = Date.now() + (data.duration_hours || 24) * 3600000;

            await this.db.query(`
                INSERT INTO node_bonus_flags (node_id, multiplier, expires_at, reason, created_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(node_id) DO UPDATE SET 
                    multiplier = excluded.multiplier,
                    expires_at = excluded.expires_at,
                    reason = excluded.reason
            `, [rec.entity_id, data.multiplier, expiresAt, rec.type, Date.now()]);
        }
    }

    async _getConfig(key) {
        const row = await this.db.get("SELECT value FROM system_config WHERE key = ?", [key]);
        return row ? row.value : null;
    }
}
