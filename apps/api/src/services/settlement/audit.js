/**
 * S7-004: Settlement Audit Endpoint
 *
 * GET /api/settlement/history — returns last 10 epochs with settlement details
 */

import { Router } from 'express';

export function createSettlementAuditRouter(pool) {
  const router = Router();

  router.get('/history', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          status,
          total_revenue,
          node_pool,
          platform_fee,
          merkle_root,
          tx_hash,
          started_at,
          closed_at
        FROM epoch_ledger
        ORDER BY id DESC
        LIMIT 10
      `);

      res.json({
        ok: true,
        epochs: result.rows.map(row => ({
          id: row.id,
          status: row.status,
          totalRevenue: row.total_revenue,
          nodePool: row.node_pool,
          platformFee: row.platform_fee,
          merkleRoot: row.merkle_root,
          txHash: row.tx_hash,
          startedAt: row.started_at,
          closedAt: row.closed_at
        })),
        count: result.rows.length
      });
    } catch (err) {
      console.error('[Settlement-Audit] Query failed:', err.message);
      res.status(500).json({ ok: false, error: 'Failed to fetch settlement history' });
    }
  });

  router.get('/epoch/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const epochResult = await pool.query(
        'SELECT * FROM epoch_ledger WHERE id = $1',
        [id]
      );

      if (epochResult.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Epoch not found' });
      }

      const eventsResult = await pool.query(
        `SELECT COUNT(*) as event_count, SUM(amount_usdt) as total_usdt
         FROM revenue_events_v2
         WHERE epoch_id = $1`,
        [id]
      );

      const epoch = epochResult.rows[0];
      res.json({
        ok: true,
        epoch: {
          id: epoch.id,
          status: epoch.status,
          totalRevenue: epoch.total_revenue,
          nodePool: epoch.node_pool,
          platformFee: epoch.platform_fee,
          merkleRoot: epoch.merkle_root,
          txHash: epoch.tx_hash,
          startedAt: epoch.started_at,
          closedAt: epoch.closed_at
        },
        events: {
          count: parseInt(eventsResult.rows[0]?.event_count) || 0,
          totalUsdt: parseFloat(eventsResult.rows[0]?.total_usdt) || 0
        }
      });
    } catch (err) {
      console.error('[Settlement-Audit] Epoch query failed:', err.message);
      res.status(500).json({ ok: false, error: 'Failed to fetch epoch details' });
    }
  });

  return router;
}
