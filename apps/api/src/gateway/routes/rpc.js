import express from 'express';
import crypto from 'crypto';
import { EthereumAdapter } from '../../providers/adapters/ethereum.js';
import { PolygonAdapter } from '../../providers/adapters/polygon.js';
import { SolanaAdapter } from '../../providers/adapters/solana.js';
import { FuseAdapter } from '../../providers/adapters/fuse.js';
import { ArbitrumAdapter } from '../../providers/adapters/arbitrum.js';
import { OperationsEngine } from '../../core/operations_engine.js';
import { NodeCapacityRegistry } from '../../execution/bootstrap/node_capacity_registry.js';
import { ProviderFallbackAdapter } from '../../execution/bootstrap/provider_fallback_adapter.js';
import { ExecutionAssuranceRouter } from '../../execution/bootstrap/execution_assurance_router.js';
import { validateApiKey } from '../../security/auth_middleware.js';

export function createRpcRouter(db, ledger) {
    const router = express.Router();

    const opsEngine = new OperationsEngine(db, ledger, null);
    // We don't await here because it's in a factory, but finalize the init state
    const initPromise = opsEngine.init();

    const capacityRegistry = new NodeCapacityRegistry(db);
    const fallbackAdapter = new ProviderFallbackAdapter();
    const assuranceRouter = new ExecutionAssuranceRouter(capacityRegistry, fallbackAdapter, db);

    const adapters = {
        ethereum: new EthereumAdapter(),
        polygon: new PolygonAdapter(),
        solana: new SolanaAdapter(),
        fuse: new FuseAdapter(),
        arbitrum: new ArbitrumAdapter()
    };

    router.post('/:chain', validateApiKey(db), async (req, res) => {
        await initPromise; // Ensure pricing and system config are loaded
        console.log('[REAL_DEMAND] request_received');
        console.log('[REAL_DEMAND] api_key_valid');
        
        const { chain } = req.params;
        const adapter = adapters[chain];

        if (!adapter) {
            return res.status(400).json({ ok: false, error: 'Unsupported chain' });
        }

        const payload = req.body;
        const validation = adapter.validateRequest(payload);

        if (!validation.valid) {
            return res.status(400).json({ ok: false, error: validation.error });
        }

        try {
            const routeResult = await assuranceRouter.routeWorkload(chain, payload);

            let finalResultData;
            let targetNodeId = "external_provider";
            let latencyMs = 0;

            if (routeResult.status === 'executed') {
                const start = Date.now();
                finalResultData = Object.assign(validation.method ? { id: payload.id, jsonrpc: '2.0', result: routeResult.payloadResult } : {}, { success: true });
                latencyMs = Date.now() - start;
                targetNodeId = routeResult.nodeId;
            } else if (routeResult.status === 'fallback_executed') {
                finalResultData = Object.assign({ success: true, ...routeResult.payloadResult }, { success: true });
                latencyMs = 150; 
            }

            adapter.emitMetrics(latencyMs, finalResultData.success, validation.method || 'batch');
            console.log('[REAL_DEMAND] execution_completed');

            if (!finalResultData.success) {
                return res.status(502).json({ ok: false, error: 'Bad Gateway' });
            }

            // Phase 9: Pricing Logic
            let pricingAmount = 0.001; // Default
            if (payload.method === 'eth_blockNumber') {
                pricingAmount = 0.0001;
            } else if (payload.method === 'eth_getBalance') {
                pricingAmount = 0.0005;
            }

            // Record Revenue Event via Operations Engine
            const payloadString = JSON.stringify(payload);
            const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');
            const reqId = `rpc_${crypto.randomUUID()}`;

            await opsEngine.executeOp({
                op_type: 'api_relay_execution',
                node_id: targetNodeId,
                client_id: req.clientId || 'anonymous_client',
                request_id: reqId,
                timestamp: Date.now(),
                payload_hash: payloadHash,
                amount_usdt: pricingAmount
            }).then(() => {
                console.log('[REAL_DEMAND] revenue_recorded');
            }).catch(e => {
                console.error('[RPC] Failed to record op revenue:', e.message);
            });

            res.status(200).json(finalResultData.result || finalResultData);
        } catch (error) {
            console.error('[RPC Route Error]', error);
            res.status(500).json({ ok: false, error: 'Execution Assurance Failure', message: error.message });
        }
    });

    return router;
}
