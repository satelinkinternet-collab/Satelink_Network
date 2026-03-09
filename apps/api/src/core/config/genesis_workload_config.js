/**
 * Genesis Workload Engine Configuration
 *
 * Controls overall generation rate and per-source scheduling.
 */

export const genesisConfig = {
    // Target throughput
    target_workloads_per_day: 50_000,
    generation_interval_seconds: 10,

    // Derived: workloads needed per cycle to hit daily target
    // = 50000 / (86400 / 10) ≈ 5.8 per cycle → round up to 6
    target_per_cycle: Math.ceil(50_000 / (86_400 / 10)),

    // Per-source batch sizes (workloads generated per cycle)
    sources: {
        blockchain_indexer: { enabled: true, batch_size: 3 },
        data_aggregation: { enabled: true, batch_size: 2 },
        verification: { enabled: true, batch_size: 2 },
        ai_microtask: { enabled: true, batch_size: 2 }
    },

    // Deduplication window (ms)
    dedup_window_ms: 60_000,

    // Firewall source key used when enqueuing into DemandBuffer
    demand_source_key: 'genesis'
};
