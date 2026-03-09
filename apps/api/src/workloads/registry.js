// src/workloads/registry.js

/**
 * Placeholder Workload Registry
 * (Added for Task 14 of Antigravity v2)
 */

export function listWorkloads() {
    return [
        { id: "rpc-relay", name: "RPC Relay", type: "system" }
    ];
}

export function getWorkload(id) {
    const workloads = listWorkloads();
    return workloads.find(w => w.id === id) || null;
}
