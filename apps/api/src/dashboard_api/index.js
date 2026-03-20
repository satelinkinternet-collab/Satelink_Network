import { Router } from 'express';
import { requireJWT, requireRole } from '../security/auth_middleware.js';
import { getNetworkOverview } from './network_overview.js';
import { getNodeSummary, getAdminNodesOverview } from './nodes_overview.js';
import { getEarningsOverview } from './earnings_overview.js';
import { getSystemHealth } from './admin_system.js';

/**
 * Dashboard Query Layer — Router
 *
 * All routes are READ-ONLY. No mutations, no writes, no executeOp() calls.
 * This layer separates dashboard UI traffic from operational APIs.
 *
 * Architecture:
 *   Next.js dashboard → /dashboard-api/* (this router) → SELECT queries → DB
 *
 * Auth: All routes require JWT. Admin routes require admin role.
 * Cache: Placeholder hooks for future Redis integration.
 *
 * @param {object} db - Database connection (UniversalDB)
 * @param {object} [options] - Optional configuration
 * @param {object} [options.cache] - Cache adapter (future Redis)
 * @returns {Router} Express router
 */
export function createDashboardApiRouter(db, options = {}) {
    const router = Router();
    const cache = options.cache || null;

    // ── All dashboard-api routes require authentication ──
    router.use(requireJWT);

    // ══════════════════════════════════════════
    // PUBLIC DASHBOARD ROUTES (any authenticated user)
    // ══════════════════════════════════════════

    /**
     * GET /dashboard-api/network/overview
     * Aggregated network health and stats.
     * Available to all authenticated users.
     */
    router.get('/network/overview', async (req, res) => {
        try {
            const data = await getNetworkOverview(db, cache);
            res.json({ ok: true, ...data });
        } catch (e) {
            res.status(500).json({ ok: false, error: 'Failed to fetch network overview' });
        }
    });

    /**
     * GET /dashboard-api/node/:wallet/summary
     * Node operator summary for a specific wallet.
     * Node operators can only view their own data.
     * Admins can view any node.
     */
    router.get('/node/:wallet/summary', async (req, res) => {
        try {
            const { wallet } = req.params;
            const isAdmin = ['admin_super', 'admin_ops', 'admin_readonly'].includes(req.user?.role);
            const isOwnNode = req.user?.wallet?.toLowerCase() === wallet.toLowerCase();

            if (!isAdmin && !isOwnNode) {
                return res.status(403).json({ ok: false, error: 'Access denied: can only view your own node' });
            }

            const data = await getNodeSummary(db, wallet, cache);
            res.json({ ok: true, ...data });
        } catch (e) {
            res.status(500).json({ ok: false, error: 'Failed to fetch node summary' });
        }
    });

    /**
     * GET /dashboard-api/earnings/overview
     * Aggregated earnings and revenue split overview.
     * Available to all authenticated users (shows network-level aggregates).
     */
    router.get('/earnings/overview', async (req, res) => {
        try {
            const data = await getEarningsOverview(db, cache);
            res.json({ ok: true, ...data });
        } catch (e) {
            res.status(500).json({ ok: false, error: 'Failed to fetch earnings overview' });
        }
    });

    // ══════════════════════════════════════════
    // ADMIN DASHBOARD ROUTES (admin roles only)
    // ══════════════════════════════════════════

    const requireAdminRole = requireRole(['admin_super', 'admin_ops', 'admin_readonly']);

    /**
     * GET /dashboard-api/admin/system-health
     * System health, KPIs, flags, and operational status.
     */
    router.get('/admin/system-health', requireAdminRole, async (req, res) => {
        try {
            const data = await getSystemHealth(db, cache);
            res.json({ ok: true, ...data });
        } catch (e) {
            res.status(500).json({ ok: false, error: 'Failed to fetch system health' });
        }
    });

    /**
     * GET /dashboard-api/admin/nodes
     * Admin-level aggregated nodes overview.
     */
    router.get('/admin/nodes', requireAdminRole, async (req, res) => {
        try {
            const data = await getAdminNodesOverview(db, cache);
            res.json({ ok: true, ...data });
        } catch (e) {
            res.status(500).json({ ok: false, error: 'Failed to fetch admin nodes overview' });
        }
    });

    return router;
}
