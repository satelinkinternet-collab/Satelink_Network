export class LedgerIntegrityJob {
    constructor(db, incidentBuilder = null) {
        this.db = db;
        this.incidentBuilder = incidentBuilder;
    }

    async runDailyCheck(day) {
        console.log(`[LEDGER] Running integrity check for ${day}...`);

        const dayStr = String(day);
        const year = parseInt(dayStr.substring(0, 4));
        const month = parseInt(dayStr.substring(4, 6)) - 1;
        const date = parseInt(dayStr.substring(6, 8));

        const startTs = Math.floor(new Date(Date.UTC(year, month, date)).getTime() / 1000);
        const endTs = startTs + 86399;

        const findings = [];
        let ok = 1;

        try {
            // 1. Revenue Variance Check
            const revEvents = await this.db.get(
                "SELECT SUM(amount_usdt) as t FROM revenue_events_v2 WHERE created_at BETWEEN ? AND ?",
                [startTs, endTs]
            );
            const ledgerRev = await this.db.get(
                "SELECT SUM(amount_usdt) as t FROM economic_ledger_entries WHERE event_type = 'revenue' AND created_at BETWEEN ? AND ?",
                [startTs * 1000, endTs * 1000]
            );

            const revDiff = Math.abs((revEvents?.t || 0) - (ledgerRev?.t || 0));
            if (revDiff > 0.0001) {
                ok = 0;
                findings.push(`Revenue mismatch: Evevt sum ${revEvents?.t} != Ledger sum ${ledgerRev?.t}`);
            }

            // 2. Negative Balances Check
            const negatives = await this.db.query(
                "SELECT * FROM economic_account_balances WHERE balance_usdt < -0.0001 AND account_key NOT LIKE 'user_%' AND account_key NOT LIKE 'dist_%'"
                // Note: User wallets and distributors can have negative balance depending on credit policy, 
                // but treasury/pools should not.
            );
            if (negatives.length > 0) {
                ok = 0;
                findings.push(`Negative balances found: ${negatives.map(n => n.account_key).join(', ')}`);
            }

            // 3. Orphans Check
            const orphans = await this.db.query(`
                SELECT id FROM economic_ledger_entries e 
                WHERE NOT EXISTS (SELECT 1 FROM economic_ledger_chain c WHERE c.ledger_entry_id = e.id)
            `);
            if (orphans.length > 0) {
                ok = 0;
                findings.push(`Total orphans in ledger chain: ${orphans.length}`);
            }

            // Store result
            await this.db.query(`
                INSERT INTO ledger_integrity_runs (day_yyyymmdd, ok, findings_json, created_at)
                VALUES (?, ?, ?, ?)
            `, [day, ok, JSON.stringify(findings), Date.now()]);

            if (ok === 0 && this.incidentBuilder) {
                await this.incidentBuilder.createIncident({
                    severity: 'critical',
                    title: 'Ledger Integrity Failed',
                    source_kind: 'ledger_integrity_job',
                    context_json: JSON.stringify({ day, findings })
                });
            }

        } catch (e) {
            console.error(`[LEDGER] Integrity job failed for ${day}:`, e.message);
            ok = 0;
        }

        return { ok: ok === 1, findings };
    }
}
