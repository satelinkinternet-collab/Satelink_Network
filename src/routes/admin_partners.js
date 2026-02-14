
import express from 'express';
import { PartnerEngine } from '../services/partner_engine.js';

/**
 * Admin Partners Routes — mounted at /admin/partners
 */
export function createAdminPartnersRouter(db) {
    const router = express.Router();
    const partnerEngine = new PartnerEngine(db);

    // GET /admin/partners
    router.get('/', async (req, res) => {
        try {
            const partners = await partnerEngine.getPartners();
            res.json({ ok: true, partners });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/partners/register
    router.post('/register', async (req, res) => {
        try {
            const result = await partnerEngine.registerPartner(req.body);
            res.json({ ok: true, ...result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/partners/approve
    router.post('/approve', async (req, res) => {
        try {
            const result = await partnerEngine.approvePartner(req.body.partner_id);
            res.json(result);
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/partners/suspend
    router.post('/suspend', async (req, res) => {
        try {
            const result = await partnerEngine.suspendPartner(req.body.partner_id);
            res.json(result);
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // PUT /admin/partners/:id/settings
    router.put('/:id/settings', async (req, res) => {
        try {
            const result = await partnerEngine.updatePartner(req.params.id, req.body);
            res.json(result);
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
