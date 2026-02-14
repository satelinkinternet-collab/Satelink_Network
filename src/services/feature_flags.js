import crypto from 'crypto';

export class FeatureFlagService {
    constructor(db) {
        this.db = db;
        this.cache = new Map();
        this.loadInterval = null;
    }

    async init() {
        await this.refreshCache();
        this.loadInterval = setInterval(() => this.refreshCache(), 10000); // Refresh every 10s
        console.log('[FeatureFlags] Service initialized.');
    }

    async refreshCache() {
        try {
            const rows = await this.db.query("SELECT * FROM feature_flags_v2");
            for (const row of rows) {
                this.cache.set(row.key, {
                    mode: row.mode,
                    percent: row.percent || 0,
                    whitelist: JSON.parse(row.whitelist_json || '[]')
                });
            }
        } catch (e) {
            console.error('[FeatureFlags] Cache refresh failed:', e.message);
        }
    }

    isEnabled(key, context = {}) {
        const flag = this.cache.get(key);
        if (!flag) return false; // Default closed

        switch (flag.mode) {
            case 'OFF': return false;
            case 'ON': return true;
            case 'WHITELIST':
                if (!context.wallet) return false;
                return flag.whitelist.includes(context.wallet);
            case 'PERCENT':
                if (flag.percent <= 0) return false;
                if (flag.percent >= 100) return true;

                // Deterministic hash based on wallet OR ip OR random
                const id = context.wallet || context.ipHash || context.ip || 'random';
                const hash = crypto.createHash('md5').update(key + id).digest('hex');
                const val = parseInt(hash.substring(0, 4), 16); // 0-65535
                return (val % 100) < flag.percent;
            default:
                return false;
        }
    }

    async setFlag(key, { mode, percent, whitelist, description, updatedBy }) {
        const now = Date.now();
        const whitelistJson = JSON.stringify(whitelist || []);

        await this.db.query(`
            INSERT INTO feature_flags_v2 (key, mode, percent, whitelist_json, description, updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                mode=excluded.mode,
                percent=excluded.percent,
                whitelist_json=excluded.whitelist_json,
                description=COALESCE(?, description),
                updated_at=excluded.updated_at,
                updated_by=excluded.updated_by
        `, [key, mode, percent || 0, whitelistJson, description, now, updatedBy, description]); // description used twice

        // Update cache immediately
        this.cache.set(key, { mode, percent: percent || 0, whitelist: whitelist || [] });
    }

    getAllFlags() {
        return Array.from(this.cache.entries()).map(([key, val]) => ({ key, ...val }));
    }
}
