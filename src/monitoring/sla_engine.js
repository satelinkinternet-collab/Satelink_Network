import { v4 as uuidv4 } from 'uuid';

/**
 * Phase Q — SLA Engine
 * Manages error budgets, per-op SLOs, circuit breakers, reports, and credits.
 */
export class SLAEngine {
    constructor(db, alertService = null) {
        this.db = db;
        this.alertService = alertService;
    }

    // ─── Q1: PLANS + LIMITS ─────────────────────────────────────

    async getPlans() {
        return this.db.query("SELECT * FROM sla_plans ORDER BY target_success_rate ASC");
    }

    async getLimits(partnerId) {
        return this.db.get(`
            SELECT tl.*, sp.name as plan_name, sp.target_success_rate, sp.target_p95_latency_ms
            FROM tenant_limits tl
            JOIN sla_plans sp ON tl.plan_id = sp.id
            WHERE tl.partner_id = ?
        `, [partnerId]);
    }

    async setLimits(partnerId, { plan_id, max_rps, max_daily_ops, max_daily_spend_usdt, allowed_op_types }) {
        const now = Date.now();
        const opsJson = JSON.stringify(allowed_op_types || ['*']);

        // Validate plan exists
        const plan = await this.db.get("SELECT id FROM sla_plans WHERE id = ?", [plan_id]);
        if (!plan) throw new Error(`Plan '${plan_id}' not found`);

        await this.db.query(`
            INSERT INTO tenant_limits (partner_id, plan_id, max_rps, max_daily_ops, max_daily_spend_usdt, allowed_op_types_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(partner_id) DO UPDATE SET
                plan_id = excluded.plan_id,
                max_rps = excluded.max_rps,
                max_daily_ops = excluded.max_daily_ops,
                max_daily_spend_usdt = excluded.max_daily_spend_usdt,
                allowed_op_types_json = excluded.allowed_op_types_json,
                updated_at = excluded.updated_at
        `, [partnerId, plan_id, max_rps || 10, max_daily_ops || 1000, max_daily_spend_usdt || 50, opsJson, now, now]);

        // Ensure circuit state row exists
        await this.db.query(`
            INSERT INTO tenant_circuit_state (partner_id, state, last_reset_day)
            VALUES (?, 'closed', ?)
            ON CONFLICT(partner_id) DO NOTHING
        `, [partnerId, this._todayStr()]);

        return { ok: true };
    }

    // ─── Q2: ERROR BUDGET ENGINE ─────────────────────────────────

    /**
     * Compute daily SLA for a partner from revenue_events_v2.
     * Idempotent — upserts into tenant_sla_daily.
     */
    async computeDailySLA(partnerId, dayStr) {
        // dayStr = 'YYYYMMDD'
        const dayStart = this._dayToEpoch(dayStr);
        const dayEnd = dayStart + 86400;

        const row = await this.db.get(`
            SELECT
                COUNT(*) as total_ops,
                SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as failed_ops
            FROM revenue_events_v2
            WHERE client_id = ? AND created_at >= ? AND created_at < ?
        `, [partnerId, dayStart, dayEnd]);

        const totalOps = row?.total_ops || 0;
        const failedOps = row?.failed_ops || 0;
        const successRate = totalOps > 0 ? (totalOps - failedOps) / totalOps : 1.0;

        // P95 latency — we need latency data. If revenue_events_v2 doesn't have latency,
        // we fall back to request_traces if available, or estimate from timing.
        let p95 = 0;
        try {
            const latencies = await this.db.query(`
                SELECT duration_ms FROM request_traces
                WHERE client_id = ? AND created_at >= ? AND created_at < ?
                ORDER BY duration_ms ASC
            `, [partnerId, dayStart, dayEnd]);
            if (latencies.length > 0) {
                const idx = Math.floor(latencies.length * 0.95);
                p95 = latencies[Math.min(idx, latencies.length - 1)]?.duration_ms || 0;
            }
        } catch (e) {
            // request_traces may not have client_id or duration_ms — fallback to 0
        }

        // Get target from plan
        const limits = await this.getLimits(partnerId);
        const target = limits?.target_success_rate || 0.95;
        const budgetTotal = 1 - target;         // allowed error fraction
        const actualError = totalOps > 0 ? failedOps / totalOps : 0;

        // Rolling budget — we compute as: (budgetTotal - actualError) / budgetTotal * 100
        // But for a single day, this is partial. The rolling budget is computed in getErrorBudget().
        // Here we just store the day's raw data.
        const budgetPct = budgetTotal > 0 ? Math.max(0, ((budgetTotal - actualError) / budgetTotal) * 100) : 100;

        await this.db.query(`
            INSERT INTO tenant_sla_daily (day_yyyymmdd, partner_id, total_ops, failed_ops, success_rate, p95_latency_ms, budget_remaining_pct, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(day_yyyymmdd, partner_id) DO UPDATE SET
                total_ops = excluded.total_ops,
                failed_ops = excluded.failed_ops,
                success_rate = excluded.success_rate,
                p95_latency_ms = excluded.p95_latency_ms,
                budget_remaining_pct = excluded.budget_remaining_pct
        `, [dayStr, partnerId, totalOps, failedOps, successRate, p95, budgetPct, Date.now()]);

        return { dayStr, partnerId, totalOps, failedOps, successRate, p95, budgetPct };
    }

    /**
     * Get rolling error budget over windowDays.
     */
    async getErrorBudget(partnerId, windowDays = 30) {
        const cutoff = this._dayStrOffset(-windowDays);

        const row = await this.db.get(`
            SELECT
                SUM(total_ops) as total_ops,
                SUM(failed_ops) as failed_ops
            FROM tenant_sla_daily
            WHERE partner_id = ? AND day_yyyymmdd >= ?
        `, [partnerId, cutoff]);

        const totalOps = row?.total_ops || 0;
        const failedOps = row?.failed_ops || 0;
        const successRate = totalOps > 0 ? (totalOps - failedOps) / totalOps : 1.0;

        const limits = await this.getLimits(partnerId);
        const target = limits?.target_success_rate || 0.95;
        const budgetTotal = 1 - target;
        const actualError = totalOps > 0 ? failedOps / totalOps : 0;
        const budgetRemaining = budgetTotal > 0 ? Math.max(0, ((budgetTotal - actualError) / budgetTotal) * 100) : 100;

        // 7-day window too
        const cutoff7 = this._dayStrOffset(-7);
        const row7 = await this.db.get(`
            SELECT SUM(total_ops) as total_ops, SUM(failed_ops) as failed_ops
            FROM tenant_sla_daily WHERE partner_id = ? AND day_yyyymmdd >= ?
        `, [partnerId, cutoff7]);
        const total7 = row7?.total_ops || 0;
        const failed7 = row7?.failed_ops || 0;
        const sr7 = total7 > 0 ? (total7 - failed7) / total7 : 1.0;
        const budgetRemaining7 = budgetTotal > 0 ? Math.max(0, ((budgetTotal - (total7 > 0 ? failed7 / total7 : 0)) / budgetTotal) * 100) : 100;

        // Alerting
        if (budgetRemaining < 5 && this.alertService) {
            this.alertService.triggerAlert?.('sla_budget_critical', {
                partner_id: partnerId, budget_remaining_pct: budgetRemaining
            });
        } else if (budgetRemaining < 20 && this.alertService) {
            this.alertService.triggerAlert?.('sla_budget_warning', {
                partner_id: partnerId, budget_remaining_pct: budgetRemaining
            });
        }

        return {
            partner_id: partnerId,
            plan: limits?.plan_name || 'free',
            target_success_rate: target,
            window_30d: { total_ops: totalOps, failed_ops: failedOps, success_rate: successRate, budget_remaining_pct: budgetRemaining },
            window_7d: { total_ops: total7, failed_ops: failed7, success_rate: sr7, budget_remaining_pct: budgetRemaining7 }
        };
    }

    // ─── Q3: PER OP-TYPE SLO ──────────────────────────────────────

    async computeDailyOpSLO(partnerId, dayStr) {
        const dayStart = this._dayToEpoch(dayStr);
        const dayEnd = dayStart + 86400;

        const rows = await this.db.query(`
            SELECT op_type,
                COUNT(*) as total_ops,
                SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as failed_ops
            FROM revenue_events_v2
            WHERE client_id = ? AND created_at >= ? AND created_at < ?
            GROUP BY op_type
        `, [partnerId, dayStart, dayEnd]);

        const results = [];
        for (const r of rows) {
            const sr = r.total_ops > 0 ? (r.total_ops - r.failed_ops) / r.total_ops : 1.0;

            // Attempt p95 from traces
            let p95 = 0;
            try {
                const latencies = await this.db.query(`
                    SELECT duration_ms FROM request_traces
                    WHERE client_id = ? AND route LIKE ? AND created_at >= ? AND created_at < ?
                    ORDER BY duration_ms ASC
                `, [partnerId, `%${r.op_type}%`, dayStart, dayEnd]);
                if (latencies.length > 0) {
                    const idx = Math.floor(latencies.length * 0.95);
                    p95 = latencies[Math.min(idx, latencies.length - 1)]?.duration_ms || 0;
                }
            } catch (e) { /* traces may not exist */ }

            await this.db.query(`
                INSERT INTO tenant_op_slo_daily (day_yyyymmdd, partner_id, op_type, p95_latency_ms, success_rate, total_ops, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(day_yyyymmdd, partner_id, op_type) DO UPDATE SET
                    p95_latency_ms = excluded.p95_latency_ms,
                    success_rate = excluded.success_rate,
                    total_ops = excluded.total_ops
            `, [dayStr, partnerId, r.op_type, p95, sr, r.total_ops, Date.now()]);

            results.push({ op_type: r.op_type, total_ops: r.total_ops, success_rate: sr, p95_latency_ms: p95 });
        }
        return results;
    }

    async getOpSLO(partnerId, days = 30) {
        const cutoff = this._dayStrOffset(-days);
        return this.db.query(`
            SELECT op_type,
                SUM(total_ops) as total_ops,
                AVG(success_rate) as avg_success_rate,
                MAX(p95_latency_ms) as max_p95_latency_ms
            FROM tenant_op_slo_daily
            WHERE partner_id = ? AND day_yyyymmdd >= ?
            GROUP BY op_type
            ORDER BY total_ops DESC
        `, [partnerId, cutoff]);
    }

    // ─── Q4: CIRCUIT BREAKER ──────────────────────────────────────

    /**
     * Check if the partner should be allowed to execute.
     * Returns { allowed, reason, state }.
     */
    async checkCircuitBreaker(partnerId) {
        const limits = await this.getLimits(partnerId);
        if (!limits) return { allowed: true, state: 'no_limits' }; // No limits set = allow

        // Get or create circuit state
        let cs = await this.db.get("SELECT * FROM tenant_circuit_state WHERE partner_id = ?", [partnerId]);
        const today = this._todayStr();

        if (!cs) {
            await this.db.query(`
                INSERT INTO tenant_circuit_state (partner_id, state, last_reset_day, ops_today, spend_today_usdt)
                VALUES (?, 'closed', ?, 0, 0)
            `, [partnerId, today]);
            cs = { state: 'closed', ops_today: 0, spend_today_usdt: 0, last_reset_day: today, disabled_ops_json: '[]' };
        }

        // Reset daily counters if new day
        if (cs.last_reset_day !== today) {
            await this.db.query(`
                UPDATE tenant_circuit_state
                SET ops_today = 0, spend_today_usdt = 0, last_reset_day = ?, state = 'closed', disabled_ops_json = '[]'
                WHERE partner_id = ?
            `, [today, partnerId]);
            cs.ops_today = 0;
            cs.spend_today_usdt = 0;
            cs.state = 'closed';
        }

        // If circuit is open, check if recovery time passed
        if (cs.state === 'open') {
            if (cs.recovers_at && Date.now() > cs.recovers_at) {
                // Move to half_open — allow one probe
                await this.db.query("UPDATE tenant_circuit_state SET state = 'half_open' WHERE partner_id = ?", [partnerId]);
                return { allowed: true, state: 'half_open', reason: 'probe_allowed' };
            }
            return { allowed: false, state: 'open', reason: cs.reason || 'circuit_open' };
        }

        // Check daily ops limit
        if (cs.ops_today >= limits.max_daily_ops) {
            await this._tripCircuit(partnerId, `daily_ops_limit_exceeded (${cs.ops_today}/${limits.max_daily_ops})`);
            return { allowed: false, state: 'open', reason: 'daily_ops_limit' };
        }

        // Check daily spend limit
        if (cs.spend_today_usdt >= limits.max_daily_spend_usdt) {
            await this._tripCircuit(partnerId, `daily_spend_limit_exceeded ($${cs.spend_today_usdt}/$${limits.max_daily_spend_usdt})`);
            return { allowed: false, state: 'open', reason: 'daily_spend_limit' };
        }

        // Check allowed op types — done at executeOp level, not here

        return { allowed: true, state: cs.state || 'closed' };
    }

    /**
     * Increment counters after a successful execution.
     */
    async recordExecution(partnerId, amountUsdt) {
        const today = this._todayStr();
        await this.db.query(`
            UPDATE tenant_circuit_state
            SET ops_today = ops_today + 1, spend_today_usdt = spend_today_usdt + ?
            WHERE partner_id = ? AND last_reset_day = ?
        `, [amountUsdt || 0, partnerId, today]);

        // If half_open and succeeded, close circuit
        const cs = await this.db.get("SELECT state FROM tenant_circuit_state WHERE partner_id = ?", [partnerId]);
        if (cs?.state === 'half_open') {
            await this.db.query("UPDATE tenant_circuit_state SET state = 'closed', reason = NULL WHERE partner_id = ?", [partnerId]);
        }
    }

    async _tripCircuit(partnerId, reason) {
        const recoversAt = Date.now() + 60 * 60 * 1000; // 1 hour cooldown
        await this.db.query(`
            UPDATE tenant_circuit_state
            SET state = 'open', reason = ?, tripped_at = ?, recovers_at = ?
            WHERE partner_id = ?
        `, [reason, Date.now(), recoversAt, partnerId]);

        // Audit
        try {
            await this.db.query(
                "INSERT INTO audit_logs (actor_wallet, action_type, metadata, created_at) VALUES (?, ?, ?, ?)",
                ['system_sla', 'CIRCUIT_BREAKER_TRIP', JSON.stringify({ partner_id: partnerId, reason }), Date.now()]
            );
        } catch (e) { /* audit best-effort */ }

        if (this.alertService) {
            this.alertService.triggerAlert?.('circuit_breaker_tripped', { partner_id: partnerId, reason });
        }
    }

    // ─── Q5: REPORT EXPORT ────────────────────────────────────────

    async generateMonthlyReport(partnerId, monthStr) {
        // monthStr = 'YYYYMM', e.g. '202602'
        const year = parseInt(monthStr.substring(0, 4));
        const month = parseInt(monthStr.substring(4, 6));
        const daysInMonth = new Date(year, month, 0).getDate();

        // Gather daily data
        const prefix = monthStr.substring(0, 4) + monthStr.substring(4, 6); // YYYYMM
        const dailyData = await this.db.query(`
            SELECT * FROM tenant_sla_daily
            WHERE partner_id = ? AND day_yyyymmdd LIKE ?
            ORDER BY day_yyyymmdd ASC
        `, [partnerId, `${prefix}%`]);

        const opSloData = await this.db.query(`
            SELECT * FROM tenant_op_slo_daily
            WHERE partner_id = ? AND day_yyyymmdd LIKE ?
            ORDER BY op_type, day_yyyymmdd ASC
        `, [partnerId, `${prefix}%`]);

        // Aggregates
        const totalOps = dailyData.reduce((s, d) => s + d.total_ops, 0);
        const failedOps = dailyData.reduce((s, d) => s + d.failed_ops, 0);
        const successRate = totalOps > 0 ? (totalOps - failedOps) / totalOps : 1.0;
        const avgP95 = dailyData.length > 0 ? dailyData.reduce((s, d) => s + d.p95_latency_ms, 0) / dailyData.length : 0;

        // Credits
        const credits = await this.db.query(
            "SELECT * FROM sla_credits WHERE partner_id = ? AND created_at >= ? AND created_at < ?",
            [partnerId, new Date(year, month - 1, 1).getTime(), new Date(year, month, 1).getTime()]
        );

        const limits = await this.getLimits(partnerId);

        const report = {
            partner_id: partnerId,
            month: monthStr,
            plan: limits?.plan_name || 'free',
            target_success_rate: limits?.target_success_rate || 0.95,
            target_p95_latency_ms: limits?.target_p95_latency_ms || 2000,
            summary: {
                total_ops: totalOps,
                failed_ops: failedOps,
                success_rate: parseFloat(successRate.toFixed(6)),
                avg_p95_latency_ms: parseFloat(avgP95.toFixed(1)),
                days_tracked: dailyData.length,
                days_in_month: daysInMonth,
                sla_met: successRate >= (limits?.target_success_rate || 0.95)
            },
            daily: dailyData.map(d => ({
                day: d.day_yyyymmdd,
                ops: d.total_ops,
                fails: d.failed_ops,
                sr: d.success_rate,
                p95: d.p95_latency_ms
            })),
            op_types: opSloData,
            credits: credits.map(c => ({ amount: c.amount_usdt, reason: c.reason, status: c.status })),
            generated_at: Date.now()
        };

        const id = uuidv4();
        await this.db.query(`
            INSERT INTO sla_reports (id, partner_id, month_yyyymm, report_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT DO NOTHING
        `, [id, partnerId, monthStr, JSON.stringify(report), Date.now()]);

        return report;
    }

    async getReport(partnerId, monthStr) {
        const existing = await this.db.get(
            "SELECT * FROM sla_reports WHERE partner_id = ? AND month_yyyymm = ?",
            [partnerId, monthStr]
        );
        if (existing) return JSON.parse(existing.report_json);

        // Generate on-demand
        return this.generateMonthlyReport(partnerId, monthStr);
    }

    // ─── Q6: SIMULATED CREDITS ────────────────────────────────────

    async issueCredit(partnerId, amountUsdt, reason) {
        const id = uuidv4();
        await this.db.query(`
            INSERT INTO sla_credits (id, partner_id, amount_usdt, reason, status, created_at)
            VALUES (?, ?, ?, ?, 'simulated', ?)
        `, [id, partnerId, amountUsdt, reason, Date.now()]);

        // Audit
        try {
            await this.db.query(
                "INSERT INTO audit_logs (actor_wallet, action_type, metadata, created_at) VALUES (?, ?, ?, ?)",
                ['system_sla', 'SLA_CREDIT_ISSUED', JSON.stringify({ partner_id: partnerId, amount_usdt: amountUsdt, reason }), Date.now()]
            );
        } catch (e) { /* best-effort */ }

        return { id, amount_usdt: amountUsdt, reason, status: 'simulated' };
    }

    async getCredits(partnerId) {
        return this.db.query(
            "SELECT * FROM sla_credits WHERE partner_id = ? ORDER BY created_at DESC LIMIT 100",
            [partnerId]
        );
    }

    // ─── Q7: DAILY JOB ──────────────────────────────────────────

    /**
     * Called by scheduler daily. Computes SLA + SLO for all partners.
     */
    async runDailyJob() {
        const yesterday = this._dayStrOffset(-1);
        console.log(`[SLA] Running daily job for ${yesterday}`);

        const partners = await this.db.query("SELECT partner_id FROM tenant_limits");
        let processed = 0;

        for (const p of partners) {
            try {
                await this.computeDailySLA(p.partner_id, yesterday);
                await this.computeDailyOpSLO(p.partner_id, yesterday);
                processed++;
            } catch (e) {
                console.error(`[SLA] Daily job error for ${p.partner_id}:`, e.message);
            }
        }

        // Check error budgets and issue credits for breaches
        for (const p of partners) {
            try {
                const budget = await this.getErrorBudget(p.partner_id);
                if (budget.window_30d.budget_remaining_pct <= 0) {
                    // SLA breached — issue credit
                    const limits = await this.getLimits(p.partner_id);
                    const creditAmount = (limits?.monthly_fee_usdt || 0) * 0.10; // 10% credit
                    if (creditAmount > 0) {
                        await this.issueCredit(p.partner_id, creditAmount,
                            `SLA breach: success_rate=${budget.window_30d.success_rate.toFixed(4)} < target=${limits.target_success_rate}`);
                    }
                }
            } catch (e) { /* best-effort */ }
        }

        console.log(`[SLA] Daily job complete. Processed ${processed} partners.`);
        return { processed };
    }

    // ─── HELPERS ──────────────────────────────────────────────────

    _todayStr() {
        const d = new Date();
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    }

    _dayStrOffset(offset) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    }

    _dayToEpoch(dayStr) {
        // dayStr = 'YYYYMMDD' → unix seconds
        const y = parseInt(dayStr.substring(0, 4));
        const m = parseInt(dayStr.substring(4, 6)) - 1;
        const d = parseInt(dayStr.substring(6, 8));
        return Math.floor(new Date(y, m, d).getTime() / 1000);
    }
}
