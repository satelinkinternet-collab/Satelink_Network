import { Router } from 'express';
import { verifyJWT } from './auth_v2.js';

/**
 * Phase H4 — Support & Diagnostics
 * Handles support ticket submissions and bundle storage.
 */
export function createSupportRouter(db) {
    const router = Router();

    // GET /support — render the Support Portal UI
    router.get('/', (req, res) => {
        res.render('support', { success: req.query.success, error: req.query.error });
    });

    // POST /support/ticket
    // Submit a support ticket with a diagnostic bundle
    router.post('/ticket', async (req, res) => {
        const { wallet, message, bundle_json, subject, category } = req.body;
        const isJson = req.headers['content-type']?.includes('application/json');

        if (!wallet || !message) {
            if (isJson) return res.status(400).json({ ok: false, error: 'Wallet and message are required' });
            return res.redirect('/support?error=Wallet+and+message+are+required');
        }

        try {
            await db.query(`
                INSERT INTO support_tickets (wallet, message, bundle_json, created_at)
                VALUES (?, ?, ?, ?)
            `, [wallet.toLowerCase(), message + (subject ? ` [${category || 'general'}] ${subject}` : ''), JSON.stringify(bundle_json || {}), Date.now()]);

            if (isJson) return res.json({ ok: true, message: 'Support ticket submitted successfully' });
            res.redirect('/support?success=1');
        } catch (e) {
            console.error('[SUPPORT] Failed to submit ticket:', e);
            if (isJson) return res.status(500).json({ ok: false, error: 'Internal server error' });
            res.redirect('/support?error=Internal+server+error');
        }
    });

    // GET /admin/support/tickets
    // List support tickets (Admin Only)
    router.get('/admin/tickets', verifyJWT, async (req, res) => {
        if (req.user.role !== 'admin_super' && req.user.role !== 'admin_ops') {
            return res.status(403).json({ ok: false, error: 'Forbidden' });
        }

        try {
            const tickets = await db.query('SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 100');
            res.json({ ok: true, tickets });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/support/tickets/:id/resolve
    router.post('/admin/tickets/:id/resolve', verifyJWT, async (req, res) => {
        if (req.user.role !== 'admin_super' && req.user.role !== 'admin_ops') {
            return res.status(403).json({ ok: false, error: 'Forbidden' });
        }

        try {
            await db.query('UPDATE support_tickets SET status = ? WHERE id = ?', [req.body.status || 'resolved', req.params.id]);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
