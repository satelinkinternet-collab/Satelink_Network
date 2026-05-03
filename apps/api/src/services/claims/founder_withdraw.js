/**
 * Founder Withdrawal Service
 * Handles platform fee withdrawals for founders (30% pool)
 */

const REVENUE_DISTRIBUTOR_ADDRESS = process.env.REVENUE_DISTRIBUTOR_ADDRESS || '0x8a9CefBD801574806a634aF179f538ABB5926F5a';
const RPC_URL = process.env.POLYGON_MAINNET_RPC || 'https://rpc.ankr.com/polygon';

/**
 * Get platform revenue stats
 */
export async function getPlatformStats(pool) {
  // Get total revenue from epoch_ledger
  const revenueResult = await pool.query(`
    SELECT
      COALESCE(SUM(revenue_usdt), 0) as total_revenue,
      COALESCE(SUM(revenue_usdt * 0.30), 0) as platform_fee,
      COALESCE(SUM(revenue_usdt * 0.50), 0) as node_operator_share,
      COALESCE(SUM(revenue_usdt * 0.20), 0) as distribution_pool
    FROM epoch_ledger
  `);

  // Get total withdrawn by founders
  const withdrawnResult = await pool.query(`
    SELECT COALESCE(SUM(amount_usdt), 0) as total_withdrawn
    FROM founder_withdrawals
    WHERE status = 'completed'
  `);

  const totalRevenue = parseFloat(revenueResult.rows[0]?.total_revenue || 0);
  const platformFee = parseFloat(revenueResult.rows[0]?.platform_fee || 0);
  const nodeOperatorShare = parseFloat(revenueResult.rows[0]?.node_operator_share || 0);
  const distributionPool = parseFloat(revenueResult.rows[0]?.distribution_pool || 0);
  const totalWithdrawn = parseFloat(withdrawnResult.rows[0]?.total_withdrawn || 0);

  return {
    totalRevenue,
    platformFee,
    nodeOperatorShare,
    distributionPool,
    totalWithdrawn,
    availableToWithdraw: platformFee - totalWithdrawn
  };
}

/**
 * Process founder withdrawal
 */
export async function processFounderWithdrawal(founderId, walletAddress, amount, pool, redis) {
  // 1. Validate wallet address
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error('Invalid wallet address');
  }

  // 2. Check available balance
  const stats = await getPlatformStats(pool);
  if (amount > stats.availableToWithdraw) {
    throw new Error(`Insufficient balance. Available: ${stats.availableToWithdraw.toFixed(6)} USDT, Requested: ${amount.toFixed(6)} USDT`);
  }

  // 3. Create withdrawal record
  const withdrawalResult = await pool.query(
    `INSERT INTO founder_withdrawals (founder_id, wallet, amount_usdt, status, created_at)
     VALUES ($1, $2, $3, 'processing', NOW())
     RETURNING id`,
    [founderId, walletAddress.toLowerCase(), amount]
  );
  const withdrawalId = withdrawalResult.rows[0].id;

  try {
    // 4. Execute on-chain withdrawal
    const txResult = await executeFounderWithdrawal(walletAddress, amount);

    // 5. Update withdrawal record
    await pool.query(
      `UPDATE founder_withdrawals SET tx_hash = $1, status = 'completed', completed_at = $2 WHERE id = $3`,
      [txResult.txHash, Math.floor(Date.now() / 1000), withdrawalId]
    );

    // 6. Update Redis stats
    if (redis) {
      const today = new Date().toISOString().split('T')[0];
      await redis.incrbyfloat(`founder_withdrawals:${today}`, amount);
    }

    console.log(`[Founder] ✓ Processed withdrawal: ${amount} USDT → ${walletAddress}`);

    return {
      ok: true,
      withdrawalId,
      txHash: txResult.txHash,
      amount,
      polygonscanUrl: `https://polygonscan.com/tx/${txResult.txHash}`
    };

  } catch (error) {
    await pool.query(
      `UPDATE founder_withdrawals SET status = 'failed' WHERE id = $1`,
      [withdrawalId]
    );
    console.error(`[Founder] ✗ Withdrawal failed:`, error.message);
    throw error;
  }
}

/**
 * Execute on-chain founder withdrawal via RevenueDistributor
 */
async function executeFounderWithdrawal(walletAddress, amountUsdt) {
  const privateKey = process.env.SETTLEMENT_EVM_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Settlement signer key not configured');
  }

  const { ethers } = await import('ethers');
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(privateKey, provider);

  // For now, we'll transfer USDT directly from treasury
  // In production, this would call RevenueDistributor.withdrawPlatformFee()
  const USDT_ADDRESS = process.env.USDT_ADDRESS || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

  const usdtABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)'
  ];

  const usdt = new ethers.Contract(USDT_ADDRESS, usdtABI, signer);

  // Convert amount (6 decimals)
  const amountWei = ethers.parseUnits(amountUsdt.toFixed(6), 6);

  // Check balance
  const balance = await usdt.balanceOf(signer.address);
  if (balance < amountWei) {
    throw new Error(`Insufficient USDT balance in treasury. Available: ${ethers.formatUnits(balance, 6)}`);
  }

  console.log(`[Founder] Transferring ${amountUsdt} USDT to ${walletAddress}`);

  const tx = await usdt.transfer(walletAddress, amountWei);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Get withdrawal history
 */
export async function getWithdrawalHistory(pool, limit = 50) {
  const result = await pool.query(
    `SELECT id, founder_id, wallet, amount_usdt, tx_hash, status, completed_at, created_at
     FROM founder_withdrawals
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    founderId: row.founder_id,
    wallet: row.wallet,
    amount: parseFloat(row.amount_usdt),
    txHash: row.tx_hash,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    polygonscanUrl: row.tx_hash ? `https://polygonscan.com/tx/${row.tx_hash}` : null
  }));
}

export default {
  getPlatformStats,
  processFounderWithdrawal,
  getWithdrawalHistory
};
