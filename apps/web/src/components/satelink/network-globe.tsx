"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

export function NetworkGlobe() {
  const nodes = useInfrastructureStore((state) => state.nodes);
  const queueDepth = useInfrastructureStore((state) => state.queueState.depth);
  const runtime = useInfrastructureStore((state) => state.runtime);
  const healthy = useMemo(() => nodes.filter((node) => node.health === "healthy").length, [nodes]);
  const pulseScale = queueDepth > 1800 ? 1.7 : queueDepth > 1300 ? 1.35 : 1.15;

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-3xl border border-white/10 bg-[#081211]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,rgba(64,138,113,0.35),transparent_42%),radial-gradient(circle_at_70%_65%,rgba(0,209,255,0.15),transparent_38%)]" />
      <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#B0E4CC]/20" />
      <div className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#408A71]/30" />
      {[...Array.from({ length: Math.max(healthy + 3, 4) })].map((_, idx) => (
        <motion.div
          key={idx}
          className="absolute h-2 w-2 rounded-full bg-[#00D1FF]"
          style={{
            left: `${20 + idx * 11}%`,
            top: `${30 + ((idx * 13) % 40)}%`,
          }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [1, pulseScale, 1] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 + idx * 0.2 }}
        />
      ))}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#00D1FF]/20"
        animate={{ rotate: 360 }}
        transition={{ repeat: Number.POSITIVE_INFINITY, ease: "linear", duration: runtime.networkStable ? 20 : 11 }}
      />
    </div>
  );
}
