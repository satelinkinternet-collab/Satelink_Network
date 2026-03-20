import { hashObject } from '../utils/canonical_json.js';

export class ForensicsSnapshotService {
    constructor(db, sseManager = null) {
        this.db = db;
        this.sseManager = sseManager;
    }

    /**
     * Run daily snapshot for yyyymmdd
     * @param {number} day - YYYYMMDD
     */
    async runDailySnapshot(day) {
        console.log(`[FORENSICS] Generating snapshot for ${day}...`);

        // Compute Totals
        const totals = await this._computeTotals(day);

        // Canonical Hash
        const hashProof = hashObject(totals);

        // Store
        await this.db.prepare(`
            INSERT INTO daily_state_snapshots (day_yyyymmdd, totals_json, hash_proof, created_at, created_by)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(day_yyyymmdd) DO UPDATE SET
                totals_json = excluded.totals_json,
                hash_proof = excluded.hash_proof,
                created_at = excluded.created_at,
                created_by = excluded.created_by
        `).run([day, JSON.stringify(totals), hashProof, Date.now(), 'system']);

        // Emit SSE
        if (this.sseManager) {
            this.sseManager.broadcast('forensics_snapshot', { day, hashProof });
        }

        return { day, hashProof, totals };
    }

    async _computeTotals(day) {
        // day_yyyymmdd -> ts range
        const dayStr = String(day);
        const year = parseInt(dayStr.substring(0, 4));
        const month = parseInt(dayStr.substring(4, 6)) - 1;
        const date = parseInt(dayStr.substring(6, 8));

        const startTs = Math.floor(new Date(Date.UTC(year, month, date)).getTime() / 1000);
        const endTs = startTs + 86399;

        // 1. Revenue
        const rev = await this.db.prepare(
            "SELECT SUM(amount_usdt) as t FROM revenue_events_v2 WHERE created_at BETWEEN ? AND ?"
        ).get([startTs, endTs]);

        // 2. Rewards (from ledger)
        const rewards = await this.db.prepare(
            "SELECT SUM(amount_usdt) as t FROM economic_ledger_entries WHERE event_type = 'reward' AND created_at BETWEEN ? AND ?"
        ).get([startTs * 1000, endTs * 1000]);

        // 3. Counts
        const partners = await this.db.prepare("SELECT COUNT(*) as c FROM partner_registry WHERE status = 'active'").get();
        const nodes = await this.db.prepare("SELECT COUNT(*) as c FROM nodes WHERE status = 'active'").get();

        // 4. Multipliers & Flags
        const flags = await this.db.prepare("SELECT key, value FROM system_flags").all();
        const flagsMap = flags.reduce((acc, f) => ({ ...acc, [f.key]: f.value }), {});

        // 5. Authenticity / Stability (from latest daily jobs if exist)
        const authenticity = await this.db.prepare("SELECT authenticity_score FROM usage_authenticity_daily WHERE day_yyyymmdd = ?").get([day]);
        const stability = await this.db.prepare("SELECT stability_score FROM revenue_stability_daily WHERE day_yyyymmdd = ?").get([day]);

        return {
            revenue_usdt_total: rev?.t || 0,
            rewards_usdt_total: rewards?.t || 0,
            partner_count_active: partners?.c || 0,
            node_count_active: nodes?.c || 0,
            reward_multiplier_effective: parseFloat(flagsMap.reward_multiplier_effective || '1.0'),
            rewards_mode: flagsMap.rewards_mode || 'OFF',
            surge_config_snapshot: flagsMap.surge_multiplier || '1.0',
            pricing_rules_version: flagsMap.pricing_version || '1.0',
            authenticity_score: authenticity?.authenticity_score || 1.0,
            stability_score: stability?.stability_score || 1.0,
            recorded_at: Date.now()
        };
    }

    async getSnapshots(days = 30) {
        return await this.db.prepare(
            "SELECT * FROM daily_state_snapshots ORDER BY day_yyyymmdd DESC LIMIT ?"
        ).all([days]);
    }

    async getSnapshot(day) {
        return await this.db.prepare("SELECT * FROM daily_state_snapshots WHERE day_yyyymmdd = ?").get([day]);
    }
}
