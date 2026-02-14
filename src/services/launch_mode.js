
/**
 * Phase 35.3 — Launch Mode (Marketing Surge Protection)
 * Tightens system parameters when marketing campaigns are active.
 */
export class LaunchMode {
    constructor(db) {
        this.db = db;
    }

    async isEnabled() {
        const row = await this.db.get("SELECT value FROM system_config WHERE key = 'launch_mode_enabled'");
        return row?.value === 'true';
    }

    async enable() {
        const now = Date.now();
        const configs = [
            ['launch_mode_enabled', 'true'],
            ['launch_mode_activated_at', String(now)],
        ];

        for (const [key, value] of configs) {
            await this.db.query(
                "INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)",
                [key, value]
            );
        }

        // Tighten parameters
        await this._applyLaunchSettings(now);

        return { ok: true, enabled: true, activated_at: now };
    }

    async disable() {
        const now = Date.now();
        await this.db.query(
            "INSERT OR REPLACE INTO system_config (key, value) VALUES ('launch_mode_enabled', 'false')"
        );
        await this._revertLaunchSettings(now);
        return { ok: true, enabled: false };
    }

    async getStatus() {
        const enabled = await this.isEnabled();
        const activatedAt = await this.db.get("SELECT value FROM system_config WHERE key = 'launch_mode_activated_at'");

        // Gather current safety params
        const rewardsMode = await this.db.get("SELECT value FROM system_config WHERE key = 'rewards_mode'");
        const abuseLevel = await this.db.get("SELECT value FROM system_config WHERE key = 'abuse_sensitivity'");

        return {
            launch_mode_enabled: enabled,
            activated_at: activatedAt?.value ? parseInt(activatedAt.value) : null,
            rewards_mode: rewardsMode?.value || 'NORMAL',
            abuse_sensitivity: abuseLevel?.value || 'normal',
        };
    }

    async _applyLaunchSettings(now) {
        const tighten = [
            ['abuse_sensitivity', 'high'],
            ['surge_pricing_boost', '2.0'],
            ['rewards_cap_multiplier', '0.5'],
            ['enhanced_logging', 'true'],
        ];
        for (const [key, value] of tighten) {
            await this.db.query(
                "INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)",
                [key, value]
            );
        }
    }

    async _revertLaunchSettings(now) {
        const revert = [
            ['abuse_sensitivity', 'normal'],
            ['surge_pricing_boost', '1.0'],
            ['rewards_cap_multiplier', '1.0'],
            ['enhanced_logging', 'false'],
        ];
        for (const [key, value] of revert) {
            await this.db.query(
                "INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)",
                [key, value]
            );
        }
    }
}
