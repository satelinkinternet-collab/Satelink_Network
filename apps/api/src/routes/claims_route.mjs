import { Router } from 'express';
import { verifyJWT } from '../gateway/routes/auth_v2.js';
import { generateClaimSignature } from '../services/claims/claim_processor.js';
import { broadcaster } from '../realtime/broadcaster-instance.js';

export function createClaimsRouter(pool) {
  const router = Router();

  router.post('/:nodeId/claim', verifyJWT, async (req, res) => {
    try {
      const { nodeId } = req.params;
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'walletAddress is required in request body'
        });
      }

      const result = await generateClaimSignature(nodeId, walletAddress, pool);

      broadcaster.publish('claim:generated', {
        node_id: nodeId,
        amount_usdt: result.amount_usdt || 0,
        wallet: walletAddress,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        signature: result
      });

    } catch (err) {
      console.error('[Claims] Signature generation failed:', err.message);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  return router;
}
