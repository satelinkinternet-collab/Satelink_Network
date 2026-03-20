export class NodeRegistrationService {
    constructor(db) { this.db = db; }

    async registerNode(wallet, ipAddress) {
        await this.db.prepare(`
            INSERT INTO registered_nodes (wallet, last_nonce, last_heartbeat, active, node_type)
            VALUES (?, 0, ?, 1, 'community_node')
            ON CONFLICT(wallet) DO UPDATE SET last_heartbeat = excluded.last_heartbeat, active = 1
        `).run(wallet, Date.now());
        return { success: true, wallet };
    }
}

export class NodeDiscoveryService {
    constructor(db) { this.db = db; }

    async detectCapabilities(wallet, payload) {
        // payload e.g. { rpcChains: ['ethereum', 'solana'] }
        if (payload && payload.rpcChains) {
            for (const chain of payload.rpcChains) {
                await this.db.prepare(`
                    INSERT INTO node_capabilities (node_id, capability, chain, created_at)
                    VALUES (?, 'rpc', ?, ?)
                `).run(wallet, chain, Date.now());
            }
        }
        return { success: true, wallet };
    }
}

export class NodeReputationBootstrap {
    constructor(db) { this.db = db; }

    async bootstrapScore(wallet) {
        // Initialize an optimal latency profile for a newly joined node
        // so it gets a fair trial in the execution router pool
        await this.db.prepare(`
            UPDATE registered_nodes SET latency = 20, bandwidth = 0, active = 1 WHERE wallet = ?
        `).run(wallet);
        return { success: true, wallet, initialScoreAssigned: true };
    }
}

export class NodeEarningsMetrics {
    constructor(db) { this.db = db; }

    async recordWorkload(wallet, chain, type) {
        await this.db.prepare(`
            INSERT INTO execution_metrics (source_id, source_type, chain, requests_handled, updated_at)
            VALUES (?, 'community_node', ?, 1, ?)
        `).run(wallet, chain, Date.now());
    }
}

export class NodeOnboardingEngine {
    constructor(db) {
        this.registration = new NodeRegistrationService(db);
        this.discovery = new NodeDiscoveryService(db);
        this.reputation = new NodeReputationBootstrap(db);
        this.metrics = new NodeEarningsMetrics(db);
    }

    /**
     * Complete simple onboarding flow
     * install node agent -> register wallet -> start heartbeat -> detect capabilities -> bootstrap rep -> receive workloads
     */
    async onboardNode(wallet, ipAddress, capabilitiesPayload) {
        await this.registration.registerNode(wallet, ipAddress);
        await this.discovery.detectCapabilities(wallet, capabilitiesPayload);
        await this.reputation.bootstrapScore(wallet);

        return {
            success: true,
            status: "ready_for_workloads",
            wallet
        };
    }
}
