
/**
 * Phase 35.1 — Region Activation Engine
 * Controls region-by-region node activation and caps.
 */
export class RegionEngine {
    constructor(db) {
        this.db = db;
    }

    /** Check if a region allows new node activation */
    async checkRegionAllowed(regionCode) {
        const code = regionCode || 'GLOBAL';
        const region = await this.db.get(
            "SELECT * FROM region_activation WHERE region_code = ?", [code]
        );

        if (!region) {
            // Unknown region → check GLOBAL fallback
            const global = await this.db.get(
                "SELECT * FROM region_activation WHERE region_code = 'GLOBAL'"
            );
            if (!global || global.status === 'inactive') {
                return { allowed: false, reason: 'Region not registered and GLOBAL is inactive' };
            }
            return { allowed: global.status === 'active' || global.status === 'pilot', region: global };
        }

        if (region.status === 'inactive') {
            return { allowed: false, reason: `Region ${code} is inactive` };
        }
        if (region.status === 'paused') {
            return { allowed: false, reason: `Region ${code} is paused — no new nodes` };
        }
        if (region.status === 'pilot' && region.active_nodes_count >= region.node_cap) {
            return { allowed: false, reason: `Region ${code} pilot cap reached (${region.node_cap})` };
        }
        if (region.status === 'active' && region.active_nodes_count >= region.node_cap) {
            return { allowed: false, reason: `Region ${code} node cap reached (${region.node_cap})` };
        }

        return { allowed: true, region };
    }

    /** Check if region daily revenue/reward caps allow more ops */
    async checkRegionCaps(regionCode) {
        const code = regionCode || 'GLOBAL';
        const region = await this.db.get(
            "SELECT * FROM region_activation WHERE region_code = ?", [code]
        );
        if (!region) return { allowed: true };

        const dayAgo = Date.now() - 86400000;

        // Check revenue cap
        const rev = await this.db.get(
            "SELECT SUM(amount_usdt) as t FROM revenue_events_v2 WHERE created_at > ?", [dayAgo]
        );
        if (rev?.t >= region.revenue_cap_usdt_daily) {
            return { allowed: false, reason: `Region ${code} daily revenue cap reached` };
        }

        return { allowed: true };
    }

    /** Get all regions with stats */
    async getRegions() {
        return await this.db.query("SELECT * FROM region_activation ORDER BY region_code");
    }

    /** Update region settings */
    async updateRegion(regionCode, updates) {
        const { status, node_cap, revenue_cap_usdt_daily, rewards_cap_usdt_daily, region_name } = updates;
        const now = Date.now();

        await this.db.query(`
            INSERT INTO region_activation (region_code, region_name, status, node_cap, revenue_cap_usdt_daily, rewards_cap_usdt_daily, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(region_code) DO UPDATE SET
                region_name = COALESCE(excluded.region_name, region_name),
                status = COALESCE(excluded.status, status),
                node_cap = COALESCE(excluded.node_cap, node_cap),
                revenue_cap_usdt_daily = COALESCE(excluded.revenue_cap_usdt_daily, revenue_cap_usdt_daily),
                rewards_cap_usdt_daily = COALESCE(excluded.rewards_cap_usdt_daily, rewards_cap_usdt_daily),
                updated_at = excluded.updated_at
        `, [regionCode, region_name || '', status || 'inactive', node_cap || 50,
            revenue_cap_usdt_daily || 100, rewards_cap_usdt_daily || 50, now, now]);

        return { ok: true, region_code: regionCode };
    }

    /** Increment active node count for a region */
    async incrementNodeCount(regionCode) {
        await this.db.query(
            "UPDATE region_activation SET active_nodes_count = active_nodes_count + 1, updated_at = ? WHERE region_code = ?",
            [Date.now(), regionCode || 'GLOBAL']
        );
    }
}
