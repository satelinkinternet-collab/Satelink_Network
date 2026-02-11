
import { Router } from 'express';
import crypto from 'crypto';

export function createUsageIngestRouter(opsEngine) {
    const router = Router();

    // In-memory cache for key hashes to avoid DB hit every request (Simple LRU would be better but Map ok for MVP)
    // Map<KeyHash, ProjectID>
    const keyCache = new Map();

    router.post('/usage', async (req, res) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) return res.status(401).json({ error: 'Missing API Key' });

        const { endpoint, qty, unit_price_usdt, payer_wallet, meta } = req.body;

        // Validation
        if (!endpoint || !qty || unit_price_usdt === undefined || !payer_wallet) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Type coercion
        const qtyNum = parseInt(qty);
        const priceNum = parseFloat(unit_price_usdt);

        if (isNaN(qtyNum) || qtyNum < 1 || qtyNum > 1000000) return res.status(400).json({ error: 'Invalid qty (1..1e6)' });
        if (isNaN(priceNum) || priceNum <= 0 || priceNum > 1000) return res.status(400).json({ error: 'Invalid price (0..1000)' });
        if (qtyNum * priceNum > 10000000) return res.status(400).json({ error: 'Amount limit exceeded' });

        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        let projectId = keyCache.get(keyHash);

        if (!projectId) {
            const keyRecord = await opsEngine.db.get(
                "SELECT project_id, status FROM api_keys WHERE key_hash = ?",
                [keyHash]
            );
            if (!keyRecord || keyRecord.status !== 'active') {
                return res.status(401).json({ error: 'Invalid API Key' });
            }
            projectId = keyRecord.project_id;
            keyCache.set(keyHash, projectId);
            // Clear cache entry after 1 min to allow revocation
            setTimeout(() => keyCache.delete(keyHash), 60000);
        }

        const cost = qty * unit_price_usdt;
        const ts = Date.now();

        try {
            // 1. Log Usage
            await opsEngine.db.run(
                "INSERT INTO api_usage (project_id, ts, endpoint, ok, cost_usdt, meta_json) VALUES (?, ?, ?, ?, ?, ?)",
                [projectId, ts, endpoint, 1, cost, JSON.stringify(meta || {})]
            );

            // 2. Create Revenue Event
            // We use a dummy tx_hash derived from our own system since this is internal metering
            const txRef = `builder:${projectId}:${ts}:${Math.floor(Math.random() * 1000)}`;

            // Assume Provider="Builder", SourceType="API"
            await opsEngine.db.run(
                `INSERT INTO revenue_events (
                    provider, source_type, payer_wallet, amount_usdt, amount_sats, 
                    tx_hash, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['Builder', 'api_usage', payer_wallet, cost, cost * 100000000, txRef, ts] // Assuming 1 USDT = 100M Sats for simplicity or 0 if pure USDT
            );

            res.json({ success: true, ref: txRef });
        } catch (e) {
            console.error("Usage Ingest Error:", e);
            res.status(500).json({ error: 'Ingestion Failed' });
        }
    });

    return router;
}
