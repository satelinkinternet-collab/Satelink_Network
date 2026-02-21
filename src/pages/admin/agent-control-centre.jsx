/**
 * Agent Control Centre — Satelink DePIN
 * src/pages/admin/agent-control-centre.jsx
 *
 * Live dashboard for monitoring and controlling all 10 Satelink platform agents.
 * Wires to existing admin API endpoints:
 *   GET  /admin/control-room/command/summary
 *   GET  /admin/control-room/command/live-feed  (SSE)
 *   GET  /admin/control-room/settings/feature-flags
 *   POST /admin/control-room/controls/pause-withdrawals
 *   POST /admin/control-room/controls/security-freeze
 *   GET  /admin/autonomous/config
 *   POST /admin/autonomous/config
 *   POST /admin/autonomous/trigger
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Agent Definitions (10 agents) ───────────────────────────────────────────
const AGENTS = [
  {
    id: "operations_engine",
    name: "Operations Engine",
    description: "Processes paid ops, enforces rate limits, spike detection",
    priority: "P0",
    icon: "⚙️",
    healthKey: "opsEngine",
    endpoints: ["/api/nodes/ops/execute"],
  },
  {
    id: "runtime_monitor",
    name: "Runtime Monitor",
    description: "Tracks system health, fires alerts, latency & error rate",
    priority: "P0",
    icon: "📡",
    healthKey: "runtimeMonitor",
    endpoints: ["/admin/control-room/ops/errors"],
  },
  {
    id: "safe_mode_autopilot",
    name: "Safe Mode Autopilot",
    description: "Auto-freezes withdrawals on solvency failure or monitor loss",
    priority: "P0",
    icon: "🛡️",
    healthKey: "safeModeAutopilot",
    endpoints: ["/admin/control-room/controls/pause-withdrawals"],
  },
  {
    id: "settlement_engine",
    name: "Settlement Engine",
    description: "Batches USDT payouts via Fuse adapter, retry on failure",
    priority: "P0",
    icon: "💸",
    healthKey: "settlementEngine",
    endpoints: ["/admin/control-room/revenue/overview"],
  },
  {
    id: "economic_ledger",
    name: "Economic Ledger",
    description: "Immutable epoch finalization, hash-locked earnings records",
    priority: "P0",
    icon: "📒",
    healthKey: "ledger",
    endpoints: ["/admin/control-room/rewards/epochs"],
  },
  {
    id: "auto_ops_engine",
    name: "Auto Ops Engine",
    description: "Autonomous reward multipliers, surge pricing, node bonuses",
    priority: "P1",
    icon: "🤖",
    healthKey: "autoOpsEngine",
    endpoints: ["/admin/autonomous/config", "/admin/autonomous/trigger"],
  },
  {
    id: "sla_engine",
    name: "SLA Engine",
    description: "Partner SLA monitoring, uptime tracking, breach detection",
    priority: "P1",
    icon: "📊",
    healthKey: "slaEngine",
    endpoints: ["/admin/partners"],
  },
  {
    id: "scheduler",
    name: "Scheduler",
    description: "Cron jobs: heartbeat checks, epoch finalization, backups",
    priority: "P1",
    icon: "⏱️",
    healthKey: "scheduler",
    endpoints: ["/admin/control-room/ops/reports/daily"],
  },
  {
    id: "self_test_runner",
    name: "Self-Test Runner",
    description: "29 automated tests, self-heal triage on failures",
    priority: "P1",
    icon: "🧪",
    healthKey: "selfTestRunner",
    endpoints: ["/admin/control/self-test"],
  },
  {
    id: "drills_service",
    name: "Drills Service",
    description: "Chaos drills, abuse firewall stress tests, recovery checks",
    priority: "P2",
    icon: "🔥",
    healthKey: "drills",
    endpoints: ["/admin/control/drills"],
  },
];

// ─── Priority Badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const styles = {
    P0: "bg-red-100 text-red-700 border border-red-300",
    P1: "bg-amber-100 text-amber-700 border border-amber-300",
    P2: "bg-blue-100 text-blue-700 border border-blue-300",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles[priority]}`}>
      {priority}
    </span>
  );
}

// ─── Status Dot ───────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const map = {
    healthy: "bg-green-400",
    degraded: "bg-amber-400 animate-pulse",
    down: "bg-red-500 animate-pulse",
    unknown: "bg-gray-400",
    paused: "bg-blue-400",
  };
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${map[status] || map.unknown}`}
      title={status}
    />
  );
}

// ─── Agent Card ───────────────────────────────────────────────────────────────
function AgentCard({ agent, status, metrics, onAction }) {
  const st = status?.status || "unknown";

  const statusBg = {
    healthy: "border-green-200 bg-green-50",
    degraded: "border-amber-200 bg-amber-50",
    down: "border-red-200 bg-red-50",
    paused: "border-blue-200 bg-blue-50",
    unknown: "border-gray-200 bg-white",
  };

  return (
    <div
      className={`rounded-xl border-2 p-4 shadow-sm transition-all hover:shadow-md ${statusBg[st] || statusBg.unknown}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{agent.icon}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <StatusDot status={st} />
              <span className="font-semibold text-gray-800 text-sm">{agent.name}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <PriorityBadge priority={agent.priority} />
              <span className="text-xs text-gray-400 capitalize">{st}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 mb-3 leading-relaxed">{agent.description}</p>

      {/* Metrics */}
      {metrics && Object.keys(metrics).length > 0 && (
        <div className="grid grid-cols-2 gap-1 mb-3">
          {Object.entries(metrics).map(([k, v]) => (
            <div key={k} className="bg-white bg-opacity-60 rounded-lg px-2 py-1">
              <div className="text-xs text-gray-400 truncate">{k}</div>
              <div className="text-xs font-mono font-semibold text-gray-700 truncate">
                {v ?? "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {onAction && (
        <div className="flex gap-1.5 flex-wrap">
          {agent.id === "auto_ops_engine" && (
            <button
              onClick={() => onAction(agent.id, "trigger")}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2.5 py-1 font-medium transition-colors"
            >
              Trigger Cycle
            </button>
          )}
          {agent.id === "safe_mode_autopilot" && (
            <button
              onClick={() => onAction(agent.id, "pause_withdrawals")}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-2.5 py-1 font-medium transition-colors"
            >
              Pause Withdrawals
            </button>
          )}
          {agent.id === "settlement_engine" && (
            <button
              onClick={() => onAction(agent.id, "security_freeze")}
              className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg px-2.5 py-1 font-medium transition-colors"
            >
              Security Freeze
            </button>
          )}
          {agent.id === "self_test_runner" && (
            <button
              onClick={() => onAction(agent.id, "run_tests")}
              className="text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg px-2.5 py-1 font-medium transition-colors"
            >
              Run Tests
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Live Feed Item ────────────────────────────────────────────────────────────
function FeedItem({ item }) {
  const levelStyle = {
    INFO: "text-blue-600",
    WARN: "text-amber-600",
    ERROR: "text-red-600",
    OK: "text-green-600",
  };
  const level = item.level || "INFO";
  return (
    <div className="flex gap-2 text-xs border-b border-gray-100 pb-1.5 mb-1.5">
      <span className="text-gray-400 font-mono whitespace-nowrap">
        {new Date(item.ts || item.timestamp || Date.now()).toLocaleTimeString()}
      </span>
      <span className={`font-bold w-12 shrink-0 ${levelStyle[level] || levelStyle.INFO}`}>
        {level}
      </span>
      <span className="text-gray-700">{item.message || item.msg || JSON.stringify(item)}</span>
    </div>
  );
}

// ─── Summary Stats Bar ────────────────────────────────────────────────────────
function StatBar({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
      <div className="text-2xl font-bold text-gray-800">{value ?? "—"}</div>
      <div className="text-xs font-medium text-gray-600">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AgentControlCentre() {
  const [summary, setSummary] = useState(null);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [agentMetrics, setAgentMetrics] = useState({});
  const [feedItems, setFeedItems] = useState([]);
  const [featureFlags, setFeatureFlags] = useState({});
  const [autoConfig, setAutoConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [actionResult, setActionResult] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL | P0 | P1 | P2
  const [searchQ, setSearchQ] = useState("");

  const feedRef = useRef(null);
  const sseRef = useRef(null);

  // ─── API Helper ─────────────────────────────────────────────────────────────
  const apiFetch = useCallback(async (path, opts = {}) => {
    const token = localStorage.getItem("satelink_jwt") || sessionStorage.getItem("satelink_jwt");
    const res = await fetch(path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return res.json();
  }, []);

  // ─── Load Summary ────────────────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    try {
      const data = await apiFetch("/admin/control-room/command/summary");
      setSummary(data);

      // Derive per-agent statuses from summary
      const statuses = {};
      const metrics = {};
      AGENTS.forEach((a) => {
        const raw = data?.[a.healthKey] || data?.agents?.[a.id];
        if (raw) {
          statuses[a.id] = {
            status: raw.status || (raw.ok !== false ? "healthy" : "down"),
          };
          const { status, ok, ...rest } = raw;
          if (Object.keys(rest).length > 0) metrics[a.id] = rest;
        } else {
          // Derive from known global status keys
          statuses[a.id] = { status: data?.system?.status === "HEALTHY" ? "healthy" : "unknown" };
        }
      });
      setAgentStatuses(statuses);
      setAgentMetrics(metrics);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("[AgentControlCentre] Summary fetch failed:", e.message);
    }
  }, [apiFetch]);

  // ─── Load Feature Flags ───────────────────────────────────────────────────
  const loadFlags = useCallback(async () => {
    try {
      const data = await apiFetch("/admin/control-room/settings/feature-flags");
      setFeatureFlags(data?.flags || data || {});
    } catch (_) {}
  }, [apiFetch]);

  // ─── Load Autonomous Config ───────────────────────────────────────────────
  const loadAutoConfig = useCallback(async () => {
    try {
      const data = await apiFetch("/admin/autonomous/config");
      setAutoConfig(data?.config || {});
    } catch (_) {}
  }, [apiFetch]);

  // ─── Connect SSE Live Feed ────────────────────────────────────────────────
  const connectFeed = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    const token = localStorage.getItem("satelink_jwt") || sessionStorage.getItem("satelink_jwt");
    const url = token
      ? `/admin/control-room/command/live-feed?token=${token}`
      : "/admin/control-room/command/live-feed";

    const es = new EventSource(url);
    sseRef.current = es;

    es.onmessage = (e) => {
      try {
        const item = JSON.parse(e.data);
        setFeedItems((prev) => [item, ...prev].slice(0, 100));
      } catch (_) {}
    };

    es.onerror = () => {
      es.close();
      // Reconnect after 5s
      setTimeout(connectFeed, 5000);
    };
  }, []);

  // ─── Initial Load + Polling ───────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadSummary(), loadFlags(), loadAutoConfig()]);
      setLoading(false);
      connectFeed();
    };
    init();

    const poll = setInterval(() => {
      loadSummary();
    }, 30000); // poll every 30s

    return () => {
      clearInterval(poll);
      sseRef.current?.close();
    };
  }, [loadSummary, loadFlags, loadAutoConfig, connectFeed]);

  // ─── Auto-scroll feed ────────────────────────────────────────────────────
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [feedItems]);

  // ─── Agent Actions ────────────────────────────────────────────────────────
  const handleAction = useCallback(
    async (agentId, action) => {
      try {
        let result;
        if (action === "trigger") {
          result = await apiFetch("/admin/autonomous/trigger", {
            method: "POST",
            body: JSON.stringify({ reason: "manual_trigger_from_acc" }),
          });
        } else if (action === "pause_withdrawals") {
          result = await apiFetch("/admin/control-room/controls/pause-withdrawals", {
            method: "POST",
            body: JSON.stringify({ reason: "manual pause from Agent Control Centre" }),
          });
        } else if (action === "security_freeze") {
          if (!window.confirm("Security freeze will halt all settlements. Confirm?")) return;
          result = await apiFetch("/admin/control-room/controls/security-freeze", {
            method: "POST",
            body: JSON.stringify({ reason: "manual freeze from Agent Control Centre" }),
          });
        } else if (action === "run_tests") {
          result = await apiFetch("/admin/control/self-test", { method: "POST" });
        }
        setActionResult({ ok: true, msg: `${action} → success`, data: result });
        setTimeout(() => setActionResult(null), 4000);
        loadSummary();
      } catch (e) {
        setActionResult({ ok: false, msg: `${action} failed: ${e.message}` });
        setTimeout(() => setActionResult(null), 6000);
      }
    },
    [apiFetch, loadSummary]
  );

  // ─── Toggle Auto Ops ──────────────────────────────────────────────────────
  const toggleAutoOps = useCallback(
    async (key, value) => {
      try {
        await apiFetch("/admin/autonomous/config", {
          method: "POST",
          body: JSON.stringify({ updates: { [key]: value } }),
        });
        setAutoConfig((prev) => ({ ...prev, [key]: String(value) }));
      } catch (e) {
        setActionResult({ ok: false, msg: `Config update failed: ${e.message}` });
        setTimeout(() => setActionResult(null), 4000);
      }
    },
    [apiFetch]
  );

  // ─── Filtered Agents ──────────────────────────────────────────────────────
  const filteredAgents = AGENTS.filter((a) => {
    const pMatch = filter === "ALL" || a.priority === filter;
    const sMatch =
      !searchQ ||
      a.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQ.toLowerCase());
    return pMatch && sMatch;
  });

  // ─── System-level health summary ──────────────────────────────────────────
  const healthCounts = AGENTS.reduce(
    (acc, a) => {
      const st = agentStatuses[a.id]?.status || "unknown";
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    {}
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">⚙️</div>
          <div className="text-gray-600 font-medium">Loading Agent Control Centre…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛰️</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Agent Control Centre</h1>
            <p className="text-xs text-gray-400">
              Satelink DePIN · {AGENTS.length} agents ·{" "}
              {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Loading…"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {actionResult && (
            <div
              className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                actionResult.ok
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {actionResult.msg}
            </div>
          )}
          <button
            onClick={() => { loadSummary(); loadFlags(); loadAutoConfig(); }}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <StatBar label="Total Agents" value={AGENTS.length} />
          <StatBar
            label="Healthy"
            value={healthCounts.healthy || 0}
            sub="of 10"
          />
          <StatBar
            label="Degraded"
            value={healthCounts.degraded || 0}
          />
          <StatBar
            label="Down / Unknown"
            value={(healthCounts.down || 0) + (healthCounts.unknown || 0)}
          />
          <StatBar
            label="Nodes Active"
            value={summary?.network?.active_nodes ?? summary?.activeNodes ?? "—"}
          />
          <StatBar
            label="Epoch"
            value={summary?.epoch?.current_epoch ?? summary?.currentEpoch ?? "—"}
          />
          <StatBar
            label="Settlement"
            value={
              summary?.settlement?.status ??
              (featureFlags?.FEATURE_REAL_SETTLEMENT === "true" ? "Live" : "Simulated")
            }
          />
        </div>

        {/* ── Main Layout: Agents + Sidebar ────────────────────────────────── */}
        <div className="flex gap-5">
          {/* ── Left: Agent Grid ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Filter Bar */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <input
                type="text"
                placeholder="Search agents…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {["ALL", "P0", "P1", "P2"].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    filter === p
                      ? "bg-indigo-600 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p === "ALL" ? "All Agents" : p}
                </button>
              ))}
              <span className="text-xs text-gray-400 ml-auto">
                {filteredAgents.length} / {AGENTS.length} shown
              </span>
            </div>

            {/* Agent Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  status={agentStatuses[agent.id]}
                  metrics={agentMetrics[agent.id]}
                  onAction={handleAction}
                />
              ))}
            </div>

            {/* ── Autonomous Ops Config ─────────────────────────────────── */}
            {Object.keys(autoConfig).length > 0 && (
              <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  🤖 Autonomous Ops Configuration
                  <span className="text-xs text-gray-400 font-normal">
                    (AutoOpsEngine toggles)
                  </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(autoConfig).map(([key, value]) => {
                    const isBool = value === "true" || value === "false";
                    const enabled = value === "true";
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                      >
                        <span className="text-xs text-gray-600 font-medium truncate pr-2">
                          {key.replace(/_/g, " ")}
                        </span>
                        {isBool ? (
                          <button
                            onClick={() => toggleAutoOps(key, !enabled)}
                            className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${
                              enabled
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                            }`}
                          >
                            {enabled ? "ON" : "OFF"}
                          </button>
                        ) : (
                          <span className="text-xs font-mono text-gray-700 shrink-0">
                            {value}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Feature Flags ─────────────────────────────────────────── */}
            {Object.keys(featureFlags).length > 0 && (
              <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  🚩 Feature Flags
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(featureFlags).map(([flag, val]) => (
                    <div
                      key={flag}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-xs text-gray-600 truncate pr-1">
                        {flag.replace(/^FEATURE_/, "").replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-xs font-bold shrink-0 ${
                          val === true || val === "true"
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      >
                        {val === true || val === "true" ? "✓" : "✗"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Live Feed ────────────────────────────────────────── */}
          <div className="w-80 shrink-0 hidden lg:block">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
                  Live Agent Feed
                </h2>
                <button
                  onClick={() => setFeedItems([])}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              </div>
              <div
                ref={feedRef}
                className="flex-1 overflow-y-auto p-4 text-xs"
                style={{ maxHeight: "calc(100vh - 280px)" }}
              >
                {feedItems.length === 0 ? (
                  <div className="text-gray-400 text-center mt-8">
                    <div className="text-2xl mb-2">📡</div>
                    Connecting to live feed…
                  </div>
                ) : (
                  feedItems.map((item, i) => <FeedItem key={i} item={item} />)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
