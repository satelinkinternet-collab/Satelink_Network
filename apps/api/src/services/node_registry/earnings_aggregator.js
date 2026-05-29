/**
 * Node Earnings Aggregator (S2-010)
 *
 * Aggregates per-node earnings after each epoch closes.
 * Applies reputation-based multipliers to node earnings.
 */

const TIER_MULTIPLIERS = {
  platinum: 1.10,
  gold: 1.00,
  silver: 0.95,
  bronze: 0.90
};

async function ensureNodeEarningsTable(pool) {
  if (!pool || !pool.query) return;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS node_earnings (
        id SERIAL PRIMARY KEY,
        node_id TEXT NOT NULL,
        epoch_id INTEGER NOT NULL,
        wallet TEXT NOT NULL,
        gross_usdt NUMERIC(18,8) DEFAULT 0,
        multiplier NUMERIC(4,2) DEFAULT 1.00,
        net_usdt NUMERIC(18,8) DEFAULT 0,
        ops_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at BIGINT NOT NULL,
        UNIQUE(node_id, epoch_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_node_earnings_node ON node_earnings(node_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_node_earnings_epoch ON node_earnings(epoch_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_node_earnings_wallet ON node_earnings(wallet)`);
  } catch (e) {
    // Table may already exist
  }
}

export async function aggregateNodeEarnings(epochId, nodePoolUsdt, pool) {
  if (!pool || !pool.query) {
    console.warn('[EarningsAggregator] No database pool');
    return { processed: 0 };
  }

  await ensureNodeEarningsTable(pool);

  const now = Math.floor(Date.now() / 1000);

  try {
    // 1. Get node contributions from revenue_events_v2
    const contributions = await pool.query(`
      SELECT
        node_id,
        COUNT(*) as ops_count,
        COALESCE(SUM(amount_usdt), 0) as revenue
      FROM revenue_events_v2
      WHERE epoch_id = $1 AND node_id IS NOT NULL AND node_id LIKE 'NODE-%'
      GROUP BY node_id
    `, [epochId]);

    if (contributions.rows.length === 0) {
      console.log(`[EarningsAggregator] Epoch ${epochId}: no node contributions`);
      return { processed: 0, totalDistributed: 0 };
    }

    // 2. Calculate total ops across all nodes
    const totalOps = contributions.rows.reduce((sum, row) => sum + parseInt(row.ops_count), 0);

    if (totalOps === 0) {
      console.log(`[EarningsAggregator] Epoch ${epochId}: zero ops`);
      return { processed: 0, totalDistributed: 0 };
    }

    let totalDistributed = 0;
    let processed = 0;

    // 3. Process each node
    for (const contrib of contributions.rows) {
      const nodeId = contrib.node_id;
      const opsCount = parseInt(contrib.ops_count);

      // Get node's wallet and tier
      const nodeResult = await pool.query(
        'SELECT wallet, tier FROM registered_nodes WHERE node_id = $1',
        [nodeId]
      );

      if (nodeResult.rows.length === 0) {
        console.warn(`[EarningsAggregator] Node ${nodeId} not found in registered_nodes`);
        continue;
      }

      const { wallet, tier } = nodeResult.rows[0];
      const multiplier = TIER_MULTIPLIERS[tier] || TIER_MULTIPLIERS.bronze;

      // Calculate proportional share
      const grossShare = (opsCount / totalOps) * nodePoolUsdt;
      const netShare = grossShare * multiplier;

      // Insert or update earnings record
      await pool.query(`
        INSERT INTO node_earnings (node_id, epoch_id, wallet, gross_usdt, multiplier, net_usdt, ops_count, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
        ON CONFLICT (node_id, epoch_id) DO UPDATE SET
          gross_usdt = EXCLUDED.gross_usdt,
          multiplier = EXCLUDED.multiplier,
          net_usdt = EXCLUDED.net_usdt,
          ops_count = EXCLUDED.ops_count
      `, [nodeId, epochId, wallet, grossShare, multiplier, netShare, opsCount, now]);

      totalDistributed += netShare;
      processed++;

      console.log(`[EarningsAggregator] ${nodeId}: ${opsCount} ops, ${tier} tier, $${netShare.toFixed(6)} USDT`);
    }

    console.log(`[EarningsAggregator] Epoch ${epochId}: ${processed} nodes, $${totalDistributed.toFixed(6)} distributed`);

    return { processed, totalDistributed, totalOps };

  } catch (err) {
    console.error('[EarningsAggregator] ERROR:', err.message);
    return { processed: 0, error: err.message };
  }
}

export async function getNodeEarnings(nodeId, pool, limit = 10) {
  if (!pool || !pool.query) {
    return { total: 0, pending: 0, epochs: [] };
  }

  await ensureNodeEarningsTable(pool);

  try {
    // Get total earnings
    const totalResult = await pool.query(`
      SELECT
        COALESCE(SUM(net_usdt), 0) as total_earned,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN net_usdt ELSE 0 END), 0) as pending,
        COUNT(DISTINCT epoch_id) as epochs_participated
      FROM node_earnings
      WHERE node_id = $1
    `, [nodeId]);

    // Get recent epochs
    const epochsResult = await pool.query(`
      SELECT epoch_id, gross_usdt, multiplier, net_usdt, ops_count, status, created_at
      FROM node_earnings
      WHERE node_id = $1
      ORDER BY epoch_id DESC
      LIMIT $2
    `, [nodeId, limit]);

    const totals = totalResult.rows[0];

    return {
      total_earned_usdt: parseFloat(totals.total_earned) || 0,
      pending_usdt: parseFloat(totals.pending) || 0,
      epochs_participated: parseInt(totals.epochs_participated) || 0,
      by_epoch: epochsResult.rows.map(row => ({
        epochId: row.epoch_id,
        grossUsdt: parseFloat(row.gross_usdt),
        multiplier: parseFloat(row.multiplier),
        netUsdt: parseFloat(row.net_usdt),
        opsCount: row.ops_count,
        status: row.status,
        createdAt: row.created_at
      }))
    };
  } catch (err) {
    console.error('[EarningsAggregator] getNodeEarnings error:', err.message);
    return { total_earned_usdt: 0, pending_usdt: 0, epochs_participated: 0, by_epoch: [], error: err.message };
  }
}

export async function markEarningsPaid(epochId, pool) {
  if (!pool || !pool.query) return { updated: 0 };

  try {
    const result = await pool.query(
      `UPDATE node_earnings SET status = 'paid' WHERE epoch_id = $1 AND status = 'pending'`,
      [epochId]
    );
    return { updated: result.rowCount };
  } catch (err) {
    console.error('[EarningsAggregator] markEarningsPaid error:', err.message);
    return { updated: 0, error: err.message };
  }
}
