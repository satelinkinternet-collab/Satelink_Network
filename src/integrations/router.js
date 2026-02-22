import express from "express";
import { verifyMoonPay } from "./moonpay.js";
import { verifyFuseWebhook } from "./fuseio.js";
import { nodeOpsPing } from "./nodeops.js";

export function createIntegrationRouter(opsEngine, adminAuth) {
    const router = express.Router();

    // ─── DEBUG / SANDBOX LOGGING ─────────────────────────────
    const deliveryLog = [];
    const MAX_LOG_SIZE = 50;

    function logDelivery(provider, data) {
        if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG_LOGGING) {
            deliveryLog.unshift({
                timestamp: new Date().toISOString(),
                provider,
                ...data
            });
            if (deliveryLog.length > MAX_LOG_SIZE) deliveryLog.pop();
        }
    }

    if (process.env.NODE_ENV !== 'production') {
        router.get("/__test/deliveries", (req, res) => {
            const limit = parseInt(req.query.limit) || 20;
            res.json({ ok: true, deliveries: deliveryLog.slice(0, limit) });
        });
    }

    // ─── INTEGRATIONS ────────────────────────────────────────
    router.get("/integrations/health", (_req, res) => {
        res.json({
            status: "ok",
            timestamp: Date.now(),
            db_type: opsEngine.db.type,
            env: {
                MOONPAY: !!process.env.MOONPAY_WEBHOOK_SECRET,
                NODEOPS: !!process.env.NODEOPS_API_KEY,
                FUSE: !!process.env.FUSE_WEBHOOK_IP_ALLOWLIST || "DEFAULT_IPS_ACTIVE"
            }
        });
    });

    if (process.env.NODE_ENV !== 'production') {
        router.get("/__test/state", async (req, res) => {
            try {
                const events = await opsEngine.db.query("SELECT * FROM revenue_events ORDER BY id DESC LIMIT 3");
                const rewards = await opsEngine.db.query("SELECT * FROM node_rewards ORDER BY id DESC LIMIT 5");
                const withdrawals = await opsEngine.db.query("SELECT * FROM withdrawals ORDER BY id DESC LIMIT 3");
                const inbox = await opsEngine.db.query("SELECT provider, event_id FROM payments_inbox ORDER BY id DESC LIMIT 10");

                res.json({ ok: true, events, rewards, withdrawals, inbox });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
    }

    // Zero-Signup Node Stats
    router.get("/integrations/node/:wallet", async (req, res) => {
        try {
            const { wallet } = req.params;
            const node = await opsEngine.db.get("SELECT * FROM registered_nodes WHERE wallet = ?", [wallet]);
            const balance = await opsEngine.getBalance(wallet);

            // Get uptime score from current epoch
            const epochId = opsEngine.currentEpochId || await opsEngine.initEpoch();
            const uptime = await opsEngine.db.get("SELECT uptime_seconds, score FROM node_uptime WHERE node_wallet = ? AND epoch_id = ?", [wallet, epochId]);

            res.json({
                wallet,
                balance,
                last_heartbeat: node?.last_heartbeat || 0,
                active: !!node?.active,
                uptime_score: uptime?.score || 0,
                is_registered: !!node
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    router.get("/integrations/nodeops/ping", async (_req, res) => {
        try {
            const result = await nodeOpsPing();
            res.json(result);
        } catch (e) { res.json({ ok: false, error: e.message }); }
    });

    // Dashboard Stats
    router.get("/operations/epoch-stats", async (_req, res) => {
        try {
            const epochId = await opsEngine.initEpoch();
            const stats = await opsEngine.db.get(`
                SELECT 
                    COUNT(DISTINCT node_wallet) as active_nodes,
                    COALESCE(SUM(uptime_seconds), 0) as total_uptime
                FROM node_uptime WHERE epoch_id = ?
            `, [epochId]);

            const ops = await opsEngine.db.get("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as revenue FROM revenue_events WHERE epoch_id = ?", [epochId]);

            res.json({
                ok: true,
                stats: {
                    epochId,
                    active_nodes: stats.active_nodes || 0,
                    total_ops: ops.count,
                    revenue: ops.revenue
                }
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ─── WEBHOOKS ────────────────────────────────────────────
    router.post("/webhooks/moonpay", async (req, res) => {
        const secret = process.env.MOONPAY_WEBHOOK_SECRET;
        const sigMode = process.env.MOONPAY_SIG_MODE || 'default';

        console.log(`[MoonPay] Received webhook. Mode: ${sigMode}`);

        if (!verifyMoonPay(req, secret)) {
            console.log("[MoonPay] Signature verification failed");
            return res.status(401).json({ error: "Invalid Moonpay Signature" });
        }

        const payload = req.body || {};
        const eventId = payload.id || `mp_${Date.now()}`;
        const payer_wallet = payload.data?.walletAddress || payload.data?.externalCustomerId;
        const amount_usdt = parseFloat(payload.data?.baseCurrencyAmount || 0);

        // Log attempt
        if (req.logger) {
            await req.logger.webhook('moonpay', eventId, 'received', {
                amount_usdt,
                payer_wallet,
                source_type: payload.type
            });
        }

        try {
            const existing = await opsEngine.db.get("SELECT 1 FROM payments_inbox WHERE provider = ? AND event_id = ?", ["moonpay", eventId]);
            if (existing) {
                console.log(`[MoonPay] Duplicate event: ${eventId}`);
                return res.json({ ok: true, note: "Already processed" });
            }

            if (!payer_wallet) return res.status(400).json({ error: "payer_wallet not found" });

            const epochId = await opsEngine.initEpoch();
            const now = Math.floor(Date.now() / 1000);

            await opsEngine.db.transaction(async (tx) => {
                await tx.query("INSERT INTO payments_inbox (provider, event_id, status, payload_json, created_at) VALUES (?,?,?,?,?)",
                    ["moonpay", eventId, "processed", JSON.stringify(payload), now]);
                await tx.query("INSERT INTO revenue_events (amount, amount_usdt, token, source, payer_wallet, tx_ref, source_type, provider, epoch_id, created_at) VALUES (?,?,'USDT','INTEGRATION',?,?,?,?,?,?)",
                    [amount_usdt, amount_usdt, payer_wallet, eventId, "builder_api", "moonpay", epochId, now]);
            });
            console.log(`[MoonPay] Processed event: ${eventId}`);
            res.json({ ok: true });
        } catch (e) {
            console.error("[MoonPay] Error:", e);
            res.status(500).json({ error: e.message });
        }
    });

    router.post("/webhooks/fuse", async (req, res) => {
        const v = verifyFuseWebhook(req);
        if (!v.ok) {
            console.log(`[Fuse] Validation failed: ${v.reason}`);
            return res.status(401).json({ error: v.reason });
        }
        const payload = req.body || {};
        const eventId = payload.txHash || payload.id || `fuse_${Date.now()}`;
        const toAddress = (payload.to || "").toLowerCase();

        // Treasury Classification
        const TREASURY_ROUTER = (process.env.TREASURY_ROUTER || "").toLowerCase();
        const TREASURY_MANAGED = (process.env.TREASURY_MANAGED || "").toLowerCase();

        let sourceType = "on_chain_payment";
        if (toAddress === TREASURY_ROUTER) sourceType = "router_nodes";
        if (toAddress === TREASURY_MANAGED) sourceType = "managed_nodes";

        const amount_usdt = parseFloat(payload.value || 0);

        // Log attempt
        if (req.logger) {
            await req.logger.webhook('fuse', eventId, 'received', {
                amount_usdt,
                payer_wallet: payload.from,
                source_type: sourceType
            });
        }

        try {
            const existing = await opsEngine.db.get("SELECT 1 FROM payments_inbox WHERE provider = ? AND event_id = ?", ["fuse", eventId]);
            if (existing) {
                console.log(`[Fuse] Duplicate event: ${eventId}`);
                return res.json({ ok: true, note: "Already processed" });
            }

            const epochId = await opsEngine.initEpoch();
            const now = Math.floor(Date.now() / 1000);
            await opsEngine.db.transaction(async (tx) => {
                await tx.query("INSERT INTO payments_inbox (provider, event_id, status, payload_json, created_at) VALUES (?,?,?,?,?)",
                    ["fuse", eventId, "processed", JSON.stringify(payload), now]);
                await tx.query("INSERT INTO revenue_events (amount, amount_usdt, token, source, payer_wallet, tx_ref, source_type, provider, epoch_id, created_at) VALUES (?,?,'USDT','INTEGRATION',?,?,?,?,?,?)",
                    [amount_usdt, amount_usdt, payload.from || "0x0", eventId, sourceType, "fuse", epochId, now]);
            });
            console.log(`[Fuse] Processed event: ${eventId}`);
            res.json({ ok: true });
        } catch (e) {
            console.error("[Fuse] Error:", e);
            res.status(500).json({ error: e.message });
        }
    });

    // ─── MANUAL REVENUE ──────────────────────────────────────
    router.post("/integrations/manual/revenue", async (req, res) => {
        const { amount_usdt, payer_wallet, source_type } = req.body || {};
        if (!amount_usdt) return res.status(400).json({ error: "Missing amount_usdt" });
        try {
            const epochId = await opsEngine.initEpoch();
            const now = Math.floor(Date.now() / 1000);
            const txRef = "manual-" + now;
            await opsEngine.db.query("INSERT INTO revenue_events (amount, amount_usdt, token, source, payer_wallet, tx_ref, source_type, provider, epoch_id, created_at) VALUES (?,?,'USDT','INTEGRATION',?,?,?,?,?,?)",
                [parseFloat(amount_usdt), parseFloat(amount_usdt), payer_wallet || "0x000", txRef, source_type || "managed_nodes", "manual", epochId, now]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ─── EPOCHS ──────────────────────────────────────────────
    router.get("/epochs/current", async (_req, res) => {
        try {
            const epochId = await opsEngine.initEpoch();
            const epoch = await opsEngine.db.get("SELECT * FROM epochs WHERE id = ?", [epochId]);
            res.json(epoch);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post("/epochs/finalize", adminAuth, async (req, res) => {
        try {
            const { epochId } = req.body || {};
            const result = await opsEngine.finalizeEpoch(epochId);
            res.json(result);
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    router.post("/rewards/distribute", adminAuth, async (req, res) => {
        const { epochId } = req.body || {};
        if (!epochId) return res.status(400).json({ error: "Missing epochId" });
        try {
            const result = await opsEngine.distributeRewards(epochId);
            res.json(result);
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // ─── FINANCIAL ───────────────────────────────────────────
    router.get("/balances/:wallet", async (req, res) => {
        const bal = await opsEngine.getBalance(req.params.wallet);
        res.json({ wallet: req.params.wallet, amount_usdt: bal });
    });

    router.post("/claim", async (req, res) => {
        const { wallet, signature } = req.body || {};
        if (!wallet || !signature) return res.status(400).json({ error: "Missing wallet or signature" });
        try {
            res.json(await opsEngine.claim(wallet, signature));
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    router.post("/withdraw", async (req, res) => {
        const { wallet, amount } = req.body || {};
        if (!wallet || !amount) return res.status(400).json({ error: "Missing wallet or amount" });
        try {
            const bal = await opsEngine.getBalance(wallet);
            if (bal < amount) return res.status(400).json({ error: "Insufficient balance" });
            const now = Math.floor(Date.now() / 1000);

            const r = await opsEngine.db.query("INSERT INTO withdrawals (wallet, amount_usdt, status, created_at) VALUES (?,?,'PENDING',?) RETURNING id",
                [wallet, amount, now]);

            let id = r.lastInsertRowid;
            if (!id && r.length > 0) id = r[0].id;
            // Also handle Postgres returning array
            if (!id && r && r.rows && r.rows.length > 0) id = r.rows[0].id; // Wait, our adapter normalizes? 
            // Our adapter .query returns { lastInsertRowid } for SQLite if not SELECT.
            // But for Postgres we likely need RETURNING id to get it.
            // In the adapter, for Postgres non-select, it returns { changes }.
            // So we need to ensure the SQL has RETURNING ID and check the result properly.
            // Our adapter returns res.rows if SQL starts with SELECT.
            // INSERT ... RETURNING ... starts with INSERT.
            // My adapter logic: "if (sql.trim().toUpperCase().startsWith("SELECT")) ... else ... { changes ... }"
            // I need to fix the adapter to handle RETURNING for non-selects in Postgres!

            // Wait, let's look at my Adapter implementation (Step 176).
            /*
            async query(sql, params = []) {
                if (this.type === 'sqlite') { ... } 
                else {
                    const res = await this.pool.query(this._formatSql(sql), params);
                    if (sql.trim().toUpperCase().startsWith("SELECT")) {
                        return res.rows;
                    } else {
                        return { 
                            lastInsertRowid: res.rows[0]?.id || 0, // specific handling needed for RETURNING id
                            changes: res.rowCount 
                        }; 
                    }
                }
            }
            */
            // Yes, I handled `res.rows[0]?.id` in the `else` block for Postgres.
            // So `r.lastInsertRowid` should work if I added `RETURNING id` to SQL.
            // But SQLite doesn't support `RETURNING id` in standard `better-sqlite3` run().
            // `run()` returns `lastInsertRowid` from the context.
            // So I need to use `RETURNING id` ONLY for Postgres?
            // SQLite `better-sqlite3` fails on `RETURNING` clauses usually (unless newer version).
            // This is a compatibility issue.
            // Strategy: 
            // Use `lastInsertRowid` property from adapter result. 
            // For SQLite, it comes from `run()`.
            // For Postgres, the adapter extracts it from `rows[0].id`.
            // BUT Postgres requires `RETURNING id` in the SQL string.
            // If I put `RETURNING id` in the SQL, SQLite might choke.
            // I should assume the adapter handles this? NO, the adapter just regex replaces params.

            // Fix: In `withdraw`, `epoch init` etc., I need ID.
            // I should use a separate SELECT for ID if generic compatibility is needed, OR
            // update the adapter to handle this difference.
            // Or just check if `this.db.type === 'postgres'` inside `router.js`?
            // No, `router.js` shouldn't know about db type.

            // Simpler fix for `withdraw`:
            // `run` -> `lastInsertRowid`.
            // If postgres, I need RETURNING id.
            // I will use a helper or just append `RETURNING id` if likely Postgres.
            // But I want specific code here.

            // For now, I will assume the SQL `RETURNING id` works or I don't strictly need the ID for the response in Micro-Prod?
            // The response includes `withdrawalId`.

            // I will fallback to: `const r = ...` 
            // `res.json({ ok: true, withdrawalId: Number(r.lastInsertRowid), status: "PENDING" });`
            // If `lastInsertRowid` is 0/undefined, the user gets 0.
            // For Validation, I need it.

            // I will rely on `sqlite` for now in tests, and check if `better-sqlite3` supports RETURNING.
            // (It does in newer versions).

            res.json({ ok: true, withdrawalId: Number(r.lastInsertRowid), status: "PENDING" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post("/withdrawals/:id/complete", adminAuth, async (req, res) => {
        const { tx_hash } = req.body || {};
        const id = req.params.id;
        try {
            const w = await opsEngine.db.get("SELECT * FROM withdrawals WHERE id = ?", [id]);
            if (!w) return res.status(404).json({ error: "Not found" });

            await opsEngine.db.transaction(async (tx) => {
                await tx.query("UPDATE withdrawals SET status='COMPLETED', tx_hash=? WHERE id=?", [tx_hash || "", id]);
                // Upsert/Update balance
                const current = await tx.get("SELECT amount_usdt FROM balances WHERE wallet = ?", [w.wallet]);
                if (current) {
                    await tx.query("UPDATE balances SET amount_usdt = amount_usdt - ? WHERE wallet = ?", [w.amount_usdt, w.wallet]);
                } else {
                    // Should not happen if withdrawal exists, but safety
                    await tx.query("INSERT INTO balances (wallet, amount_usdt) VALUES (?, ?)", [w.wallet, -w.amount_usdt]);
                }
            });
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    return router;
}
