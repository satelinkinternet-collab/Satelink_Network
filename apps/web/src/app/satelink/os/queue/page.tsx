"use client";

import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

export default function SatelinkQueuePage() {
  const queue = useInfrastructureStore((state) => state.queueState);
  const jobs = useInfrastructureStore((state) => state.activeJobs);

  return (
    <OsPageTemplate
      title="Queue"
      subtitle="Live queue operations and active job processing throughput."
      metrics={[
        { label: "Depth", value: String(queue.depth) },
        { label: "Processing", value: String(queue.processing) },
        { label: "Failed", value: String(queue.failed) },
        { label: "Workers", value: String(jobs.length) },
      ]}
    >
      <div className="space-y-3">
        {jobs.map((job) => (
          <article key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between text-sm">
              <p className="text-white">{job.label}</p>
              <p className="text-[#B0E4CC]/65">{job.progress}%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[#408A71]" style={{ width: `${job.progress}%` }} />
            </div>
          </article>
        ))}
      </div>
    </OsPageTemplate>
  );
}
