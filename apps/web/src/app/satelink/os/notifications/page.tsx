export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

"use client";

"use client";

import { useMemo, useState } from "react";
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, Check, RefreshCw } from "lucide-react";
import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

type NotificationLevel = "success" | "info" | "warning" | "error";

interface Notification {
  id: string;
  title: string;
  description: string;
  level: NotificationLevel;
  timestamp: string;
  read: boolean;
}

export default function SatelinkNotificationsPage() {
  const storeNotifications = useInfrastructureStore((state) => state.notifications);
  const activityStream = useInfrastructureStore((state) => state.activityStream);

  const [localRead, setLocalRead] = useState<Set<string>>(new Set());

  const notifications = useMemo<Notification[]>(() => {
    const fromStore = storeNotifications.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      level: n.level as NotificationLevel,
      timestamp: new Date().toISOString(),
      read: localRead.has(n.id),
    }));

    const fromActivity = activityStream.slice(0, 10).map((a) => {
      let level: NotificationLevel = "info";
      if (a.type === "revenue.recorded" || a.type === "epoch.closed") level = "success";
      if (a.type === "node.disconnected" || a.type === "queue.overloaded") level = "warning";
      if (a.type === "deploy.failed") level = "error";

      return {
        id: a.id,
        title: a.type.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: a.message,
        level,
        timestamp: a.createdAt,
        read: localRead.has(a.id),
      };
    });

    const all = [...fromStore, ...fromActivity];
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [storeNotifications, activityStream, localRead]);

  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
    success: notifications.filter((n) => n.level === "success").length,
    warning: notifications.filter((n) => n.level === "warning").length,
    error: notifications.filter((n) => n.level === "error").length,
  }), [notifications]);

  const markAllRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setLocalRead(allIds);
  };

  const markAsRead = (id: string) => {
    setLocalRead((prev) => new Set([...prev, id]));
  };

  const getIcon = (level: NotificationLevel) => {
    switch (level) {
      case "success": return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case "info": return <Info className="h-5 w-5 text-blue-400" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case "error": return <XCircle className="h-5 w-5 text-red-400" />;
    }
  };

  const getBorderColor = (level: NotificationLevel) => {
    switch (level) {
      case "success": return "border-l-emerald-400";
      case "info": return "border-l-blue-400";
      case "warning": return "border-l-yellow-400";
      case "error": return "border-l-red-400";
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <OsPageTemplate
      title="Notifications"
      subtitle="Infrastructure alerts, revenue events, and operational signals."
      metrics={[
        { label: "Total", value: String(stats.total) },
        { label: "Unread", value: String(stats.unread) },
        { label: "Warnings", value: String(stats.warning) },
        { label: "Errors", value: String(stats.error) },
      ]}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4" /> {stats.success}
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-yellow-500/10 px-3 py-1.5 text-sm text-yellow-400">
            <AlertTriangle className="h-4 w-4" /> {stats.warning}
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-sm text-red-400">
            <XCircle className="h-4 w-4" /> {stats.error}
          </span>
        </div>
        <button
          onClick={markAllRead}
          disabled={stats.unread === 0}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-sm text-[#B0E4CC]/70 hover:bg-white/5 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/20 p-16">
          <Bell className="mb-4 h-16 w-16 text-[#B0E4CC]/20" />
          <p className="text-xl text-white">No notifications yet</p>
          <p className="mt-2 text-sm text-[#B0E4CC]/50">
            Live alerts appear here as infrastructure events stream in.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`relative rounded-xl border border-l-4 border-white/10 bg-black/20 p-4 transition-colors ${getBorderColor(notification.level)} ${
                notification.read ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5">{getIcon(notification.level)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-white">{notification.title}</h3>
                      <p className="mt-1 text-sm text-[#B0E4CC]/70">{notification.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#B0E4CC]/50">{formatTime(notification.timestamp)}</span>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="rounded p-1 text-[#B0E4CC]/40 hover:bg-white/10 hover:text-[#B0E4CC]"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {notification.level === "error" && (
                    <button className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/30">
                      <RefreshCw className="h-4 w-4" />
                      Retry
                    </button>
                  )}
                </div>
              </div>
              {!notification.read && (
                <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-[#00D1FF]" />
              )}
            </article>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-[#00D1FF]/20 bg-[#00D1FF]/5 p-4">
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-[#00D1FF]" />
          <div>
            <p className="text-sm text-white">Real-time notifications</p>
            <p className="text-xs text-[#B0E4CC]/60">
              Notifications stream from the backend via SSE. Configure preferences in Settings.
            </p>
          </div>
        </div>
      </div>
    </OsPageTemplate>
  );
}
