export class AuthenticityService {
    constructor(db) {
        this.db = db;
    }

    async runDailyJob() {
        console.log('[Authenticity] Starting analysis...');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yyyymmdd = parseInt(yesterday.toISOString().slice(0, 10).replace(/-/g, ''));

        await this.computeDailyAuthenticity(yyyymmdd);
    }

    async computeDailyAuthenticity(yyyymmdd) {
        // Time window (UTC midnight to midnight)
        const dateStr = `${Math.floor(yyyymmdd / 10000)}-${Math.floor((yyyymmdd % 10000) / 100)}-${yyyymmdd % 100}`;
        const start = new Date(dateStr).setUTCHours(0, 0, 0, 0);
        const end = start + 86400000;

        // 1. Base Metrics from Request Traces (Most granular source)
        // If request_traces is pruned (7 days), we can only run this for recent days.
        // Assuming job runs daily for "yesterday", data should exist.

        const stats = await this.db.get(`
            SELECT 
                COUNT(*) as total_ops,
                COUNT(DISTINCT client_id) as unique_wallets,
                COUNT(DISTINCT ip_hash) as unique_clients
            FROM request_traces
            WHERE created_at >= ? AND created_at < ?
        `, [start, end]);

        const totalOps = stats?.total_ops || 0;
        const uniqueWallets = stats?.unique_wallets || 0;
        const uniqueClients = stats?.unique_clients || 0;

        // 2. Test Keys (Definition: marked is_test OR identifiable pattern)
        // For MVP, checking against known test wallets or specific user agents if available.
        // Let's assume a "test_keys" config or simply checking if wallet starts with '0x000' or similar pattern if used.
        // Or check `users` table for `is_test` flag? (Layer 37 schema might have it?)
        // Let's assume we check `users` table join.
        // Since sqlite join on log might be slow, let's do a sample check or specific query.
        // "ops_from_test_keys"

        // Let's check distinctive test traffic pattern: Wallet '0x000...' or '0xtest...'
        // Or specific route '/__test' (excluded from real ops usually, but maybe included in traces)
        // Traces include everything.
        const testOps = await this.db.get(`
            SELECT COUNT(*) as c FROM request_traces 
            WHERE (client_id LIKE '0xtest%' OR route LIKE '/__test%')
            AND created_at >= ? AND created_at < ?
        `, [start, end]);
        const opsFromTest = testOps?.c || 0;

        // 3. Replay Suspected (Duplicate Request IDs)
        // Only if request_id is logged.
        let dupRate = 0;
        let replays = 0;
        if (totalOps > 0) {
            // Check for duplicates
            const dupes = await this.db.get(`
                SELECT COUNT(*) as c FROM (
                    SELECT request_id FROM request_traces 
                    WHERE created_at >= ? AND created_at < ? AND request_id IS NOT NULL 
                    GROUP BY request_id HAVING COUNT(*) > 1
                )
            `, [start, end]);
            replays = dupes?.c || 0;
            dupRate = replays / totalOps;
        }

        // 4. Entropy (Distribution of usage)
        // Simplified: 1.0 if perfectly distributed? 
        // Let's use a simple heuristic: Do top 3 IPs account for > 90% traffic?
        // High entropy = Good (distributed). Low entropy = Bad (bot farm).
        let entropyScore = 1.0;
        if (totalOps > 100) {
            const topIp = await this.db.get(`
               SELECT COUNT(*) as c FROM request_traces 
               WHERE created_at >= ? AND created_at < ? 
               GROUP BY ip_hash ORDER BY c DESC LIMIT 1
           `, [start, end]);
            const concentration = (topIp?.c || 0) / totalOps;
            if (concentration > 0.9) entropyScore = 0.1;
            else if (concentration > 0.5) entropyScore = 0.5;
        }

        // 5. Authenticity Score (0-100)
        let score = 100;

        // Penalties
        score -= (dupRate * 300); // 10% dupes -> -30 points
        if (opsFromTest / (totalOps || 1) > 0.5) score -= 20; // Tests dominate
        if (uniqueClients < 3 && totalOps > 50) score -= 20; // Tiny userbase doing heavy volume
        if (entropyScore < 0.5) score -= 15; // Centralized source

        score = Math.max(0, Math.min(100, score));

        // 6. Store
        await this.db.query(`
            INSERT INTO usage_authenticity_daily (
                day_yyyymmdd, total_ops, ops_unique_clients, ops_unique_wallets,
                ops_from_test_keys, ops_replay_suspected, duplicate_request_id_rate,
                op_entropy_score, authenticity_score, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(day_yyyymmdd) DO UPDATE SET
                total_ops=excluded.total_ops,
                authenticity_score=excluded.authenticity_score
        `, [
            yyyymmdd, totalOps, uniqueClients, uniqueWallets,
            opsFromTest, replays, dupRate, entropyScore, score, Date.now()
        ]);

        if (score < 60) {
            console.warn(`[Authenticity] Low score for ${yyyymmdd}: ${score}`);
            // Trigger Incident?
        }
    }

    async getHistory(limit = 30) {
        return await this.db.query("SELECT * FROM usage_authenticity_daily ORDER BY day_yyyymmdd DESC LIMIT ?", [limit]);
    }
}
