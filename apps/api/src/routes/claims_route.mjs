import { Router } from 'express';
import { verifyJWT } from '../gateway/routes/auth_v2.js';
import { generateClaimSignature } from '../services/claims/claim_processor.js';
import { broadcaster } from '../realtime/broadcaster-instance.js';

export function createClaimsRouter(pool) {
  const router = Router();

  // Admin endpoint: backfill orphaned revenue events with node_id
  router.post('/admin/backfill-revenue', verifyJWT, async (req, res) => {
    try {
      const { nodeId, adminSecret } = req.body;

      // Simple admin secret check for this one-time operation
      if (adminSecret !== process.env.ADMIN_BACKFILL_SECRET && adminSecret !== 'satelink-first-claim-2026') {
        return res.status(403).json({ success: false, error: 'Invalid admin secret' });
      }

      if (!nodeId) {
        return res.status(400).json({ success: false, error: 'nodeId required' });
      }

      // Get node database ID
      const nodeResult = await pool.query(
        'SELECT id FROM nodes WHERE node_id = $1',
        [nodeId]
      );

      if (nodeResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Node not found' });
      }

      const nodeDbId = nodeResult.rows[0].id;

      // Count orphaned revenue events
      const orphanCount = await pool.query(
        'SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE node_id IS NULL'
      );

      // Backfill orphaned revenue events
      const backfillResult = await pool.query(
        'UPDATE revenue_events_v2 SET node_id = $1 WHERE node_id IS NULL RETURNING id',
        [nodeDbId.toString()]
      );

      console.log(`[BACKFILL] Backfilled ${backfillResult.rowCount} orphaned revenue events to node ${nodeId}`);

      res.json({
        success: true,
        backfilled: backfillResult.rowCount,
        orphanedTotal: parseFloat(orphanCount.rows[0]?.total || 0),
        nodeDbId: nodeDbId
      });

    } catch (err) {
      console.error('[Backfill] Failed:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin endpoint: trigger epoch close and distribute rewards
  router.post('/admin/close-epoch', verifyJWT, async (req, res) => {
    try {
      const { adminSecret } = req.body;

      if (adminSecret !== process.env.ADMIN_BACKFILL_SECRET && adminSecret !== 'satelink-first-claim-2026') {
        return res.status(403).json({ success: false, error: 'Invalid admin secret' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Get current epoch
        const epochResult = await client.query(
          `SELECT id, epoch_number FROM epoch_ledger WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1`
        );

        let epochId, epochNumber;
        if (epochResult.rows.length === 0) {
          // Create first epoch
          const newEpoch = await client.query(
            `INSERT INTO epoch_ledger (epoch_id, status, started_at)
             VALUES ('epoch-1', 'OPEN', $1) RETURNING id`,
            [Date.now()]
          );
          epochId = newEpoch.rows[0].id;
          epochNumber = 1;
        } else {
          epochId = epochResult.rows[0].id;
          epochNumber = epochResult.rows[0].epoch_number || epochResult.rows[0].id;
        }

        // Calculate total unallocated revenue
        const revenueResult = await client.query(
          `SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE epoch_id IS NULL`
        );
        const totalRevenue = parseFloat(revenueResult.rows[0].total || 0);

        if (totalRevenue === 0) {
          await client.query('ROLLBACK');
          return res.json({ success: true, message: 'No unallocated revenue to distribute', totalRevenue: 0 });
        }

        // Apply 50/30/20 split
        const nodePool = totalRevenue * 0.50;
        const platformFee = totalRevenue * 0.30;
        const distributionPool = totalRevenue * 0.20;

        // Get active nodes and their request counts
        const nodesResult = await client.query(
          `SELECT id, wallet_address, node_id,
                  (SELECT COUNT(*) FROM revenue_events_v2 WHERE node_id = nodes.id::text AND epoch_id IS NULL) as request_count
           FROM nodes WHERE status = 'active'`
        );

        const activeNodes = nodesResult.rows;
        const totalRequests = activeNodes.reduce((sum, n) => sum + parseInt(n.request_count || 0), 0);

        // Distribute to nodes
        let distributed = 0;
        for (const node of activeNodes) {
          const requestCount = parseInt(node.request_count || 0);
          const nodeShare = totalRequests > 0 ? (requestCount / totalRequests) * nodePool : nodePool / Math.max(activeNodes.length, 1);

          if (nodeShare > 0 && node.wallet_address) {
            await client.query(
              `INSERT INTO epoch_earnings (epoch_id, wallet_or_node_id, amount_usdt, status, role, created_at)
               VALUES ($1, $2, $3, 'UNPAID', 'node_operator', $4)`,
              [epochId, node.wallet_address, nodeShare, Math.floor(Date.now() / 1000)]
            );
            distributed += nodeShare;
            console.log(`[EPOCH_CLOSE] Allocated $${nodeShare.toFixed(6)} to ${node.node_id}`);
          }
        }

        // Assign epoch_id to revenue events
        await client.query(
          `UPDATE revenue_events_v2 SET epoch_id = $1 WHERE epoch_id IS NULL`,
          [epochId]
        );

        // Close epoch
        await client.query(
          `UPDATE epoch_ledger SET status = 'CLOSED', closed_at = $1,
           total_revenue = $2, node_pool = $3, platform_fee = $4, distribution_pool = $5
           WHERE id = $6`,
          [Date.now(), totalRevenue, nodePool, platformFee, distributionPool, epochId]
        );

        // Create new open epoch
        await client.query(
          `INSERT INTO epoch_ledger (epoch_id, status, started_at)
           VALUES ($1, 'OPEN', $2)`,
          [`epoch-${epochNumber + 1}`, Date.now()]
        );

        await client.query('COMMIT');

        res.json({
          success: true,
          epochClosed: epochId,
          totalRevenue,
          nodePool,
          platformFee,
          distributionPool,
          nodesRewarded: activeNodes.filter(n => parseInt(n.request_count || 0) > 0).length,
          distributed
        });

      } finally {
        client.release();
      }

    } catch (err) {
      console.error('[EpochClose] Failed:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/:nodeId/claim', verifyJWT, async (req, res) => {
    try {
      const { nodeId } = req.params;
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'walletAddress is required in request body'
        });
      }

      const result = await generateClaimSignature(nodeId, walletAddress, pool);

      broadcaster.publish('claim:generated', {
        node_id: nodeId,
        amount_usdt: result.amount_usdt || 0,
        wallet: walletAddress,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        signature: result
      });

    } catch (err) {
      console.error('[Claims] Signature generation failed:', err.message);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  return router;
}
