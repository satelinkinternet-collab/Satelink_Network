export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

"use client";

"use client";

import { NetworkGlobe } from "@/components/satelink/network-globe";
import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

export default function SatelinkNetworkPage() {
  const events = useInfrastructureStore((state) => state.websocketEvents);

  return (
    <OsPageTemplate
      title="Network"
      subtitle="Satellite and relay mesh visualization with live decentralized routing signals."
      metrics={[
        { label: "Realtime Events", value: String(events.length) },
        { label: "Orbital Routes", value: "214" },
        { label: "Active Relays", value: "672" },
        { label: "Packet Success", value: "99.98%" },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <NetworkGlobe />
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm text-[#B0E4CC]/70">Activity feed</p>
          <div className="space-y-2">
            {events.slice(0, 12).map((event) => (
              <div key={event.id} className="rounded-lg border border-white/10 bg-[#0c1615] p-2 text-xs text-[#B0E4CC]/80">
                {event.event}
              </div>
            ))}
          </div>
        </section>
      </div>
    </OsPageTemplate>
  );
}
