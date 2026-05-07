"use client";

import { create } from "zustand";

export type DeploymentState = "queued" | "building" | "routing" | "active" | "failed";
export type NodeHealth = "healthy" | "degraded" | "offline";

export interface InfrastructureNode {
  id: string;
  name: string;
  type: "satellite" | "compute" | "queue" | "api" | "storage" | "relay" | "analytics" | "ai" | "database" | "gpu";
  region: string;
  health: NodeHealth;
  latencyMs: number;
  loadPct: number;
}

export interface Deployment {
  id: string;
  name: string;
  projectId: string;
  environment: "dev" | "staging" | "production";
  state: DeploymentState;
  updatedAt: string;
}

export interface DeploymentLog {
  id: string;
  deploymentId: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  line: string;
}

export interface InfraNotification {
  id: string;
  title: string;
  description: string;
  level: "info" | "warning" | "critical" | "success";
  createdAt: string;
}

export interface InfrastructureMetricPoint {
  t: string;
  latency: number;
  throughput: number;
  queueDepth: number;
}

type TopologyEdge = { id: string; source: string; target: string; active: boolean };
type TopologyNode = { id: string; label: string; kind: InfrastructureNode["type"]; active: boolean };

interface InfrastructureState {
  deployments: Deployment[];
  nodes: InfrastructureNode[];
  topology: { nodes: TopologyNode[]; edges: TopologyEdge[] };
  activeJobs: { id: string; label: string; progress: number }[];
  queueState: { depth: number; processing: number; failed: number };
  websocketEvents: { id: string; event: string; createdAt: string }[];
  metrics: InfrastructureMetricPoint[];
  terminalLogs: DeploymentLog[];
  notifications: InfraNotification[];
  environments: Array<"dev" | "staging" | "production">;
  activeEnvironment: "dev" | "staging" | "production";
  projects: { id: string; name: string }[];
  activeProjectId: string;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setActiveEnvironment: (env: "dev" | "staging" | "production") => void;
  setActiveProject: (projectId: string) => void;
  appendEvent: (event: string) => void;
  upsertDeployment: (deployment: Deployment) => void;
  patchNodeHealth: (id: string, health: NodeHealth, latencyMs: number) => void;
  appendMetric: (point: InfrastructureMetricPoint) => void;
  appendLog: (log: DeploymentLog) => void;
  appendNotification: (notification: InfraNotification) => void;
  updateQueue: (depth: number, processing: number, failed: number) => void;
}

const nowIso = () => new Date().toISOString();

const initialNodes: InfrastructureNode[] = [
  { id: "sat-1", name: "Orbital Mesh A1", type: "satellite", region: "Global", health: "healthy", latencyMs: 31, loadPct: 38 },
  { id: "api-1", name: "Edge API Gateway", type: "api", region: "Global", health: "healthy", latencyMs: 42, loadPct: 57 },
  { id: "gpu-1", name: "GPU Inference Pool", type: "gpu", region: "US-East", health: "healthy", latencyMs: 27, loadPct: 62 },
  { id: "db-1", name: "State Database", type: "database", region: "EU-West", health: "healthy", latencyMs: 18, loadPct: 45 },
];

export const useInfrastructureStore = create<InfrastructureState>((set) => ({
  deployments: [
    { id: "dep-2101", name: "Global Routing Graph", projectId: "proj-core", environment: "production", state: "active", updatedAt: nowIso() },
    { id: "dep-2102", name: "Inference Queue Expansion", projectId: "proj-core", environment: "staging", state: "building", updatedAt: nowIso() },
  ],
  nodes: initialNodes,
  topology: {
    nodes: initialNodes.map((n) => ({ id: n.id, label: n.name, kind: n.type, active: n.health === "healthy" })),
    edges: [
      { id: "e1", source: "sat-1", target: "api-1", active: true },
      { id: "e2", source: "api-1", target: "gpu-1", active: true },
      { id: "e3", source: "gpu-1", target: "db-1", active: true },
    ],
  },
  activeJobs: [
    { id: "job-1", label: "Image Build Worker", progress: 72 },
    { id: "job-2", label: "Policy Rollout", progress: 34 },
  ],
  queueState: { depth: 1260, processing: 402, failed: 4 },
  websocketEvents: [],
  metrics: [
    { t: "10:00", latency: 42, throughput: 12.1, queueDepth: 980 },
    { t: "10:05", latency: 38, throughput: 12.9, queueDepth: 1011 },
  ],
  terminalLogs: [],
  notifications: [],
  environments: ["dev", "staging", "production"],
  activeEnvironment: "production",
  projects: [
    { id: "proj-core", name: "Satelink Core Mesh" },
    { id: "proj-labs", name: "Satelink Labs" },
  ],
  activeProjectId: "proj-core",
  loading: false,
  setLoading: (loading) => set({ loading }),
  setActiveEnvironment: (activeEnvironment) => set({ activeEnvironment }),
  setActiveProject: (activeProjectId) => set({ activeProjectId }),
  appendEvent: (event) =>
    set((state) => ({
      websocketEvents: [{ id: crypto.randomUUID(), event, createdAt: nowIso() }, ...state.websocketEvents].slice(0, 80),
    })),
  upsertDeployment: (deployment) =>
    set((state) => {
      const idx = state.deployments.findIndex((d) => d.id === deployment.id);
      if (idx >= 0) {
        const next = [...state.deployments];
        next[idx] = deployment;
        return { deployments: next };
      }
      return { deployments: [deployment, ...state.deployments] };
    }),
  patchNodeHealth: (id, health, latencyMs) =>
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === id ? { ...node, health, latencyMs } : node)),
      topology: {
        ...state.topology,
        nodes: state.topology.nodes.map((node) => (node.id === id ? { ...node, active: health === "healthy" } : node)),
      },
    })),
  appendMetric: (point) => set((state) => ({ metrics: [...state.metrics.slice(-24), point] })),
  appendLog: (log) => set((state) => ({ terminalLogs: [...state.terminalLogs, log].slice(-500) })),
  appendNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications].slice(0, 60) })),
  updateQueue: (depth, processing, failed) => set({ queueState: { depth, processing, failed } }),
}));

export const selectActiveDeployments = (state: InfrastructureState) =>
  state.deployments.filter((deployment) => deployment.state !== "failed");

export const selectHealthyNodeCount = (state: InfrastructureState) =>
  state.nodes.filter((node) => node.health === "healthy").length;
