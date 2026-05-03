/**
 * Claims Routes
 * Handles node operator claims and founder withdrawals
 */

import { Router } from 'express';
import {
  getClaimableBalance,
  getNodeEarnings,
  processClaim,
  getClaimHistory,
  getClaimsStats
} from '../services/claims/claim_processor.js';
import {
  getPlatformStats,
  processFounderWithdrawal,
  getWithdrawalHistory
} from '../services/claims/founder_withdraw.js';

export function createClaimsRouter(pool, redis) {
  const router = Router();

  // ════════════════════════════════════════════════════════════════
  // NODE OPERATOR ENDPOINTS
  // ════════════════════════════════════════════════════════════════

  // GET /api/nodes/:nodeId/earnings — Get earnings summary
  router.get('/nodes/:nodeId/earnings', async (req, res) => {
    try {
      const { nodeId } = req.params;
      const earnings = await getNodeEarnings(nodeId, pool);

      res.json({
        ok: true,
        nodeId,
        ...earnings,
        minimumClaim: 1.0
      });
    } catch (error) {
      console.error('[Claims] Earnings fetch error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // GET /api/nodes/:nodeId/claimable — Get claimable balance
  router.get('/nodes/:nodeId/claimable', async (req, res) => {
    try {
      const { nodeId } = req.params;
      const claimable = await getClaimableBalance(nodeId, pool);

      res.json({
        ok: true,
        nodeId,
        claimable,
        minimumClaim: 1.0,
        canClaim: claimable >= 1.0
      });
    } catch (error) {
      console.error('[Claims] Claimable fetch error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // POST /api/nodes/:nodeId/claim — Process a claim
  router.post('/nodes/:nodeId/claim', async (req, res) => {
    try {
      const { nodeId } = req.params;
      const { wallet_address } = req.body;

      if (!wallet_address) {
        return res.status(400).json({ ok: false, error: 'wallet_address required' });
      }

      const result = await processClaim(nodeId, wallet_address, pool, redis);
      res.json(result);

    } catch (error) {
      console.error('[Claims] Claim error:', error.message);
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  // GET /api/nodes/:nodeId/claims — Get claim history
  router.get('/nodes/:nodeId/claims', async (req, res) => {
    try {
      const { nodeId } = req.params;
      const history = await getClaimHistory(nodeId, pool);

      res.json({
        ok: true,
        nodeId,
        claims: history
      });
    } catch (error) {
      console.error('[Claims] History fetch error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ════════════════════════════════════════════════════════════════
  // ADMIN/FOUNDER ENDPOINTS
  // ════════════════════════════════════════════════════════════════

  // GET /api/admin/stats — Platform revenue stats
  router.get('/admin/stats', async (req, res) => {
    try {
      const [platformStats, claimsStats] = await Promise.all([
        getPlatformStats(pool),
        getClaimsStats(pool)
      ]);

      res.json({
        ok: true,
        revenue: platformStats,
        claims: claimsStats
      });
    } catch (error) {
      console.error('[Admin] Stats error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // POST /api/admin/withdraw — Founder withdrawal
  router.post('/admin/withdraw', async (req, res) => {
    try {
      const { wallet_address, amount, founder_id } = req.body;

      if (!wallet_address || !amount) {
        return res.status(400).json({ ok: false, error: 'wallet_address and amount required' });
      }

      const result = await processFounderWithdrawal(
        founder_id || 'founder-1',
        wallet_address,
        parseFloat(amount),
        pool,
        redis
      );

      res.json(result);

    } catch (error) {
      console.error('[Admin] Withdraw error:', error.message);
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  // GET /api/admin/withdrawals — Withdrawal history
  router.get('/admin/withdrawals', async (req, res) => {
    try {
      const history = await getWithdrawalHistory(pool);
      res.json({ ok: true, withdrawals: history });
    } catch (error) {
      console.error('[Admin] Withdrawals error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // POST /api/admin/epoch/close — Force close current epoch
  router.post('/admin/epoch/close', async (req, res) => {
    try {
      // Get current epoch
      const epochResult = await pool.query(
        `SELECT MAX(epoch_id) + 1 as next_epoch FROM epoch_ledger`
      );
      const epochId = epochResult.rows[0]?.next_epoch || 1;

      // Aggregate revenue for this epoch
      const revenueResult = await pool.query(`
        SELECT
          COUNT(*) as event_count,
          COALESCE(SUM(amount_usdt), 0) as total_usdt
        FROM revenue_events_v2
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `);

      const eventCount = parseInt(revenueResult.rows[0]?.event_count || 0);
      const totalUsdt = parseFloat(revenueResult.rows[0]?.total_usdt || 0);

      if (eventCount === 0) {
        return res.json({
          ok: true,
          message: 'No new revenue events to close',
          epochId,
          eventCount: 0
        });
      }

      // Insert epoch record
      await pool.query(
        `INSERT INTO epoch_ledger (epoch_id, revenue_usdt, event_count, closed_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (epoch_id) DO UPDATE
         SET revenue_usdt = EXCLUDED.revenue_usdt, event_count = EXCLUDED.event_count`,
        [epochId, totalUsdt, eventCount]
      );

      console.log(`[Epoch] Closed epoch ${epochId}: ${eventCount} events, ${totalUsdt.toFixed(6)} USDT`);

      res.json({
        ok: true,
        epochId,
        eventCount,
        totalUsdt,
        message: `Epoch ${epochId} closed successfully`
      });

    } catch (error) {
      console.error('[Admin] Epoch close error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

export default createClaimsRouter;
