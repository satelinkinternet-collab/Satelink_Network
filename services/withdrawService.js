import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

// ── Singleton provider + wallet (reuse across calls) ──
let _provider = null;
let _wallet = null;

function getWallet() {
  if (!_wallet) {
    if (!process.env.RPC_URL || !process.env.PRIVATE_KEY) {
      throw new Error("Missing RPC_URL or PRIVATE_KEY in environment");
    }
    _provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    _wallet = new ethers.Wallet(process.env.PRIVATE_KEY, _provider);
  }
  return { provider: _provider, wallet: _wallet };
}

/**
 * Send USDT (or any ERC-20) on Polygon.
 * @param {string} to          - Recipient wallet address
 * @param {string} amountHuman - Amount in human units (e.g. "1" = 1 USDT)
 * @param {string} tokenAddress - ERC-20 contract address
 * @returns {Promise<string>}  - Transaction hash
 */
export async function sendUSDT(to, amountHuman, tokenAddress) {
  // ── Validate inputs ──
  if (!ethers.isAddress(to)) {
    throw new Error(`Invalid recipient address: ${to}`);
  }
  if (!ethers.isAddress(tokenAddress)) {
    throw new Error(`Invalid token contract: ${tokenAddress}`);
  }

  const { provider, wallet } = getWallet();

  // ── Network guard ──
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 137) {
    throw new Error(`Wrong network! Expected Polygon (137), got ${network.chainId}`);
  }

  const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

  // ── On-chain contract validation ──
  const [symbol, decimals] = await Promise.all([
    token.symbol(),
    token.decimals(),
  ]);

  if (symbol !== "USDT" && symbol !== "USDT0") {
    throw new Error(`Token symbol mismatch: expected USDT, got "${symbol}"`);
  }

  const amount = ethers.parseUnits(amountHuman.toString(), decimals);

  // ── Balance checks ──
  const [tokenBalance, nativeBalance] = await Promise.all([
    token.balanceOf(wallet.address),
    provider.getBalance(wallet.address),
  ]);

  if (tokenBalance < amount) {
    const err = new Error(
      `Insufficient USDT: need ${amountHuman}, have ${ethers.formatUnits(tokenBalance, decimals)}`
    );
    err.code = "INSUFFICIENT_FUNDS";
    throw err;
  }

  if (nativeBalance === 0n) {
    const err = new Error("Zero MATIC balance — cannot pay gas");
    err.code = "INSUFFICIENT_FUNDS";
    throw err;
  }

  // ── Send ──
  const tx = await token.transfer(to, amount);
  console.log(`[withdrawService] TX sent: ${tx.hash}`);

  // Wait for 1 confirmation
  const receipt = await tx.wait(1);
  console.log(`[withdrawService] Confirmed block: ${receipt.blockNumber}, gas: ${receipt.gasUsed}`);

  return tx.hash;
}
