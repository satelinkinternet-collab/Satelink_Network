-- sql/layer_network_expansion.sql

-- Part 4: Genesis / Founder Node Infrastructure
CREATE TABLE IF NOT EXISTS genesis_nodes (
    node_id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    region TEXT,
    capabilities TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at INTEGER
);

-- Part 5: External Infrastructure Providers
CREATE TABLE IF NOT EXISTS external_providers (
    provider_name TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    supported_chains TEXT,
    latency_score REAL DEFAULT 0,
    cost_per_request REAL DEFAULT 0,
    created_at INTEGER
);

-- Part 7: Autonomous Node Onboarding (Metrics & Capabilities)
CREATE TABLE IF NOT EXISTS node_capabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT,
    capability TEXT,
    chain TEXT,
    endpoint TEXT,
    created_at INTEGER,
    FOREIGN KEY(node_id) REFERENCES registered_nodes(wallet)
);

CREATE TABLE IF NOT EXISTS execution_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT,     -- wallet or genesis_id or provider_name
    source_type TEXT,   -- community_node | genesis_node | external_provider
    chain TEXT,
    requests_handled INTEGER DEFAULT 0,
    latency_avg REAL DEFAULT 0,
    updated_at INTEGER
);
