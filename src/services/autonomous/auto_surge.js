export class AutoSurgeService {
    constructor(db) {
        this.db = db;
    }

    async execute(rec) {
        // rec.recommendation_json: { action: 'increase_surge', value: 0.05 }
        const data = JSON.parse(rec.recommendation_json);

        // For MVP, simplistic Global Surge Multiplier
        if (data.action === 'increase_surge' || data.action === 'decrease_surge') {
            await this._adjustSurge(data.value, data.action === 'decrease_surge');
        }
    }

    async _adjustSurge(amount, isDecrease) {
        let current = parseFloat(await this._getConfig('surge_multiplier_global') || '1.0');
        const min = parseFloat(await this._getConfig('surge_multiplier_min') || '1.0');
        const max = parseFloat(await this._getConfig('surge_multiplier_max') || '1.5');

        let next = isDecrease ? current - amount : current + amount;

        // Bounds
        if (next < min) next = min;
        if (next > max) next = max;

        await this.db.query(
            "INSERT INTO system_config (key, value) VALUES ('surge_multiplier_global', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
            [String(next.toFixed(2)), String(next.toFixed(2))]
        );
    }

    async _getConfig(key) {
        const row = await this.db.get("SELECT value FROM system_config WHERE key = ?", [key]);
        return row ? row.value : null;
    }
}
