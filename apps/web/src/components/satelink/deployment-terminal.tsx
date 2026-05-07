"use client";

import { useEffect, useMemo, useRef } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

const colors = {
  info: "text-[#B0E4CC]",
  warn: "text-amber-300",
  error: "text-rose-300",
  success: "text-emerald-300",
};

export function DeploymentTerminal({ deploymentId }: { deploymentId?: string }) {
  const logs = useInfrastructureStore((state) =>
    state.terminalLogs.filter((log) => (deploymentId ? log.deploymentId === deploymentId : true)).slice(-120),
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const exportable = useMemo(() => logs.map((log) => `[${log.timestamp}] ${log.line}`).join("\n"), [logs]);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#081110]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <p className="text-sm text-[#B0E4CC]/80">Deployment Terminal</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(exportable);
            toast.success("Terminal logs copied");
          }}
          className="text-xs"
        >
          <Copy className="mr-1 h-3 w-3" />
          Copy logs
        </Button>
      </div>
      <div ref={ref} className="h-72 overflow-y-auto px-4 py-3 font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-[#B0E4CC]/40">Waiting for deployment logs...</p>
        ) : (
          logs.map((log) => (
            <p key={log.id} className={`mb-1 ${colors[log.level]}`}>
              <span className="text-[#B0E4CC]/40">[{log.timestamp}]</span> {log.line}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
