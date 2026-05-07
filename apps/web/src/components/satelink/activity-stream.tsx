"use client";

import { useMemo, useState } from "react";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

const levels = ["all", "info", "warning", "critical", "success"] as const;

export function ActivityStream() {
  const [filter, setFilter] = useState<(typeof levels)[number]>("all");
  const events = useInfrastructureStore((state) =>
    state.activityStream.filter(
      (event) =>
        event.projectId === state.activeProjectId &&
        event.environment === state.activeEnvironment &&
        (filter === "all" || event.severity === filter),
    ),
  );

  const rows = useMemo(() => events.slice(0, 24), [events]);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#B0E4CC]/80">Infrastructure Activity</p>
        <div className="flex gap-1">
          {levels.map((level) => (
            <button
              key={level}
              className={`rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${
                filter === level ? "bg-[#285A48] text-white" : "bg-white/5 text-[#B0E4CC]/75"
              }`}
              onClick={() => setFilter(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs text-[#B0E4CC]/45">No events in this scope yet.</p>
        ) : (
          rows.map((event) => (
            <article key={event.id} className="rounded-lg border border-white/10 bg-[#0b1716] p-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white">{event.message}</p>
                <span className="text-[10px] text-[#B0E4CC]/55">{new Date(event.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#B0E4CC]/50">{event.type}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
