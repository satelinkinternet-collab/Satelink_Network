import "dotenv/config";
import { ethers } from "ethers";
import crypto from "crypto";

const API_URL = process.env.API_URL || "http://localhost:8080/heartbeat";
const NODE_PRIVATE_KEY = process.env.NODE_PRIVATE_KEY;

if (!NODE_PRIVATE_KEY) {
  console.error("Missing NODE_PRIVATE_KEY");
  process.exit(1);
}

const wallet = new ethers.Wallet(NODE_PRIVATE_KEY);

function heartbeatMessage({ nodeWallet, timestamp, nonce, stats }) {
  const statsStr = stats ? JSON.stringify(stats) : "{}";
  return `SATELINK_HEARTBEAT
wallet=${nodeWallet}
timestamp=${timestamp}
nonce=${nonce}
stats=${statsStr}`;
}

async function sendHeartbeat() {
  const nodeWallet = await wallet.getAddress();
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();

  // You can later replace these with real device stats
  const stats = { latencyMs: 30, bytesUp: 1000, bytesDown: 2000 };

  const msg = heartbeatMessage({ nodeWallet, timestamp, nonce, stats });
  const signature = await wallet.signMessage(msg);

  const payload = { nodeWallet, timestamp, nonce, stats, signature };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const out = await res.json().catch(() => ({}));
  console.log(new Date().toISOString(), "heartbeat:", res.status, out);
}

// send now + every 60 seconds
sendHeartbeat();
setInterval(sendHeartbeat, 60_000);

