import { expect } from 'chai';
import crypto from 'crypto';
import { NodeopsWaterfallService } from '../src/services/nodeops_waterfall.js';
import Database from 'better-sqlite3';

describe('Economics: NodeOps Settlement Waterfall', () => {
    let db;
    let service;
    const testPeriod = { start: 1704067200, end: 1706745599 }; // Jan 2024

    before(() => {
        db = new Database(':memory:');
        service = new NodeopsWaterfallService(db);
        service.init();
    });

    beforeEach(() => {
        db.prepare('DELETE FROM operator_billing').run();
        db.prepare('DELETE FROM ledger_entries').run();
    });

    const insertBilling = (data) => {
        const d = {
            operator_id: `op_${crypto.randomBytes(4).toString('hex')}`,
            nodeops_monthly_cost_usdt: 100,
            prepaid_until: null,
            reserve_start_date: 1704067200, // Jan 1 2024
            reserve_months_total: 6,
            reserve_rate: 0.10,
            reserve_balance_usdt: 0,
            reserve_target_usdt: null,
            arrears_usdt: 0,
            ...data
        };
        db.prepare(`
            INSERT INTO operator_billing 
            (operator_id, nodeops_monthly_cost_usdt, prepaid_until, reserve_start_date, reserve_months_total, reserve_rate, reserve_balance_usdt, reserve_target_usdt, arrears_usdt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run([d.operator_id, d.nodeops_monthly_cost_usdt, d.prepaid_until, d.reserve_start_date, d.reserve_months_total, d.reserve_rate, d.reserve_balance_usdt, d.reserve_target_usdt, d.arrears_usdt]);
        return d.operator_id;
    };

    it('Case 1: Prepaid month active (No due, 10% reserve, rest strictly operator)', async () => {
        const opId = insertBilling({ prepaid_until: testPeriod.end + 1000 });
        const res = await service.settleOperatorPeriod(opId, testPeriod, 1000); // 1000 Reward

        expect(res.summary.due_amount).to.equal(0);
        expect(res.summary.pay_nodeops).to.equal(0);
        expect(res.summary.alloc_reserve).to.equal(100); // 10% of 1000
        expect(res.summary.operator_payout).to.equal(900);
        expect(res.summary.arrears_carried).to.equal(0);
        expect(res.entries).to.have.lengthOf(3); // REWARD, RESERVE, PAYOUT
    });

    it('Case 2: Reward < Due amount triggers arrears carry-over', async () => {
        const opId = insertBilling({ nodeops_monthly_cost_usdt: 200 });
        const res = await service.settleOperatorPeriod(opId, testPeriod, 50); // 50 Reward (Cant cover 200)

        expect(res.summary.due_amount).to.equal(200);
        expect(res.summary.pay_nodeops).to.equal(50);
        expect(res.summary.alloc_reserve).to.equal(0);
        expect(res.summary.operator_payout).to.equal(0);
        expect(res.summary.arrears_carried).to.equal(150);
    });

    it('Case 3: Reward > Due with active reserve withholding', async () => {
        const opId = insertBilling({ nodeops_monthly_cost_usdt: 150 });
        const res = await service.settleOperatorPeriod(opId, testPeriod, 1000);

        // Due: 150 -> Leaves 850
        // Reserve: 1000 * 0.10 = 100 -> Leaves 750 (bounded by reserve <= remaining)
        expect(res.summary.due_amount).to.equal(150);
        expect(res.summary.pay_nodeops).to.equal(150);
        expect(res.summary.alloc_reserve).to.equal(100);
        expect(res.summary.operator_payout).to.equal(750);
    });

    it('Case 4: Reserve capped by explicit target', async () => {
        // Assume target is 1000, current val is 950. Reserve rate normally calls for 100 (10% of 1000). Max allowed = 50.
        const opId = insertBilling({ reserve_balance_usdt: 950, reserve_target_usdt: 1000 });
        const res = await service.settleOperatorPeriod(opId, testPeriod, 1000);

        expect(res.summary.alloc_reserve).to.equal(50); // 1000 - 950
        expect(res.summary.operator_payout).to.equal(850); // 1000 - 100(Due) - 50(Res)
    });

    it('Case 5: Reserve window ended completely', async () => {
        // Window started in 2020. Exceeded 6 months.
        const opId = insertBilling({ reserve_start_date: 1577836800 });
        const res = await service.settleOperatorPeriod(opId, testPeriod, 1000);

        expect(res.summary.alloc_reserve).to.equal(0);
        expect(res.summary.operator_payout).to.equal(900); // 1000 - 100 nodeops = 900
    });
});
