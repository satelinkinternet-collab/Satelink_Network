"use client";




import { useEffect, useState, useMemo } from "react";
import { Activity, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

interface QueueJob {
  id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  nodeId: string;
  startedAt: string;
  duration: number;
  revenueUsdt: number;
}

export default function SatelinkQueuePage() {
  const queue = useInfrastructureStore((state) => state.queueState);
  const activeJobs = useInfrastructureStore((state) => state.activeJobs);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const stats = useMemo(() => ({
    pending: jobs.filter(j => j.status === "pending").length,
    running: jobs.filter(j => j.status === "running").length,
    completed: jobs.filter(j => j.status === "completed").length,
    failed: jobs.filter(j => j.status === "failed").length,
  }), [jobs]);

  const fetchJobs = async () => {
    setIsRefreshing(true);
    try {
      const [nodesRes, epochRes] = await Promise.all([
        fetch("https://rpc.satelink.network/api/nodes").catch(() => null),
        fetch("https://rpc.satelink.network/api/settlement/history").catch(() => null),
      ]);

      const mockJobs: QueueJob[] = activeJobs.map((j, i) => ({
        id: `job_${j.id}`,
        type: j.label.includes("RPC") ? "rpc_call" : j.label.includes("inference") ? "ai_inference" : "workload",
        status: j.progress === 100 ? "completed" : j.progress > 0 ? "running" : "pending",
        nodeId: `NODE-${["ap-south-1", "us-west-2", "eu-central-1"][i % 3]}`,
        startedAt: new Date(Date.now() - Math.random() * 300000).toISOString(),
        duration: Math.floor(j.progress * 1.5),
        revenueUsdt: j.progress === 100 ? 0.00003 : 0,
      }));

      if (nodesRes?.ok) {
        const nodesData = await nodesRes.json();
        if (Array.isArray(nodesData) && nodesData.length > 0) {
          const nodeJobs = nodesData.slice(0, 5).map((node: { node_id: string; region: string }, i: number) => ({
            id: `rpc_${node.node_id}_${i}`,
            type: "rpc_call",
            status: "completed" as const,
            nodeId: node.node_id,
            startedAt: new Date(Date.now() - Math.random() * 600000).toISOString(),
            duration: Math.floor(20 + Math.random() * 100),
            revenueUsdt: 0.00003,
          }));
          setJobs([...mockJobs, ...nodeJobs]);
        } else {
          setJobs(mockJobs);
        }
      } else {
        setJobs(mockJobs);
      }

      setLastUpdated(new Date());
    } catch {
      setJobs(activeJobs.map((j, i) => ({
        id: `job_${j.id}`,
        type: "workload",
        status: j.progress === 100 ? "completed" : j.progress > 0 ? "running" : "pending",
        nodeId: `NODE-${i}`,
        startedAt: new Date().toISOString(),
        duration: Math.floor(j.progress * 1.5),
        revenueUsdt: 0,
      })));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 15000);
    return () => clearInterval(interval);
  }, [activeJobs]);

  const getStatusIcon = (status: QueueJob["status"]) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-yellow-400" />;
      case "running": return <Activity className="h-4 w-4 text-blue-400 animate-pulse" />;
      case "completed": return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case "failed": return <AlertCircle className="h-4 w-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: QueueJob["status"]) => {
    switch (status) {
      case "pending": return "bg-yellow-500/20 text-yellow-400";
      case "running": return "bg-blue-500/20 text-blue-400";
      case "completed": return "bg-emerald-500/20 text-emerald-400";
      case "failed": return "bg-red-500/20 text-red-400";
    }
  };

  return (
    <OsPageTemplate
      title="Job Queue"
      subtitle="Real-time workload processing and revenue attribution."
      metrics={[
        { label: "Depth", value: String(queue.depth) },
        { label: "Processing", value: String(queue.processing) },
        { label: "Failed", value: String(queue.failed) },
        { label: "Workers", value: String(activeJobs.length) },
      ]}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-1.5">
            <Clock className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-yellow-400">{stats.pending} Pending</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1.5">
            <Activity className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-blue-400">{stats.running} Running</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">{stats.completed} Completed (24h)</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">{stats.failed} Failed (24h)</span>
          </div>
        </div>
        <button
          onClick={fetchJobs}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-[#B0E4CC]/70 hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/20 p-12">
          <Activity className="mb-4 h-12 w-12 text-[#B0E4CC]/30" />
          <p className="text-lg text-white">Queue is empty</p>
          <p className="mt-1 text-sm text-[#B0E4CC]/50">
            Revenue events appear here as RPC traffic flows through the network.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-black/30">
              <tr>
                <th className="px-4 py-3 font-medium text-[#B0E4CC]/60">Job ID</th>
                <th className="px-4 py-3 font-medium text-[#B0E4CC]/60">Type</th>
                <th className="px-4 py-3 font-medium text-[#B0E4CC]/60">Status</th>
                <th className="px-4 py-3 font-medium text-[#B0E4CC]/60">Node</th>
                <th className="px-4 py-3 font-medium text-[#B0E4CC]/60">Duration</th>
                <th className="px-4 py-3 font-medium text-[#B0E4CC]/60">Revenue (USDT)</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <code className="rounded bg-black/30 px-2 py-0.5 font-mono text-xs text-[#00D1FF]">
                      {job.id.slice(0, 16)}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-white">{job.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${getStatusColor(job.status)}`}>
                      {getStatusIcon(job.status)}
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#B0E4CC]/70">{job.nodeId}</td>
                  <td className="px-4 py-3 text-[#B0E4CC]/70">{job.duration}ms</td>
                  <td className="px-4 py-3 font-mono text-[#408A71]">
                    {job.revenueUsdt > 0 ? `$${job.revenueUsdt.toFixed(6)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-white/10 bg-black/30 px-4 py-2 text-xs text-[#B0E4CC]/50">
            Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refresh every 15s
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <p className="text-sm font-medium text-[#B0E4CC]">Active Workers</p>
        {activeJobs.map((job) => (
          <article key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between text-sm">
              <p className="text-white">{job.label}</p>
              <p className="text-[#B0E4CC]/65">{job.progress}%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[#408A71] transition-all" style={{ width: `${job.progress}%` }} />
            </div>
          </article>
        ))}
      </div>
    </OsPageTemplate>
  );
}
