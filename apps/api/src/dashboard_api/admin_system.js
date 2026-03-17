/**
 * Dashboard Query Layer — Admin System Health
 *
 * READ-ONLY aggregated queries for admin system health dashboard.
 * This module NEVER mutates state. All queries are SELECT-only.
 *
 * Tables read: system_flags, registered_nodes, revenue_events_v2,
 *              epochs, users, error_events
 */

/**
 * Get system health overview for admin dashboard.
 *
 * @param {object} db - Database connection
 * @param {object} [cache] - Optional cache adapter
 * @returns {object} System health data
 */
export async function getSystemHealth(db, cache) {
    const cacheKey = 'dashboard:admin_system_health';

    if (cache?.get) {
        const cached = await cache.get(cacheKey);
        if (cached) return JSON.parse(cached);
    }

    const now = Math.floor(Date.now() / 1000);
    const fiveMinAgo = now - 300;
    const oneHourAgo = now - 3600;

    // ── System flags ──
    const flags = {};
    const flagRows = db.prepare?.(
        "SELECT key, value FROM system_flags WHERE key IN ('system_state', 'withdrawals_paused', 'security_freeze', 'revenue_mode', 'beta_gate_enabled')"
    )?.all() || [];
    for (const row of flagRows) {
        flags[row.key] = row.value;
    }

    // ── Active nodes (5 min) ──
    const activeNodes = db.prepare?.(
        "SELECT COUNT(*) as count FROM registered_nodes WHERE active = 1 AND last_heartbeat > ?"
    )?.get(fiveMinAgo)?.count || 0;

    // ── Ops last 5 min ──
    const ops5m = db.prepare?.(
        "SELECT COUNT(*) as count FROM revenue_events_v2 WHERE created_at > ?"
    )?.get(fiveMinAgo)?.count || 0;

    // ── Success rate last 5 min ──
    const successCount = db.prepare?.(
        "SELECT COUNT(*) as count FROM revenue_events_v2 WHERE created_at > ? AND status = 'success'"
    )?.get(fiveMinAgo)?.count || 0;
    const successRate = ops5m > 0 ? parseFloat(((successCount / ops5m) * 100).toFixed(1)) : 100;

    // ── Revenue last 24h ──
    const oneDayAgo = now - 86400;
    const revenue24h = db.prepare?.(
        "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE status = 'success' AND created_at > ?"
    )?.get(oneDayAgo)?.total || 0;

    // ── Error count last hour ──
    let errors1h = 0;
    try {
        errors1h = db.prepare?.(
            "SELECT COUNT(*) as count FROM revenue_events_v2 WHERE created_at > ? AND status != 'success'"
        )?.get(oneHourAgo)?.count || 0;
    } catch { /* table may not exist */ }

    // ── User counts by role ──
    const usersByRole = db.prepare?.(
        "SELECT role, COUNT(*) as count FROM users GROUP BY role"
    )?.all() || [];

    // ── Current epoch ──
    const currentEpoch = db.prepare?.(
        "SELECT id, status FROM epochs ORDER BY id DESC LIMIT 1"
    )?.get() || { id: 0, status: 'UNKNOWN' };

    // ── Total epochs closed ──
    const epochsClosed = db.prepare?.(
        "SELECT COUNT(*) as count FROM epochs WHERE status = 'CLOSED'"
    )?.get()?.count || 0;

    const result = {
        system_state: flags['system_state'] || 'UNKNOWN',
        withdrawals_paused: flags['withdrawals_paused'] === 'true',
        security_freeze: flags['security_freeze'] === 'true',
        revenue_mode: flags['revenue_mode'] || 'UNKNOWN',
        beta_gate_enabled: flags['beta_gate_enabled'] === 'true',
        kpis: {
            active_nodes_5m: activeNodes,
            ops_5m: ops5m,
            success_rate_5m: successRate,
            revenue_24h_usdt: parseFloat(revenue24h.toFixed(4)),
            errors_1h: errors1h,
        },
        current_epoch: currentEpoch,
        epochs_closed: epochsClosed,
        users_by_role: usersByRole,
        uptime_seconds: Math.floor(process.uptime()),
    };

    if (cache?.set) {
        await cache.set(cacheKey, JSON.stringify(result), 'EX', 15);
    }

    return result;
}
