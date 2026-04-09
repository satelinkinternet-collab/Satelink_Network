import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// --- Polygon mainnet USDT (PoS) ---
// Verified: https://polygonscan.com/token/0xc2132d05d31c914a87c6611c10748aeb04b58e8f
// ~6.8M holders, 6 decimals, canonical bridged Tether
const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const USDT_DECIMALS = 6;

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

async function main() {
  // --- Validate env ---
  const { RPC_URL, PRIVATE_KEY } = process.env;
  if (!RPC_URL || !PRIVATE_KEY) {
    throw new Error("Missing RPC_URL or PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // --- Network guard ---
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 137) {
    throw new Error(`Wrong network! Expected Polygon (137), got ${network.chainId}`);
  }
  console.log("Network : Polygon mainnet (137)");
  console.log("Wallet  :", wallet.address);

  // --- Contract validation ---
  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);

  const [onChainSymbol, onChainName, onChainDecimals] = await Promise.all([
    usdt.symbol(),
    usdt.name(),
    usdt.decimals(),
  ]);

  console.log(`Token   : ${onChainName} (${onChainSymbol})`);
  console.log(`Decimals: ${onChainDecimals}`);
  console.log(`Contract: ${USDT_ADDRESS}`);

  if (onChainSymbol !== "USDT" && onChainSymbol !== "USDT0") {
    throw new Error(`Contract symbol mismatch: expected USDT, got "${onChainSymbol}" — NOT SAFE`);
  }
  if (Number(onChainDecimals) !== USDT_DECIMALS) {
    throw new Error(`Decimals mismatch: expected ${USDT_DECIMALS}, got ${onChainDecimals} — NOT SAFE`);
  }

  // --- Balance checks ---
  const maticBalance = await provider.getBalance(wallet.address);
  console.log("\nMATIC balance:", ethers.formatEther(maticBalance), "MATIC");

  const usdtBalance = await usdt.balanceOf(wallet.address);
  console.log("USDT balance :", ethers.formatUnits(usdtBalance, USDT_DECIMALS), "USDT");

  if (maticBalance === 0n) {
    throw new Error("Zero MATIC — need gas to send USDT");
  }
  if (usdtBalance === 0n) {
    throw new Error("Zero USDT balance — fund wallet with USDT before sending");
  }

  // --- Configure transfer ---
  // ⚠️  CHANGE THESE for production
  const RECIPIENT = wallet.address;           // self-transfer for testing
  const SEND_AMOUNT = "1";                    // 1 USDT

  const amount = ethers.parseUnits(SEND_AMOUNT, USDT_DECIMALS);

  if (usdtBalance < amount) {
    throw new Error(
      `Insufficient USDT. Need ${SEND_AMOUNT}, have ${ethers.formatUnits(usdtBalance, USDT_DECIMALS)}`
    );
  }

  // --- Gas estimation ---
  const gasEstimate = await usdt.transfer.estimateGas(RECIPIENT, amount);
  const feeData = await provider.getFeeData();
  const gasCost = gasEstimate * (feeData.gasPrice ?? 0n);
  console.log("\nGas estimate:", gasEstimate.toString());
  console.log("Gas cost    :", ethers.formatEther(gasCost), "MATIC");

  if (maticBalance < gasCost) {
    throw new Error(
      `Insufficient MATIC for gas. Need ~${ethers.formatEther(gasCost)}, have ${ethers.formatEther(maticBalance)}`
    );
  }

  // --- Send USDT ---
  console.log(`\nSending ${SEND_AMOUNT} USDT to ${RECIPIENT}...`);
  const tx = await usdt.transfer(RECIPIENT, amount);
  console.log("TX hash :", tx.hash);
  console.log("Explorer: https://polygonscan.com/tx/" + tx.hash);

  // --- Wait for confirmation ---
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait(1);
  console.log("✅ Confirmed in block:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());

  // --- Post-transfer balance ---
  const newBalance = await usdt.balanceOf(wallet.address);
  console.log("USDT balance after:", ethers.formatUnits(newBalance, USDT_DECIMALS), "USDT");
}

main().catch((err) => {
  console.error("❌ Error:", err.shortMessage || err.message);
  if (err.code) console.error("   Code:", err.code);
  process.exit(1);
});
