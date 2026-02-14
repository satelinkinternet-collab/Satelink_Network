import { hashObject } from '../../utils/canonical_json.js';

export class ReplayEngine {
    constructor(db, incidentBuilder = null) {
        this.db = db;
        this.incidentBuilder = incidentBuilder;
    }

    /**
     * Replay a window of operations and revenue
     */
    async replayWindow({ from_ts, to_ts, partner_id = null, node_id = null }) {
        console.log(`[REPLAY] Running replay from ${from_ts} to ${to_ts}...`);

        // 1. Fetch Inputs (Parameters used during that period)
        // For MVP: Fetch current effective multipliers/flags
        const flags = await this.db.query("SELECT key, value FROM system_flags");
        const flagsMap = flags.reduce((acc, f) => ({ ...acc, [f.key]: f.value }), {});

        // 2. Fetch Source Data (Revenue Events)
        // MUST SORT to ensure determinism
        let sql = "SELECT * FROM revenue_events_v2 WHERE created_at BETWEEN ? AND ?";
        const params = [from_ts, to_ts];
        if (partner_id) { sql += " AND client_id = ?"; params.push(partner_id); }
        if (node_id) { sql += " AND node_id = ?"; params.push(node_id); }
        sql += " ORDER BY created_at ASC, request_id ASC, id ASC";

        const events = await this.db.query(sql, params);

        // 3. Compute Totals (using micro-unit math 1e6)
        let totalRevMicro = 0n;
        const opBreakdown = {};
        const partnerBreakdown = {};
        const nodeBreakdown = {};

        for (const ev of events) {
            const amountMicro = BigInt(Math.round(ev.amount_usdt * 1e6));
            totalRevMicro += amountMicro;

            opBreakdown[ev.op_type] = (opBreakdown[ev.op_type] || 0n) + amountMicro;
            partnerBreakdown[ev.client_id] = (partnerBreakdown[ev.client_id] || 0n) + amountMicro;
            nodeBreakdown[ev.node_id] = (nodeBreakdown[ev.node_id] || 0n) + amountMicro;
        }

        // 4. Fetch Actual Ledger Stats for comparison
        const ledgerRev = await this.db.get(
            `SELECT SUM(amount_usdt) as t FROM economic_ledger_entries 
             WHERE event_type = 'revenue' AND created_at BETWEEN ? AND ?`,
            [from_ts * 1000, to_ts * 1000]
        );
        const actualRevUsdt = ledgerRev?.t || 0;
        const computedRevUsdt = Number(totalRevMicro) / 1e6;

        // 5. Variance Calculation
        const diff = computedRevUsdt - actualRevUsdt;
        const diffPct = actualRevUsdt === 0 ? 0 : (Math.abs(diff) / actualRevUsdt) * 100;

        // 6. Output Proof
        const output = {
            window: { from_ts, to_ts },
            computed: {
                revenue_usdt: computedRevUsdt,
                ops_total: events.length,
                breakdown_by_op_type: this._normalizeBreakdown(opBreakdown),
                breakdown_by_partner: this._normalizeBreakdown(partnerBreakdown),
                breakdown_by_node: this._normalizeBreakdown(nodeBreakdown)
            },
            ledger: {
                revenue_usdt: actualRevUsdt
            },
            variance: {
                revenue_usdt_diff: diff,
                revenue_usdt_diff_pct: diffPct
            },
            used_inputs: {
                reward_multiplier: flagsMap.reward_multiplier_effective || '1.0',
                rewards_mode: flagsMap.rewards_mode || 'OFF'
            }
        };

        const proofHash = hashObject(output);
        output.proof_hash = proofHash;

        // 7. Incident Creation
        if (diffPct > 0.10 && this.incidentBuilder) {
            console.warn(`[REPLAY] High variance detected: ${diffPct.toFixed(4)}%`);
            await this.incidentBuilder.createIncident({
                severity: 'high',
                title: 'Forensics Variance Detected',
                source_kind: 'replay_engine',
                context_json: JSON.stringify({ ...output, alert: 'revenue_variance_detected' })
            });
        }

        return { ok: true, ...output };
    }

    _normalizeBreakdown(b) {
        return Object.entries(b).map(([k, v]) => ({
            id: k,
            amount_usdt: Number(v) / 1e6
        })).sort((a, b) => b.amount_usdt - a.amount_usdt);
    }
}
