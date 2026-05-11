"use client";
import { useEffect, useState } from "react";

export default function QueuePage() {
  const [jobs, setJobs] = useState<{ id: string; status: string; type: string; created: string }[]>([]);
  const [stats, setStats] = useState({ pending: 0, running: 0, completed: 0, failed: 0 });

  useEffect(() => {
    fetch("/api/queue/status")
      .then(r => r.json())
      .then(d => {
        setJobs(d.jobs || []);
        setStats({
          pending: d.stats?.pending || 0,
          running: d.stats?.running || 0,
          completed: d.stats?.completed || 0,
          failed: d.stats?.failed || 0,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 bg-[#091413] min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#B0E4CC]">Job Queue</h1>
        <p className="text-[#408A71] text-sm mt-1">Live workload execution queue</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pending", value: stats.pending, color: "#F59E0B" },
          { label: "Running", value: stats.running, color: "#00D1FF" },
          { label: "Completed", value: stats.completed, color: "#408A71" },
          { label: "Failed", value: stats.failed, color: "#EF4444" },
        ].map((s) => (
          <div key={s.label} className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-4">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[#408A71] uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg overflow-hidden">
        {jobs.length === 0 ? (
          <p className="text-[#408A71] text-sm text-center py-12">
            No jobs in queue. Revenue events will appear here when RPC traffic is active.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#0a1816] text-[#408A71] uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Job ID</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#285A48]">
              {jobs.map((job) => (
                <tr key={job.id} className="text-[#B0E4CC]">
                  <td className="px-4 py-3 font-mono text-xs">{job.id}</td>
                  <td className="px-4 py-3">{job.type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      job.status === "completed" ? "bg-[#408A71]/20 text-[#408A71]" :
                      job.status === "running" ? "bg-[#00D1FF]/20 text-[#00D1FF]" :
                      job.status === "failed" ? "bg-[#EF4444]/20 text-[#EF4444]" :
                      "bg-[#F59E0B]/20 text-[#F59E0B]"
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#408A71]">{job.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
