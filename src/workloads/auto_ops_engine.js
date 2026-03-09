import { RecommendationEngine } from './recommendation_engine.js';
import { AutoRewardService } from './auto_reward.js';
import { NodeBonusService } from './node_bonus.js';
import { AutoSurgeService } from './auto_surge.js';

export class AutoOpsEngine {
    constructor(db, systemConfig) {
        this.db = db;
        this.recommendationEngine = new RecommendationEngine(db);
        this.autoReward = new AutoRewardService(db);
        this.nodeBonus = new NodeBonusService(db);
        this.autoSurge = new AutoSurgeService(db);
    }

    /**
     * Main run loop required by Scheduler
     */
    async runDailyJob() {
        // Phase N1: Generate recommendations
        await this.recommendationEngine.run();

        // Phase N3-N5: Check if auto-execution is enabled and safe
        // For MVP detailed rollout, we rely on Admin manual trigger or specific auto-loops?
        // Spec says: "Runs daily... IF autonomous_ops_enabled=1 ... execute"
        // But for now, let's stick to generating recommendations. 
        // If we want FULL autonomy, we'd query pending recs here and execute them.
        // Given N3 requirements "Runs daily... If trigger met... adjust", the RecommendationEngine 
        // ALREADY checks triggers and creates recommendations.
        // So we just need to Execute Pending Recommendations if Auto is Enabled.

        await this._processPendingAutoActions();
    }

    async _processPendingAutoActions() {
        const autoEnabled = await this._getConfigBool('autonomous_ops_enabled');
        if (!autoEnabled) return;

        // Fetch pending recs
        const pending = await this.db.query("SELECT * FROM ops_recommendations WHERE status = 'pending'");
        for (const rec of pending) {
            // Check sub-flags
            let shouldExecute = false;
            switch (rec.type) {
                case 'reward_adjust':
                    shouldExecute = await this._getConfigBool('auto_reward_enabled');
                    break;
                case 'node_bonus':
                    shouldExecute = await this._getConfigBool('auto_node_bonus_enabled');
                    break;
                case 'surge_tune':
                    shouldExecute = await this._getConfigBool('auto_surge_enabled');
                    break;
            }

            if (shouldExecute) {
                try {
                    await this.executeRecommendation(rec, 'system_auto');
                } catch (e) {
                    console.error(`[AutoOps] Auto-execution failed for ${rec.id}:`, e);
                }
            }
        }
    }

    /**
     * Execute a recommendation (from Admin or Auto)
     */
    async executeRecommendation(rec, actorWallet, force = false) {
        console.log(`[AutoOps] Executing Recommendation ${rec.id}: ${rec.type}`);

        // N6 Safety Guardrails
        if (!force && actorWallet === 'system_auto') {
            await this._checkSafety();
        }

        // Delegate to specific service
        switch (rec.type) {
            case 'reward_adjust':
                await this.autoReward.execute(rec);
                break;
            case 'node_bonus':
                await this.nodeBonus.execute(rec);
                break;
            case 'surge_tune':
                await this.autoSurge.execute(rec);
                break;
            case 'region_cap':
                // Region caps manual for now
                console.log('Region cap auto-execution not yet implemented');
                break;
            case 'churn_prevent':
                // Informational only usually
                console.log('Churn prevention is informational/manual for now');
                break;
            default:
                console.warn(`Unknown recommendation type: ${rec.type}`);
        }

        // 1. Log Action
        await this.db.query(`
            INSERT INTO auto_actions_log (action_type, before_json, after_json, reason, executed_by, created_at)
            VALUES (?, '{}', ?, ?, ?, ?)
        `, [rec.type, rec.recommendation_json, `Executed: ${rec.id}`, actorWallet || 'system', Date.now()]);

        // 2. Update Status
        await this.db.query("UPDATE ops_recommendations SET status = 'executed', decided_by = ?, decided_at = ? WHERE id = ?", [actorWallet || 'system', Date.now(), rec.id]);
    }

    async _checkSafety() {
        // 1. Safe Mode / Emergency Lockdown
        const safeMode = await this._getConfigBool('safe_mode');
        const lockdown = await this._getConfigBool('emergency_lockdown');

        if (safeMode || lockdown) {
            throw new Error('Safety Guardrail: Execution blocked by Safe Mode or Lockdown');
        }

        // 2. Authenticity Score (Avoid tuning on fake data)
        const authScore = await this.db.get("SELECT authenticity_score FROM usage_authenticity_daily ORDER BY created_at DESC LIMIT 1");
        if (authScore && authScore.authenticity_score < 60) {
            throw new Error(`Safety Guardrail: Authenticity Score low (${authScore.authenticity_score})`);
        }
    }

    async _getConfigBool(key) {
        const row = await this.db.get("SELECT value FROM system_config WHERE key = ?", [key]);
        return row && (row.value === 'true' || row.value === '1');
    }
}
