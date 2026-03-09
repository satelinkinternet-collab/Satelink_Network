import express from 'express';
import crypto from 'crypto';
import { getOpsPrice } from '../../core/config/ops_pricing.js';

export function createOpsRouter(db, opsExecutionAdapter) {
    const router = express.Router();

    // Mock auth middleware for Developer API Keys
    const authenticateDeveloper = (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        // Assume valid for testing / internal demo if provided
        if (!apiKey) return res.status(401).json({ error: 'Unauthorized: missing X-API-Key' });
        req.developerId = `dev_${crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 8)}`;
        next();
    };

    /**
     * PART 1: POST /v1/ops
     * Submits a new infrastructure operations request
     */
    router.post('/', authenticateDeveloper, async (req, res) => {
        try {
            const { op_type, target, payload } = req.body;

            // PART 5: SECURITY RULES & VALIDATION
            const validOpTypes = ['rpc_call', 'ai_inference', 'automation_job', 'webhook_delivery', 'data_processing'];
            if (!op_type || !validOpTypes.includes(op_type)) {
                return res.status(400).json({ error: 'Invalid or unsupported op_type' });
            }
            if (!payload || typeof payload !== 'object') {
                return res.status(400).json({ error: 'Payload must be a valid JSON object' });
            }

            // Size limit rule (Payload max 10KB)
            const payloadString = JSON.stringify(payload);
            if (Buffer.byteLength(payloadString, 'utf8') > 10240) {
                return res.status(413).json({ error: 'Payload exceeds 10KB maximum size' });
            }

            // Derive required base reward mathematically instead of trusting client input
            const baseReward = getOpsPrice(op_type);

            // Minimum reward check threshold equivalent to base
            if (baseReward < 0.0001) {
                return res.status(400).json({ error: 'System configuration error: Op price under minimum threshold.' });
            }

            // Create Op ID
            const opId = `op_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

            // Insert into ops_registry internal persistence (Part 2 Registry Integration)
            db.prepare(`
                INSERT INTO ops_registry (op_id, op_type, target, payload, reward, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'pending', ?)
            `).run(opId, op_type, target || 'generic', payloadString, baseReward, Date.now());

            db.prepare(`UPDATE universal_ops_metrics SET operations_received = operations_received + 1 WHERE id = 1`).run();

            // Pass execution abstractly to the unified pipeline adapter (Part 4 integration)
            // It will map it to jobQueue explicitly
            await opsExecutionAdapter.dispatchOperation({
                id: opId,
                type: op_type,
                target: target || 'generic',
                payload: payload,
                reward: baseReward,
                client_id: req.developerId
            });

            // Status logically turns scheduled 
            db.prepare(`UPDATE ops_registry SET status = 'scheduled' WHERE op_id = ?`).run(opId);

            res.status(201).json({
                message: 'Operation accepted and scheduled successfully',
                op_id: opId,
                status: 'scheduled',
                cost: baseReward
            });

        } catch (error) {
            console.error("[OpsAPI] Error submitting operation:", error);
            res.status(500).json({ error: 'Internal server error processing operations submission' });
        }
    });

    return router;
}
