"use client";

import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

export default function SatelinkAnalyticsPage() {
  const metrics = useInfrastructureStore((state) => state.metrics);

  return (
    <OsPageTemplate
      title="Analytics"
      subtitle="Infra-grade observability for latency, throughput, and queue pressure."
      metrics={[
        { label: "P95 Latency", value: `${Math.max(...metrics.map((m) => m.latency))}ms` },
        { label: "Peak Throughput", value: `${Math.max(...metrics.map((m) => m.throughput)).toFixed(1)}M/min` },
        { label: "Queue Peak", value: String(Math.max(...metrics.map((m) => m.queueDepth))) },
        { label: "Samples", value: String(metrics.length) },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-2 text-sm text-[#B0E4CC]/70">Latency trend</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <XAxis dataKey="t" stroke="#5b8073" />
                <YAxis stroke="#5b8073" />
                <Tooltip />
                <Area dataKey="latency" stroke="#00D1FF" fill="#00D1FF" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-2 text-sm text-[#B0E4CC]/70">Queue depth</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics}>
                <XAxis dataKey="t" stroke="#5b8073" />
                <YAxis stroke="#5b8073" />
                <Tooltip />
                <Bar dataKey="queueDepth" fill="#408A71" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </OsPageTemplate>
  );
}
