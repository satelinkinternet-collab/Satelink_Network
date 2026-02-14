
import express from 'express';
import crypto from 'crypto';
import base32 from 'base32.js';
import { verifyJWT } from './auth_v2.js';

export function createUserSettingsRouter(db) {
    const router = express.Router();

    // Helper: Generate Public ID (Deterministic)
    // base32(sha256(wallet)[0..10]) -> SLK-XXXX-XXXX
    function generatePublicId(wallet) {
        const hash = crypto.createHash('sha256').update(wallet.toLowerCase()).digest();
        const encoder = new base32.Encoder({ type: "crockford" });
        const b32 = encoder.write(hash.subarray(0, 5)).finalize();
        // Format: SLK-XXXX-XXXX
        return `SLK-${b32.substring(0, 4)}-${b32.substring(4, 8)}`;
    }

    // GET /me/settings
    router.get('/settings', verifyJWT, async (req, res) => {
        try {
            const wallet = req.user.wallet;

            // 1. Get/Create Settings
            let settings = await db.get('SELECT * FROM user_settings WHERE wallet = ?', [wallet]);
            if (!settings) {
                const now = Date.now();
                await db.query(`
                    INSERT INTO user_settings (wallet, ui_mode, created_at, updated_at)
                    VALUES (?, 'SIMPLE', ?, ?)
                `, [wallet, now, now]);
                settings = { ui_mode: 'SIMPLE' };
            }

            // 2. Get/Create Public Identity
            let identity = await db.get('SELECT public_id FROM public_identity WHERE wallet = ?', [wallet]);
            if (!identity) {
                const pid = generatePublicId(wallet);
                const now = Date.now();
                await db.query(`
                    INSERT INTO public_identity (wallet, public_id, created_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(wallet) DO UPDATE SET public_id=excluded.public_id
                `, [wallet, pid, now]);
                identity = { public_id: pid };
            }

            // 3. Get Onboarding State
            const onboarding = await db.get('SELECT step_completed_json, completed_at FROM onboarding_state WHERE wallet = ?', [wallet]);

            res.json({
                ok: true,
                settings: {
                    ui_mode: settings.ui_mode,
                    public_id: identity.public_id,
                    onboarding: onboarding ? {
                        steps: JSON.parse(onboarding.step_completed_json || '{}'),
                        completed_at: onboarding.completed_at
                    } : null
                }
            });
        } catch (e) {
            console.error('[SETTINGS] Get failed:', e);
            res.status(500).json({ ok: false, error: 'Internal server error' });
        }
    });

    // POST /me/settings
    router.post('/settings', verifyJWT, async (req, res) => {
        try {
            const { ui_mode } = req.body;
            if (!['SIMPLE', 'ADVANCED'].includes(ui_mode)) {
                return res.status(400).json({ ok: false, error: 'Invalid ui_mode' });
            }

            await db.query(`
                UPDATE user_settings 
                SET ui_mode = ?, updated_at = ? 
                WHERE wallet = ?
            `, [ui_mode, Date.now(), req.user.wallet]);

            res.json({ ok: true });
        } catch (e) {
            console.error('[SETTINGS] Update failed:', e);
            res.status(500).json({ ok: false, error: 'Internal server error' });
        }
    });

    // POST /me/onboarding/step
    router.post('/onboarding/step', verifyJWT, async (req, res) => {
        try {
            const { step_id } = req.body;
            if (!step_id) return res.status(400).json({ ok: false, error: 'Missing step_id' });

            const wallet = req.user.wallet;
            let current = await db.get('SELECT step_completed_json FROM onboarding_state WHERE wallet = ?', [wallet]);

            let steps = current ? JSON.parse(current.step_completed_json || '{}') : {};
            steps[step_id] = true;

            const now = Date.now();
            // Check if all steps done (assuming 3 steps: welcome, demo, backup)
            const isComplete = steps['welcome'] && steps['demo'] && steps['backup'];

            await db.query(`
                INSERT INTO onboarding_state (wallet, step_completed_json, completed_at)
                VALUES (?, ?, ?)
                ON CONFLICT(wallet) DO UPDATE SET 
                    step_completed_json = excluded.step_completed_json,
                    completed_at = CASE WHEN ? THEN ? ELSE completed_at END
            `, [wallet, JSON.stringify(steps), isComplete ? now : null, isComplete, now]);

            res.json({ ok: true, steps });
        } catch (e) {
            console.error('[ONBOARDING] Update failed:', e);
            res.status(500).json({ ok: false, error: 'Internal server error' });
        }
    });

    // GET /me/balance/summary (Dual Currency)
    router.get('/balance/summary', verifyJWT, async (req, res) => {
        try {
            const wallet = req.user.wallet;
            const balanceRow = await db.get('SELECT amount_usdt FROM balances WHERE wallet = ?', [wallet]);
            const usdt = balanceRow ? balanceRow.amount_usdt : 0;

            // Hardcoded FX for MVP (as per spec)
            const FX_USDT_INR = 90;

            res.json({
                ok: true,
                balance: {
                    usdt: usdt,
                    inr: usdt * FX_USDT_INR,
                    currency_code: 'INR',
                    fx_rate: FX_USDT_INR
                }
            });
        } catch (e) {
            console.error('[BALANCE] Summary failed:', e);
            res.status(500).json({ ok: false, error: 'Internal server error' });
        }
    });

    return router;
}
