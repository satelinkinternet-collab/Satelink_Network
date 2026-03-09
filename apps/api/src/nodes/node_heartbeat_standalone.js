import "dotenv/config";
import { ethers } from "ethers";
import crypto from "crypto";

const API_URL = process.env.API_URL || "http://localhost:8080";
const HEARTBEAT_URL = `${API_URL}/heartbeat`;
const PAIR_URL = `${API_URL}/pair/confirm`;

const NODE_PRIVATE_KEY = process.env.NODE_PRIVATE_KEY;

if (!NODE_PRIVATE_KEY) {
  console.error("Missing NODE_PRIVATE_KEY in .env");
  process.exit(1);
}

const wallet = new ethers.Wallet(NODE_PRIVATE_KEY);

// Simple CLI args
const args = process.argv.slice(2);
const pairingCode = args.find(a => a.startsWith('--code='))?.split('=')[1] || args[args.indexOf('--code') + 1];

function heartbeatMessage({ timestamp }) {
  // Server expects: "HEARTBEAT:{timestamp}" (Phase 3 in server.js)
  return `HEARTBEAT:${timestamp}`;
}

async function pairWithCode(code) {
  const nodeWallet = await wallet.getAddress();
  console.log(`[PAIRING] Attempting to pair with code: ${code}...`);

  try {
    const res = await fetch(PAIR_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: code,
        device_id: nodeWallet
      })
    });

    const out = await res.json();
    if (out.ok) {
      console.log("[PAIRING] SUCCESS!");
    } else {
      console.error("[PAIRING] FAILED:", out.error);
    }
    return out;
  } catch (e) {
    console.error("[PAIRING] ERROR:", e.message);
    return { ok: false };
  }
}

async function sendHeartbeat(stats = null) {
  const nodeWallet = await wallet.getAddress();
  const timestamp = Date.now(); // server.js expects Date.now() in ms, then checks drift

  // Realistic simulated stats: 15–80ms latency, 20–150 MB per direction
  const MB = 1024 * 1024;
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const heartbeatStats = stats || {
    latencyMs: rand(15, 80),
    bytesUp: rand(20, 150) * MB,
    bytesDown: rand(30, 150) * MB,
  };

  const msg = heartbeatMessage({ timestamp });
  const signature = await wallet.signMessage(msg);

  // server.js expects { node_id, wallet, timestamp, signature }
  const payload = {
    node_id: nodeWallet,
    wallet: nodeWallet,
    timestamp,
    stats: heartbeatStats,
    signature
  };

  try {
    const res = await fetch(HEARTBEAT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const out = await res.json().catch(() => ({}));
    console.log(new Date().toISOString(), "heartbeat:", res.status, out);
    return out;
  } catch (e) {
    console.error("Heartbeat Send Error:", e.message);
  }
}

async function runE2E() {
  console.log("Satelink Node Agent Simulator");
  const nodeWallet = await wallet.getAddress();
  console.log("Wallet:", nodeWallet);

  if (pairingCode) {
    await pairWithCode(pairingCode);
  } else {
    console.log("No pairing code provided, skipping pairing step...");
  }

  console.log("Sending initial heartbeat...");
  await sendHeartbeat();

  console.log("Entering heartbeat loop (60s)...");
  setInterval(sendHeartbeat, 60_000);
}

runE2E();
