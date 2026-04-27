#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import axios from 'axios';

const CONFIG_DIR = join(homedir(), '.satelink');
const CONFIG_FILE = join(CONFIG_DIR, 'node.json');
const API_BASE = process.env.SATELINK_API || 'https://rpc.satelink.network';

interface NodeConfig {
  nodeId: string;
  wallet: string;
  region: string;
  capabilities: string[];
  registeredAt: string;
}

const program = new Command();

program
  .name('satelink-node')
  .description('Satelink node operator CLI')
  .version('1.0.0');

function loadConfig(): NodeConfig | null {
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveConfig(config: NodeConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function apiCall(endpoint: string, method = 'GET', body: any = null) {
  try {
    const res = await axios({
      method,
      url: `${API_BASE}${endpoint}`,
      data: body,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    return res.data;
  } catch (err: any) {
    if (err.response) return err.response.data;
    throw err;
  }
}

program
  .command('register')
  .description('Register this node with the Satelink network')
  .requiredOption('-w, --wallet <address>', 'Operator wallet address (0x...)')
  .option('-r, --region <region>', 'Node region', 'us-east-1')
  .option('-c, --capabilities <caps>', 'Comma-separated capabilities', 'rpc,bandwidth')
  .action(async (opts) => {
    console.log('Registering node...');

    const nodeId = `node_${opts.wallet.slice(2, 10)}_${Date.now().toString(36)}`;

    try {
      const result = await apiCall('/nodes/register', 'POST', {
        node_id: nodeId,
        wallet: opts.wallet,
        region: opts.region,
        capabilities: opts.capabilities.split(','),
        registered_at: Date.now()
      });

      if (result.error) {
        console.error('Registration failed:', result.error);
        process.exit(1);
      }

      const config: NodeConfig = {
        nodeId,
        wallet: opts.wallet,
        region: opts.region,
        capabilities: opts.capabilities.split(','),
        registeredAt: new Date().toISOString()
      };

      saveConfig(config);

      console.log('Node registered successfully!');
      console.log(`  Node ID: ${nodeId}`);
      console.log(`  Wallet:  ${opts.wallet}`);
      console.log(`  Region:  ${opts.region}`);
      console.log(`\nConfig saved to: ${CONFIG_FILE}`);
      console.log('Run "satelink-node start" to begin sending heartbeats.');
    } catch (err: any) {
      console.error('Registration failed:', err.message);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start the node agent (sends heartbeat every 2 minutes)')
  .action(async () => {
    const config = loadConfig();
    if (!config) {
      console.error('Node not registered. Run "satelink-node register --wallet 0x..." first.');
      process.exit(1);
    }

    console.log('Starting Satelink node agent...');
    console.log(`  Node ID: ${config.nodeId}`);
    console.log(`  Region:  ${config.region}`);
    console.log(`  API:     ${API_BASE}`);
    console.log('');

    async function sendHeartbeat() {
      const timestamp = new Date().toISOString();
      try {
        const result = await apiCall('/nodes/heartbeat', 'POST', {
          node_id: config!.nodeId,
          wallet: config!.wallet,
          timestamp: Date.now(),
          status: 'online',
          metrics: {
            uptime: process.uptime(),
            memory: process.memoryUsage().heapUsed,
            load: 0.1
          }
        });

        if (result.ok) {
          console.log(`[${timestamp}] Heartbeat sent`);
        } else {
          console.log(`[${timestamp}] Heartbeat warning: ${result.error || 'unknown'}`);
        }
      } catch (err: any) {
        console.error(`[${timestamp}] Heartbeat failed: ${err.message}`);
      }
    }

    await sendHeartbeat();

    const INTERVAL_MS = 2 * 60 * 1000;
    setInterval(sendHeartbeat, INTERVAL_MS);

    console.log('Node agent running. Press Ctrl+C to stop.\n');
  });

program
  .command('status')
  .description('Show current node status')
  .action(async () => {
    const config = loadConfig();
    if (!config) {
      console.log('Status: NOT REGISTERED');
      console.log('Run "satelink-node register --wallet 0x..." to register.');
      return;
    }

    console.log('Satelink Node Status');
    console.log('--------------------');
    console.log(`Node ID:      ${config.nodeId}`);
    console.log(`Wallet:       ${config.wallet}`);
    console.log(`Region:       ${config.region}`);
    console.log(`Capabilities: ${config.capabilities.join(', ')}`);
    console.log(`Registered:   ${config.registeredAt}`);
    console.log(`API:          ${API_BASE}`);

    try {
      const result = await apiCall(`/nodes/${config.nodeId}/status`);
      if (result.ok) {
        console.log(`\nNetwork Status: ${result.status || 'online'}`);
        console.log(`Last Heartbeat: ${result.lastHeartbeat || 'unknown'}`);
        console.log(`Reputation:     ${result.reputation || 'pending'}`);
      }
    } catch {
      console.log('\nNetwork Status: Unable to reach API');
    }
  });

program.parse();
