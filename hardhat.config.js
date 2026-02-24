import "@nomicfoundation/hardhat-ethers";
import "dotenv/config";

/** @type {import('hardhat/config').HardhatUserConfig} */
export default {
  solidity: "0.8.28",

  networks: {
    // ── Fuse Sparknet (testnet, chainId 123) ────────────────────────────────
    // Deploy here to smoke-test before touching mainnet.
    // Override RPC via FUSE_SPARKNET_RPC_URL env var if needed.
    fuse_sparknet: {
      url: process.env.FUSE_SPARKNET_RPC_URL || "https://rpc.fusespark.io",
      chainId: 123
    },

    // ── Fuse Mainnet (chainId 122) ───────────────────────────────────────────
    // Requires a funded wallet. Prefer Defender Relayer over raw PRIVATE_KEY.
    // See docs/DEPLOY_FUSE.md for the recommended CI deploy flow.
    fuse_mainnet: {
      url: process.env.FUSE_MAINNET_RPC_URL || "https://rpc.fuse.io",
      chainId: 122
    },
  },
};
