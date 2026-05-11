export function getGrossRewardUSDT(db, operatorId, periodStart, periodEnd) {
    const row = db.prepare(`
        SELECT SUM(amount_usdt) as total
        FROM epoch_earnings
        WHERE role = 'node_operator'
          AND wallet_or_node_id = ?
          AND created_at >= ?
          AND created_at <= ?
    `).get([operatorId, periodStart, periodEnd]);

    const total = row && row.total ? Number(row.total) : 0;
    return total.toFixed(8);
}
