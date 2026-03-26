import express from 'express';
import crypto from 'crypto';

export function createFuturesRouter(db, futuresEscrow) {
    const router = express.Router();

    // Mock auth middleware determining if caller is a node or investor
    const authenticate = (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) return res.status(401).json({ error: 'Unauthorized: missing X-API-Key' });

        req.userWallet = `wallet_${crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 8)}`;
        next();
    };

    /**
     * PART 3: POST /v1/futures
     * Node operators list a forward contract
     */
    router.post('/', authenticate, async (req, res) => {
        try {
            const { node_id, revenue_share, epoch_range, price } = req.body;

            // PART 7: RISK CONTROLS Validate the inputs strongly
            if (!node_id || !revenue_share || !epoch_range || epoch_range.length !== 2 || !price) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            if (revenue_share > 0.40) {
                return res.status(400).json({ error: 'Risk Control: Cannot sell more than 40% of future revenue.' });
            }

            // Check active status and current obligations
            const nodeCheck = await db.prepare(`SELECT active FROM registered_nodes WHERE wallet = ?`).get(node_id);
            if (!nodeCheck || nodeCheck.active === 0) {
                return res.status(403).json({ error: 'Node must be active and registered' });
            }

            // Verify they aren't already over the 40% threshold across multiple overlapping contracts
            const overlapping = await db.prepare(`
                SELECT SUM(revenue_share) as total_share
                FROM node_futures_contracts
                WHERE node_id = ? AND status IN ('listed', 'sold') AND
                (epoch_start <= ? AND epoch_end >= ?)
            `).get(node_id, epoch_range[1], epoch_range[0]);

            const newTotal = (overlapping.total_share || 0) + revenue_share;
            if (newTotal > 0.40) {
                return res.status(400).json({ error: `Risk Control: Total overlapping revenue share across contracts exceeds 40%. Current bound: ${overlapping.total_share}` });
            }

            const contractId = `fut_${crypto.randomBytes(4).toString('hex')}`;

            await db.prepare(`
                INSERT INTO node_futures_contracts (contract_id, node_id, epoch_start, epoch_end, revenue_share, price, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'listed', ?)
            `).run(contractId, node_id, epoch_range[0], epoch_range[1], revenue_share, price, Date.now());

            await db.prepare(`UPDATE futures_metrics SET contracts_listed = contracts_listed + 1 WHERE id = 1`).run();

            res.status(201).json({
                message: 'Futures contract listed successfully',
                contract_id: contractId,
                status: 'listed'
            });

        } catch (error) {
            console.error("[FuturesAPI] Listing failed:", error);
            res.status(500).json({ error: 'Internal server error while listing futures contract' });
        }
    });

    /**
     * PART 4: POST /v1/futures/buy
     * Investors purchase a listed contract
     */
    router.post('/buy', authenticate, async (req, res) => {
        try {
            const { contract_id, price } = req.body;
            if (!contract_id || price === undefined) {
                return res.status(400).json({ error: 'Missing contract_id or price' });
            }

            // Pass execution to the Escrow system to manage atomicity
            await futuresEscrow.purchaseContract(req.userWallet, contract_id, price);

            res.status(200).json({
                message: 'Contract purchased successfully and funds escrowed',
                contract_id,
                buyer: req.userWallet
            });

        } catch (error) {
            console.error("[FuturesAPI] Buy failed:", error.message);
            res.status(400).json({ error: error.message });
        }
    });

    /**
     * PART 8: GET /v1/futures
     * List open market orders
     */
    router.get('/', async (req, res) => {
        try {
            const contracts = await db.prepare(`SELECT * FROM node_futures_contracts WHERE status = 'listed' ORDER BY created_at DESC`).all();

            const metrics = await db.prepare(`SELECT * FROM futures_metrics WHERE id = 1`).get();

            res.status(200).json({ contracts, metrics });
        } catch (error) {
            res.status(500).json({ error: 'Error fetching futures market data' });
        }
    });

    return router;
}
