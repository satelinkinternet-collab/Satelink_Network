import "@nomicfoundation/hardhat-ethers";
import "dotenv/config";

/** @type {import('hardhat/config').HardhatUserConfig} */
export default {
  solidity: "0.8.28",

  networks: {
    // ── Fuse Sparknet (testnet, chainId 123) ────────────────────────────────
    // Deploy here to smoke-test before touching mainnet.
    // Override RPC via FUSE_SPARKNET_RPC_URL env var if needed.
    sparknet: {
      type: "http",
      chainId: 123,
      url: process.env.FUSE_SPARKNET_RPC_URL ?? "https://rpc.fusespark.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },

    // ── Fuse Mainnet (chainId 122) ───────────────────────────────────────────
    // Requires a funded wallet. Prefer Defender Relayer over raw PRIVATE_KEY.
    // See docs/defender-deployment.md for the recommended CI deploy flow.
    fuse: {
      type: "http",
      chainId: 122,
      url: process.env.FUSE_RPC_URL ?? "https://rpc.fuse.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
