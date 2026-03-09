export class AutoRewardService {
    constructor(db) {
        this.db = db;
    }

    async execute(rec) {
        console.log('[AutoReward] Executing:', rec.recommendation_json);
        const data = JSON.parse(rec.recommendation_json);

        if (data.action === 'reduce_multiplier') {
            await this._adjustMultiplier(-data.value);
        } else if (data.action === 'increase_multiplier') {
            await this._adjustMultiplier(data.value);
        } else {
            console.error('[AutoReward] Unknown action:', data.action);
            throw new Error(`Unknown reward action: ${data.action}`);
        }
    }

    async _adjustMultiplier(pctChange) {
        // 1. Get current & limits
        const config = await this._getConfigMap();
        console.log('[AutoReward] Config loaded:', config);

        let current = parseFloat(config.reward_multiplier_effective || '1.0');
        const min = parseFloat(config.min_reward_multiplier || '0.5');
        const max = parseFloat(config.max_reward_multiplier || '1.2');

        console.log(`[AutoReward] Current: ${current}, Min: ${min}, Max: ${max}, Change: ${pctChange}%`);

        // 2. Calculate New
        // If pctChange is -10, new = current * 0.9
        const factor = 1 + (pctChange / 100);
        let validNew = current * factor;

        // 3. Apply Bounds
        if (validNew < min) validNew = min;
        if (validNew > max) validNew = max;

        // 4. Update
        await this.db.query(
            "INSERT INTO system_config (key, value) VALUES ('reward_multiplier_effective', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
            [String(validNew.toFixed(4)), String(validNew.toFixed(4))]
        );

        return validNew; // Return for logging if needed
    }

    async _getConfigMap() {
        const rows = await this.db.query("SELECT key, value FROM system_config");
        return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
    }
}
