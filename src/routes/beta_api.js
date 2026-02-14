import { Router } from 'express';
// import { publicLimiter } from '../middleware/rate_limits.js'; // Will import if needed

export function createBetaRouter(opsEngine) {
    const router = Router();
    const db = opsEngine.db;

    // Apply rate limits if not already applied globally
    // router.use(publicLimiter);

    // POST /beta/join
    // Body: { wallet, invite_code }
    router.post('/join', async (req, res) => {
        try {
            const { wallet, invite_code } = req.body;
            if (!wallet || !invite_code) {
                return res.status(400).json({ ok: false, error: 'Missing wallet or invite code' });
            }

            // Check if beta gate is enabled
            const gateFlag = await db.get("SELECT value FROM system_flags WHERE key = 'beta_gate_enabled'");
            const isGateEnabled = gateFlag?.value === '1';

            if (!isGateEnabled) {
                // If gate is disabled, maybe we allow open entry? Or reject?
                // Spec says "if beta_gate_enabled, user routes require beta_user active"
                // But /join is the entry point. It should always work if invites are the mechanism.
                // We'll proceed.
            }

            // Check if user already exists
            const existing = await db.get("SELECT * FROM beta_users WHERE wallet = ?", [wallet]);
            if (existing) {
                if (existing.status === 'active') {
                    return res.json({ ok: true, status: 'active', message: 'Already joined' });
                } else {
                    return res.status(403).json({ ok: false, error: 'User is suspended' });
                }
            }

            // Validate invite
            const invite = await db.get("SELECT * FROM beta_invites WHERE invite_code = ?", [invite_code]);
            if (!invite) {
                return res.status(400).json({ ok: false, error: 'Invalid invite code' });
            }
            if (invite.status !== 'active') {
                return res.status(400).json({ ok: false, error: 'Invite code disabled' });
            }
            if (invite.expires_at && invite.expires_at < Date.now()) {
                return res.status(400).json({ ok: false, error: 'Invite code expired' });
            }
            if (invite.used_count >= invite.max_uses) {
                return res.status(400).json({ ok: false, error: 'Invite code usage limit reached' });
            }

            // Proceed to register
            await db.transaction(async (tx) => {
                // Insert user
                await tx.query(`
                    INSERT INTO beta_users (wallet, invite_code, status, first_seen_at, last_seen_at, created_at)
                    VALUES (?, ?, 'active', ?, ?, ?)
                `, [wallet, invite_code, Date.now(), Date.now(), Date.now()]);

                // Increment invite usage
                await tx.query(`
                    UPDATE beta_invites 
                    SET used_count = used_count + 1 
                    WHERE id = ?
                `, [invite.id]);
            });

            res.json({ ok: true, status: 'active' });
        } catch (e) {
            console.error('[Beta] Join error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /beta/check-access
    // Body: { wallet }
    // Used by frontend to check if they can access the app
    router.post('/check-access', async (req, res) => {
        try {
            const { wallet } = req.body;
            if (!wallet) return res.status(400).json({ ok: false });

            const gateFlag = await db.get("SELECT value FROM system_flags WHERE key = 'beta_gate_enabled'");
            const isGateEnabled = gateFlag?.value === '1';

            if (!isGateEnabled) {
                return res.json({ ok: true, access: true });
            }

            const user = await db.get("SELECT * FROM beta_users WHERE wallet = ?", [wallet]);
            if (user && user.status === 'active') {
                // Update last seen
                db.query("UPDATE beta_users SET last_seen_at = ? WHERE id = ?", [Date.now(), user.id]).catch(() => { });
                return res.json({ ok: true, access: true });
            }

            res.json({ ok: true, access: false });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /beta/feedback
    // Body: { wallet, category, severity, message, page_url, trace_id }
    router.post('/feedback', async (req, res) => {
        try {
            const { wallet, category, severity, message, page_url, trace_id } = req.body;

            // Insert feedback
            const { lastID } = await db.query(`
                INSERT INTO beta_feedback (wallet, category, severity, message, page_url, trace_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [wallet, category, severity, message, page_url, trace_id, Date.now()]);

            // Auto-incident for High Severity
            if (severity === 'high') {
                await db.query(`
                    INSERT INTO security_alerts (type, severity, title, created_at, source_ip)
                    VALUES ('beta_feedback', 'high', ?, ?, ?)
                `, [`High Severity Beta Feedback: ${message.substring(0, 50)}...`, Date.now(), req.ip]);
            }

            res.json({ ok: true, id: lastID });
        } catch (e) {
            console.error('[Beta] Feedback error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
