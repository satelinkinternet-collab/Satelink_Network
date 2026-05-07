"use client";

import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

export default function SatelinkNotificationsPage() {
  const notifications = useInfrastructureStore((state) => state.notifications);

  return (
    <OsPageTemplate
      title="Notifications"
      subtitle="Infra activity alerts, deployment warnings, and realtime operational signals."
      metrics={[
        { label: "Total Alerts", value: String(notifications.length) },
        { label: "Warning", value: String(notifications.filter((n) => n.level === "warning").length) },
        { label: "Critical", value: String(notifications.filter((n) => n.level === "critical").length) },
        { label: "Success", value: String(notifications.filter((n) => n.level === "success").length) },
      ]}
    >
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-5 text-sm text-[#B0E4CC]/60">No notifications yet. Live alerts appear here as infrastructure events stream in.</div>
        ) : (
          notifications.map((notification) => (
            <article key={notification.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-medium text-white">{notification.title}</p>
              <p className="mt-1 text-xs text-[#B0E4CC]/70">{notification.description}</p>
            </article>
          ))
        )}
      </div>
    </OsPageTemplate>
  );
}
