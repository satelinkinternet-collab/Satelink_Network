#!/usr/bin/env node
/**
 * Node Simulator — 72-hour Endurance Test
 *
 * Simulates 10 DePIN nodes sending signed heartbeats every 30 seconds.
 * Uses the authenticated /heartbeat endpoint with EIP-191 signatures.
 *
 * Usage:
 *   API_BASE=http://localhost:8080 node scripts/simulate_nodes.js
 *
 * Environment:
 *   API_BASE — backend URL (default: http://localhost:8080)
 *   NODE_COUNT — number of simulated nodes (default: 10)
 *   HEARTBEAT_INTERVAL — interval in ms (default: 30000)
 */

import { ethers } from 'ethers';

const API_BASE = process.env.API_BASE || 'http://localhost:8080';
const NODE_COUNT = parseInt(process.env.NODE_COUNT || '10', 10);
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL || '30000', 10);

// Generate deterministic wallets for simulation
function createSimNodes(count) {
    const nodes = [];
    for (let i = 0; i < count; i++) {
        // Deterministic key from seed so restarts keep the same wallets
        const seed = ethers.id(`satelink-sim-node-${i}`);
        const wallet = new ethers.Wallet(seed);
        nodes.push({
            wallet,
            address: wallet.address,
            nonce: 0,
            registered: false,
            heartbeats: 0,
            errors: 0,
        });
    }
    return nodes;
}

// Register a node (best-effort — may already exist)
async function registerNode(node) {
    try {
        const res = await fetch(`${API_BASE}/v1/node/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                node_id: node.address,
                wallet: node.address,
                operator: node.address,
                region: ['us-east', 'eu-west', 'ap-south'][node.nonce % 3],
                capabilities: ['rpc', 'ai', 'automation'],
            }),
        });
        const data = await res.json();
        node.registered = true;
        console.log(`[Node ${node.address.slice(0, 10)}] Registered: ${data.ok ?? res.status}`);
    } catch (e) {
        // Likely already registered — continue
        node.registered = true;
        console.warn(`[Node ${node.address.slice(0, 10)}] Register skipped: ${e.message}`);
    }
}

// Send a signed heartbeat
async function sendHeartbeat(node) {
    node.nonce++;
    const timestamp = Math.floor(Date.now() / 1000);
    const stats = {
        cpu: Math.round(15 + Math.random() * 50),
        memory: Math.round(30 + Math.random() * 40),
        disk: Math.round(10 + Math.random() * 30),
        latency_ms: Math.round(5 + Math.random() * 45),
        capacity_available: Math.round(50 + Math.random() * 50),
        uptime_hours: Math.round(node.heartbeats * HEARTBEAT_INTERVAL / 3600000),
    };

    const message = [
        'SATELINK_HEARTBEAT',
        `wallet=${node.address}`,
        `timestamp=${timestamp}`,
        `nonce=${node.nonce}`,
        `stats=${JSON.stringify(stats)}`,
    ].join('\n');

    try {
        const signature = await node.wallet.signMessage(message);

        const res = await fetch(`${API_BASE}/v1/node/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                node_id: node.address,
                cpu_usage: stats.cpu,
                memory_usage: stats.memory,
                capacity_available: stats.capacity_available,
                latency_ms: stats.latency_ms,
                timestamp,
                nonce: node.nonce,
                signature,
            }),
        });

        if (res.ok) {
            node.heartbeats++;
        } else {
            node.errors++;
            const body = await res.text();
            console.error(`[Node ${node.address.slice(0, 10)}] Heartbeat ${res.status}: ${body.slice(0, 100)}`);
        }
    } catch (e) {
        node.errors++;
        console.error(`[Node ${node.address.slice(0, 10)}] Heartbeat error: ${e.message}`);
    }
}

// Print summary
function printSummary(nodes, startTime) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const totalHB = nodes.reduce((s, n) => s + n.heartbeats, 0);
    const totalErr = nodes.reduce((s, n) => s + n.errors, 0);
    console.log(`\n── Node Simulator Summary (${elapsed}s elapsed) ──`);
    console.log(`  Nodes: ${nodes.length}  |  Total heartbeats: ${totalHB}  |  Errors: ${totalErr}`);
    nodes.forEach(n => {
        console.log(`  ${n.address.slice(0, 12)}  hb=${n.heartbeats}  err=${n.errors}  nonce=${n.nonce}`);
    });
    console.log('');
}

// Main
async function main() {
    console.log(`\n=== Satelink Node Simulator ===`);
    console.log(`  API:    ${API_BASE}`);
    console.log(`  Nodes:  ${NODE_COUNT}`);
    console.log(`  Interval: ${HEARTBEAT_INTERVAL}ms\n`);

    const nodes = createSimNodes(NODE_COUNT);
    const startTime = Date.now();

    // Register all nodes
    console.log('Registering nodes...');
    await Promise.all(nodes.map(n => registerNode(n)));
    console.log('Registration complete.\n');

    // Heartbeat loop
    const tick = async () => {
        const batch = nodes.map(n => sendHeartbeat(n));
        await Promise.allSettled(batch);
    };

    // First tick immediately
    await tick();

    const interval = setInterval(tick, HEARTBEAT_INTERVAL);

    // Summary every 5 minutes
    const summaryInterval = setInterval(() => printSummary(nodes, startTime), 300000);

    // Graceful shutdown
    const shutdown = () => {
        console.log('\nShutting down node simulator...');
        clearInterval(interval);
        clearInterval(summaryInterval);
        printSummary(nodes, startTime);
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    console.log(`Heartbeat loop started. Ctrl+C to stop.\n`);
}

main().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
