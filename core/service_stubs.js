/**
 * Minimal service stubs for route factories that need complex dependencies.
 * Routes render with empty data rather than crashing. Backfill with real
 * implementations later.
 */
export function createServiceStubs(rawDb, opsEngine) {
    const auditService = {
        logAction: async () => {},
        verifyChain: async () => ({ ok: true, verified: true, count: 0 })
    };

    const autoOpsEngine = {
        _getConfig: async (key) => {
            try {
                const row = await opsEngine.db.get(
                    "SELECT value FROM system_config WHERE key = ?", [key]);
                return row?.value || null;
            } catch { return null; }
        },
        executeAction: async () => ({ ok: true, stub: true }),
        runDailyJob: async () => ({ ok: true, stub: true })
    };

    const breakevenService = {
        getOverview: async () => ({ nodes: [], summary: {} }),
        getHistory: async () => [],
        setCostOverride: async () => ({ ok: true })
    };

    const authenticityService = { getHistory: async () => [] };
    const stabilityService = { getHistory: async () => [] };

    const forensicsServices = {
        snapshotService: {
            getSnapshots: async () => [],
            getSnapshot: async () => null,
            runDailySnapshot: async () => ({ ok: true })
        },
        replayEngine: {
            replayWindow: async () => ({ ok: true, events: [] })
        },
        auditService,
        integrityJob: {
            runDailyCheck: async () => ({ ok: true })
        }
    };

    const retentionService = {
        getRetentionMatrix: async () => ({ matrix: [] })
    };

    const densityService = {
        getLatest: async () => ({}),
        getHistory: async () => []
    };

    const slaEngine = {
        getPlans: async () => [],
        getLimits: async () => ({}),
        setLimits: async () => ({ ok: true }),
        getErrorBudget: async () => ({ budget: 0, used: 0 }),
        getOpSLO: async () => ({}),
        getReport: async () => ({ daily: [] }),
        getCredits: async () => [],
        issueCredit: async () => ({ ok: true })
    };

    return {
        auditService,
        autoOpsEngine,
        breakevenService,
        authenticityService,
        stabilityService,
        forensicsServices,
        retentionService,
        densityService,
        slaEngine
    };
}
