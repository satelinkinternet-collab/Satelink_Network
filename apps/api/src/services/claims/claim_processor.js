/**
 * Claim Processor Service
 * Handles node operator USDT claim requests
 */

const MINIMUM_CLAIM_USDT = 1.0;
const CLAIMS_CONTRACT_ADDRESS = process.env.CLAIMS_CONTRACT_ADDRESS || '0xE475c53B88190FD2130dB1E37504991EFe283fb0';
const REVENUE_VAULT_ADDRESS = process.env.REVENUE_VAULT_ADDRESS || '0xa77512B9255D504B3fD450037f1448D4df6A1b6d';
const USDT_ADDRESS = process.env.USDT_ADDRESS || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const RPC_URL = process.env.POLYGON_MAINNET_RPC || 'https://rpc.ankr.com/polygon';

/**
 * Get claimable balance for a node
 */
export async function getClaimableBalance(nodeId, pool) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(net_usdt), 0) as claimable
     FROM node_earnings
     WHERE node_id = $1 AND status = 'pending'`,
    [nodeId]
  );
  return parseFloat(result.rows[0]?.claimable || 0);
}

/**
 * Get node earnings summary
 */
export async function getNodeEarnings(nodeId, pool) {
  const [pending, claimed, history] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(net_usdt), 0) as total FROM node_earnings WHERE node_id = $1 AND status = 'pending'`,
      [nodeId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(net_usdt), 0) as total FROM node_earnings WHERE node_id = $1 AND status = 'claimed'`,
      [nodeId]
    ),
    pool.query(
      `SELECT epoch_id, net_usdt, status, created_at
       FROM node_earnings
       WHERE node_id = $1
       ORDER BY epoch_id DESC
       LIMIT 30`,
      [nodeId]
    )
  ]);

  return {
    pending: parseFloat(pending.rows[0]?.total || 0),
    claimed: parseFloat(claimed.rows[0]?.total || 0),
    total: parseFloat(pending.rows[0]?.total || 0) + parseFloat(claimed.rows[0]?.total || 0),
    history: history.rows
  };
}

/**
 * Process a claim request
 * Returns tx hash on success
 */
export async function processClaim(nodeId, walletAddress, pool, redis) {
  // 1. Validate wallet address
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error('Invalid wallet address');
  }

  // 2. Get claimable amount
  const claimable = await getClaimableBalance(nodeId, pool);

  if (claimable < MINIMUM_CLAIM_USDT) {
    throw new Error(`Minimum claim is ${MINIMUM_CLAIM_USDT} USDT. Current claimable: ${claimable.toFixed(6)} USDT`);
  }

  // 3. Check for pending claims (prevent double-claim)
  const pendingClaim = await pool.query(
    `SELECT id FROM claims WHERE node_id = $1 AND status = 'processing' LIMIT 1`,
    [nodeId]
  );
  if (pendingClaim.rows.length > 0) {
    throw new Error('A claim is already being processed');
  }

  // 4. Create claim record as processing
  const claimResult = await pool.query(
    `INSERT INTO claims (node_id, wallet, amount_usdt, status, created_at)
     VALUES ($1, $2, $3, 'processing', NOW())
     RETURNING id`,
    [nodeId, walletAddress.toLowerCase(), claimable]
  );
  const claimId = claimResult.rows[0].id;

  try {
    // 5. Execute on-chain claim via ClaimsContract
    const txResult = await executeOnChainClaim(walletAddress, claimable);

    // 6. Update claim record with tx hash
    await pool.query(
      `UPDATE claims SET tx_hash = $1, status = 'completed', claimed_at = $2 WHERE id = $3`,
      [txResult.txHash, Math.floor(Date.now() / 1000), claimId]
    );

    // 7. Mark earnings as claimed
    await pool.query(
      `UPDATE node_earnings SET status = 'claimed' WHERE node_id = $1 AND status = 'pending'`,
      [nodeId]
    );

    // 8. Update Redis stats
    if (redis) {
      const today = new Date().toISOString().split('T')[0];
      await redis.incrbyfloat(`claims:total:${today}`, claimable);
      await redis.incr(`claims:count:${today}`);
    }

    console.log(`[Claims] ✓ Processed claim for ${nodeId}: ${claimable} USDT → ${walletAddress}`);

    return {
      ok: true,
      claimId,
      txHash: txResult.txHash,
      amount: claimable,
      polygonscanUrl: `https://polygonscan.com/tx/${txResult.txHash}`
    };

  } catch (error) {
    // Mark claim as failed
    await pool.query(
      `UPDATE claims SET status = 'failed' WHERE id = $1`,
      [claimId]
    );
    console.error(`[Claims] ✗ Failed claim for ${nodeId}:`, error.message);
    throw error;
  }
}

/**
 * Execute on-chain claim transaction
 */
async function executeOnChainClaim(walletAddress, amountUsdt) {
  const privateKey = process.env.SETTLEMENT_EVM_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Settlement signer key not configured');
  }

  const { ethers } = await import('ethers');
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(privateKey, provider);

  // ClaimsContract ABI - createClaim function
  const claimsABI = [
    'function createClaim(address beneficiary, uint256 amount) external returns (bytes32 claimId)',
    'event ClaimCreated(bytes32 indexed claimId, address indexed beneficiary, uint256 amount)'
  ];

  const contract = new ethers.Contract(CLAIMS_CONTRACT_ADDRESS, claimsABI, signer);

  // Convert USDT amount (6 decimals on Polygon)
  const amountWei = ethers.parseUnits(amountUsdt.toFixed(6), 6);

  console.log(`[Claims] Creating on-chain claim: ${amountUsdt} USDT for ${walletAddress}`);

  const tx = await contract.createClaim(walletAddress, amountWei);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Get claim history for a node
 */
export async function getClaimHistory(nodeId, pool) {
  const result = await pool.query(
    `SELECT id, wallet, amount_usdt, tx_hash, status, claimed_at, created_at
     FROM claims
     WHERE node_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [nodeId]
  );

  return result.rows.map(row => ({
    id: row.id,
    wallet: row.wallet,
    amount: parseFloat(row.amount_usdt),
    txHash: row.tx_hash,
    status: row.status,
    claimedAt: row.claimed_at,
    createdAt: row.created_at,
    polygonscanUrl: row.tx_hash ? `https://polygonscan.com/tx/${row.tx_hash}` : null
  }));
}

/**
 * Get all claims stats (admin)
 */
export async function getClaimsStats(pool) {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_claims,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_claims,
      COUNT(*) FILTER (WHERE status = 'pending' OR status = 'processing') as pending_claims,
      COALESCE(SUM(amount_usdt) FILTER (WHERE status = 'completed'), 0) as total_paid_usdt
    FROM claims
  `);

  return {
    totalClaims: parseInt(result.rows[0].total_claims),
    completedClaims: parseInt(result.rows[0].completed_claims),
    pendingClaims: parseInt(result.rows[0].pending_claims),
    totalPaidUsdt: parseFloat(result.rows[0].total_paid_usdt)
  };
}

export default {
  getClaimableBalance,
  getNodeEarnings,
  processClaim,
  getClaimHistory,
  getClaimsStats
};
