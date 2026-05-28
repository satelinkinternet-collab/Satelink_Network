import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET ||
  '3e14c1ce35cb3b4cdcac82170b2df8f4e87909529d1fd56a6800ec71f1f9eabf';

const REGISTERED_NODES = [
  'NODE-ap-south-1-a09becbb'
];

// Rate limit: 10 tokens per hour per IP
const tokenRequests = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const key = `${ip}`;
  const record = tokenRequests.get(key) || { count: 0, reset: now + 3600000 };
  if (now > record.reset) {
    record.count = 0;
    record.reset = now + 3600000;
  }
  record.count++;
  tokenRequests.set(key, record);
  return record.count <= 10;
}

// POST /api/auth/node-token
// Returns a signed JWT for a registered node operator
// No password required — node ownership is proven by nodeId + wallet match
router.post('/node-token', async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const { nodeId, walletAddress } = req.body;

  if (!nodeId || !walletAddress) {
    return res.status(400).json({
      error: 'nodeId and walletAddress required'
    });
  }

  if (!rateLimit(ip)) {
    return res.status(429).json({
      error: 'Too many token requests. Try again in 1 hour.'
    });
  }

  if (!REGISTERED_NODES.includes(nodeId)) {
    return res.status(403).json({
      error: 'Node not registered'
    });
  }

  try {
    const token = jwt.sign(
      {
        nodeId,
        wallet: walletAddress.toLowerCase(),
        role: 'node_operator',
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      ok: true,
      token,
      nodeId,
      expiresIn: '7d',
      role: 'node_operator'
    });

  } catch (err) {
    console.error('[NODE AUTH]', err.message);
    return res.status(500).json({ error: 'Token generation failed' });
  }
});

export function createUnifiedAuthRouter() {
  return router;
}

export default router;
