// src/workloads/rpc/relay.js

export function rpcRelayStub(req, res) {
    return res.json({
        status: "RPC workload not yet activated",
        mode: process.env.SATELINK_MODE || "simulation"
    });
}
