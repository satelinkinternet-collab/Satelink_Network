/**
 * Node Registry Service
 * S2-001: Node registration API for DePIN network
 *
 * Endpoints:
 * - POST /api/nodes/register — Register new node
 * - GET /api/nodes — List active nodes (public)
 * - GET /api/nodes/:nodeId — Get node details (public)
 * - GET /api/nodes/:nodeId/earnings — Get node earnings (authenticated)
 */

import { Router } from 'express';
import crypto from 'crypto';

const VALID_REGIONS = ['ap-south-1', 'us-east-1', 'eu-west-1', 'ap-southeast-1'];
const VALID_NODE_TYPES = ['rpc', 'bandwidth', 'compute'];
const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

async function ensureTable(db) {
  if (!db || !db.query) return;

  try {
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'registered_nodes'
      )
    `);

    if (!tableExists.rows[0]?.exists) {
      await db.query(`
        CREATE TABLE registered_nodes (
          id SERIAL PRIMARY KEY,
          node_id TEXT UNIQUE NOT NULL,
          wallet TEXT NOT NULL,
          node_type TEXT NOT NULL DEFAULT 'rpc',
          endpoint_url TEXT NOT NULL,
          region TEXT NOT NULL,
          chain_ids JSONB NOT NULL DEFAULT '[]',
          hardware_json JSONB,
          status TEXT NOT NULL DEFAULT 'pending',
          tier TEXT NOT NULL DEFAULT 'bronze',
          reputation_score INTEGER DEFAULT 0,
          uptime_pct NUMERIC(5,2) DEFAULT 0,
          registered_at BIGINT NOT NULL,
          last_heartbeat_at BIGINT,
          updated_at BIGINT
        )
      `);
      console.log('[NodeRegistry] Table created');
    } else {
      const migrations = [
        "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS node_type TEXT DEFAULT 'rpc'",
        "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'unknown'",
        "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS endpoint_url TEXT DEFAULT ''",
        "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS chain_ids JSONB DEFAULT '[]'",
        "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS hardware_json JSONB",
        "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'",
        "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'bronze'",
        "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0",
        "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS uptime_pct NUMERIC(5,2) DEFAULT 0",
        "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS registered_at BIGINT DEFAULT 0",
        "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS last_heartbeat_at BIGINT",
        "ALTER TABLE registered_nodes ADD COLUMN IF NOT EXISTS updated_at BIGINT"
      ];
      for (const sql of migrations) {
        try { await db.query(sql); } catch (e) { /* column may already exist */ }
      }
      console.log('[NodeRegistry] Table migrated');
    }

    await db.query(`CREATE INDEX IF NOT EXISTS idx_registered_nodes_wallet ON registered_nodes(wallet)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_registered_nodes_region ON registered_nodes(region)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_registered_nodes_status ON registered_nodes(status)`);

    console.log('[NodeRegistry] Table ensured');
  } catch (err) {
    console.error('[NodeRegistry] Table creation failed:', err.message);
  }
}

function generateNodeId(region) {
  const randomHex = crypto.randomBytes(4).toString('hex');
  return `NODE-${region}-${randomHex}`;
}

async function validateEndpoint(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const healthUrl = url.endsWith('/') ? `${url}health` : `${url}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (err) {
    clearTimeout(timeoutId);
    return false;
  }
}

async function sendDiscordNotification(nodeId, region, walletPrefix) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Satelink Nodes',
        embeds: [{
          title: '🔌 New Node Registered',
          color: 0x1AFFD4,
          fields: [
            { name: 'Node ID', value: nodeId, inline: true },
            { name: 'Region', value: region, inline: true },
            { name: 'Wallet', value: `${walletPrefix}...`, inline: true }
          ],
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error('[NodeRegistry] Discord notification failed:', err.message);
  }
}

export function createNodeRegistryRouter(db, redis) {
  const router = Router();

  ensureTable(db);

  router.post('/register', async (req, res) => {
    try {
      const { wallet_address, node_type, endpoint_url, region, chain_ids, hardware } = req.body || {};

      if (!wallet_address || !WALLET_REGEX.test(wallet_address)) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid wallet_address format. Must be 0x followed by 40 hex characters.'
        });
      }

      if (!node_type || !VALID_NODE_TYPES.includes(node_type)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid node_type. Valid: ${VALID_NODE_TYPES.join(', ')}`
        });
      }

      if (!endpoint_url) {
        return res.status(400).json({
          ok: false,
          error: 'endpoint_url is required'
        });
      }

      try {
        new URL(endpoint_url);
      } catch {
        return res.status(400).json({
          ok: false,
          error: 'Invalid endpoint_url format'
        });
      }

      if (!region || !VALID_REGIONS.includes(region)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid region. Valid: ${VALID_REGIONS.join(', ')}`
        });
      }

      if (!Array.isArray(chain_ids) || chain_ids.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'chain_ids must be a non-empty array of chain IDs'
        });
      }

      const endpointReachable = await validateEndpoint(endpoint_url);
      if (!endpointReachable) {
        return res.status(400).json({
          ok: false,
          error: 'Endpoint unreachable. Ensure /health returns 200 OK.'
        });
      }

      const nodeId = generateNodeId(region);
      const now = Math.floor(Date.now() / 1000);

      if (db && db.query) {
        const existing = await db.query(
          'SELECT node_id FROM registered_nodes WHERE wallet = $1 AND endpoint_url = $2',
          [wallet_address, endpoint_url]
        );

        if (existing.rows.length > 0) {
          return res.status(409).json({
            ok: false,
            error: 'Node with this wallet and endpoint already registered',
            existingNodeId: existing.rows[0].node_id
          });
        }

        await db.query(
          `INSERT INTO registered_nodes
           (node_id, wallet, node_type, endpoint_url, region, chain_ids, hardware_json, status, tier, registered_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'bronze', $8, $8)`,
          [nodeId, wallet_address, node_type, endpoint_url, region, JSON.stringify(chain_ids), JSON.stringify(hardware || {}), now]
        );
      }

      if (redis) {
        try {
          await redis.set(
            `node:${nodeId}`,
            JSON.stringify({
              wallet: wallet_address,
              node_type,
              endpoint_url,
              region,
              chain_ids,
              status: 'pending',
              tier: 'bronze',
              registered_at: now
            }),
            'EX',
            86400 * 7
          );
        } catch (err) {
          console.error('[NodeRegistry] Redis cache failed:', err.message);
        }
      }

      await sendDiscordNotification(nodeId, region, wallet_address.slice(0, 8));

      console.log(`[NodeRegistry] Registered: ${nodeId} region=${region} wallet=${wallet_address.slice(0, 8)}...`);

      res.status(201).json({
        ok: true,
        nodeId,
        tier: 'bronze',
        status: 'pending',
        message: 'Node registered successfully. Status will change to active after first heartbeat.',
        nextStep: 'Configure heartbeat endpoint to maintain uptime tracking'
      });
    } catch (err) {
      console.error('[NodeRegistry] Register error:', err.message);
      res.status(500).json({ ok: false, error: 'Failed to register node' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const { region, type, status, chain_id, page = 1, limit = 20 } = req.query;

      if (!db || !db.query) {
        return res.status(503).json({ ok: false, error: 'Database unavailable' });
      }

      const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (region && VALID_REGIONS.includes(region)) {
        conditions.push(`region = $${paramIndex++}`);
        params.push(region);
      }

      if (type && VALID_NODE_TYPES.includes(type)) {
        conditions.push(`node_type = $${paramIndex++}`);
        params.push(type);
      }

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (chain_id) {
        conditions.push(`chain_ids @> $${paramIndex++}::jsonb`);
        params.push(JSON.stringify([parseInt(chain_id)]));
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await db.query(
        `SELECT COUNT(*) as total FROM registered_nodes ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.total) || 0;

      params.push(parseInt(limit), offset);
      const result = await db.query(
        `SELECT node_id, node_type, region, chain_ids, status, tier, reputation_score, uptime_pct, registered_at
         FROM registered_nodes
         ${whereClause}
         ORDER BY registered_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      );

      res.json({
        ok: true,
        nodes: result.rows.map(row => ({
          nodeId: row.node_id,
          nodeType: row.node_type,
          region: row.region,
          chainIds: row.chain_ids,
          status: row.status,
          tier: row.tier,
          reputationScore: row.reputation_score,
          uptimePct: parseFloat(row.uptime_pct) || 0,
          registeredAt: row.registered_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (err) {
      console.error('[NodeRegistry] List error:', err.message);
      res.status(500).json({ ok: false, error: 'Failed to list nodes' });
    }
  });

  router.get('/:nodeId', async (req, res) => {
    try {
      const { nodeId } = req.params;

      if (!db || !db.query) {
        return res.status(503).json({ ok: false, error: 'Database unavailable' });
      }

      const result = await db.query(
        `SELECT node_id, wallet, node_type, endpoint_url, region, chain_ids, hardware_json,
                status, tier, reputation_score, uptime_pct, registered_at, last_heartbeat_at, updated_at
         FROM registered_nodes
         WHERE node_id = $1`,
        [nodeId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Node not found' });
      }

      const row = result.rows[0];

      res.json({
        ok: true,
        node: {
          nodeId: row.node_id,
          wallet: row.wallet,
          nodeType: row.node_type,
          endpointUrl: row.endpoint_url,
          region: row.region,
          chainIds: row.chain_ids,
          hardware: row.hardware_json,
          status: row.status,
          tier: row.tier,
          reputationScore: row.reputation_score,
          uptimePct: parseFloat(row.uptime_pct) || 0,
          registeredAt: row.registered_at,
          lastHeartbeatAt: row.last_heartbeat_at,
          updatedAt: row.updated_at
        }
      });
    } catch (err) {
      console.error('[NodeRegistry] Get node error:', err.message);
      res.status(500).json({ ok: false, error: 'Failed to get node details' });
    }
  });

  router.get('/:nodeId/earnings', async (req, res) => {
    try {
      const { nodeId } = req.params;
      const apiKey = req.headers['x-api-key'];

      if (!apiKey) {
        return res.status(401).json({
          ok: false,
          error: 'x-api-key header required for earnings endpoint'
        });
      }

      if (!db || !db.query) {
        return res.status(503).json({ ok: false, error: 'Database unavailable' });
      }

      const nodeResult = await db.query(
        'SELECT wallet FROM registered_nodes WHERE node_id = $1',
        [nodeId]
      );

      if (nodeResult.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Node not found' });
      }

      const nodeWallet = nodeResult.rows[0].wallet;

      const keyResult = await db.query(
        `SELECT rk.email FROM rpc_api_keys rk
         WHERE rk.key_hash = encode(sha256($1::bytea), 'hex') AND rk.status = 'active'`,
        [apiKey]
      );

      if (keyResult.rows.length === 0) {
        return res.status(403).json({ ok: false, error: 'Invalid or inactive API key' });
      }

      const revenueResult = await db.query(
        `SELECT
           COALESCE(SUM(amount_usdt), 0) as total_earned,
           COUNT(DISTINCT epoch_id) as epochs_participated
         FROM revenue_events_v2
         WHERE node_id = $1`,
        [nodeId]
      );

      const pendingResult = await db.query(
        `SELECT COALESCE(SUM(node_share_usdt), 0) as pending
         FROM epoch_ledger
         WHERE node_id = $1 AND status = 'pending'`,
        [nodeId]
      );

      const claimableResult = await db.query(
        `SELECT COALESCE(SUM(node_share_usdt), 0) as claimable
         FROM epoch_ledger
         WHERE node_id = $1 AND status = 'settled' AND claimed = false`,
        [nodeId]
      );

      const lastClaimResult = await db.query(
        `SELECT MAX(claimed_at) as last_claim
         FROM node_claims
         WHERE node_id = $1`,
        [nodeId]
      );

      const totalEarned = parseFloat(revenueResult.rows[0]?.total_earned) || 0;
      const pending = parseFloat(pendingResult.rows[0]?.pending) || 0;
      const claimable = parseFloat(claimableResult.rows[0]?.claimable) || 0;
      const epochsParticipated = parseInt(revenueResult.rows[0]?.epochs_participated) || 0;
      const lastClaimAt = lastClaimResult.rows[0]?.last_claim || null;

      res.json({
        ok: true,
        earnings: {
          total_earned_usdt: totalEarned,
          pending_usdt: pending,
          claimable_usdt: claimable,
          epochs_participated: epochsParticipated,
          last_claim_at: lastClaimAt
        }
      });
    } catch (err) {
      console.error('[NodeRegistry] Earnings error:', err.message);
      res.status(500).json({ ok: false, error: 'Failed to get earnings' });
    }
  });

  router.post('/:nodeId/heartbeat', async (req, res) => {
    try {
      const { nodeId } = req.params;
      const { cpu_pct, ram_pct, uptime_seconds, rpc_calls_served } = req.body || {};

      if (!db || !db.query) {
        return res.status(503).json({ ok: false, error: 'Database unavailable' });
      }

      const nodeResult = await db.query(
        'SELECT node_id, status FROM registered_nodes WHERE node_id = $1',
        [nodeId]
      );

      if (nodeResult.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Node not found' });
      }

      const now = Math.floor(Date.now() / 1000);
      const currentStatus = nodeResult.rows[0].status;
      const newStatus = currentStatus === 'pending' ? 'active' : currentStatus;

      await db.query(
        `UPDATE registered_nodes
         SET last_heartbeat_at = $1, status = $2, updated_at = $1
         WHERE node_id = $3`,
        [now, newStatus, nodeId]
      );

      if (redis) {
        try {
          await redis.set(
            `node:heartbeat:${nodeId}`,
            JSON.stringify({ cpu_pct, ram_pct, uptime_seconds, rpc_calls_served, timestamp: now }),
            'EX',
            300
          );
        } catch (e) { /* redis optional */ }
      }

      console.log(`[NodeRegistry] Heartbeat: ${nodeId} status=${newStatus}`);

      res.json({
        ok: true,
        nodeId,
        status: newStatus,
        lastHeartbeatAt: now
      });
    } catch (err) {
      console.error('[NodeRegistry] Heartbeat error:', err.message);
      res.status(500).json({ ok: false, error: 'Failed to process heartbeat' });
    }
  });

  return router;
}
