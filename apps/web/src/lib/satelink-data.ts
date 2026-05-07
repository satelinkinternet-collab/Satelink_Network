export type InfraNodeKind =
  | "satellite"
  | "compute"
  | "queue"
  | "api"
  | "storage"
  | "relay"
  | "analytics"
  | "ai"
  | "database"
  | "gpu";

export type InfraNode = {
  id: string;
  kind: InfraNodeKind;
  title: string;
  region: string;
  status: "active" | "degraded" | "offline";
  latencyMs: number;
  throughput: string;
};

export const infraNodes: InfraNode[] = [
  { id: "sat-1", kind: "satellite", title: "Orbital Mesh A1", region: "Global", status: "active", latencyMs: 34, throughput: "12.4 Gbps" },
  { id: "cmp-1", kind: "compute", title: "Compute Cluster Tokyo", region: "APAC", status: "active", latencyMs: 22, throughput: "3.2M req/h" },
  { id: "que-1", kind: "queue", title: "Global Queue Fabric", region: "Multi-Region", status: "active", latencyMs: 12, throughput: "180k jobs/min" },
  { id: "api-1", kind: "api", title: "Edge API Gateway", region: "Global Edge", status: "degraded", latencyMs: 68, throughput: "1.1M req/min" },
  { id: "gpu-1", kind: "gpu", title: "GPU Inference Pod", region: "US-East", status: "active", latencyMs: 28, throughput: "90k tokens/sec" },
];

export const landingMetrics = [
  { label: "Active Nodes", value: "4,982", delta: "+6.2%" },
  { label: "Global Regions", value: "72", delta: "+3" },
  { label: "Deployments", value: "31,204", delta: "+11.9%" },
  { label: "Network Uptime", value: "99.987%", delta: "+0.02%" },
];

export const deploymentTimeline = [
  { time: "09:18:01", event: "Queue workers scaling to x6", severity: "ok" },
  { time: "09:18:14", event: "Edge gateway patched in eu-west", severity: "ok" },
  { time: "09:18:36", event: "Satellite relay transient packet loss", severity: "warn" },
  { time: "09:18:52", event: "Routing policy auto-healed", severity: "ok" },
];
