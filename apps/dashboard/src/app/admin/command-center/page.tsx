"use client";

import { useEffect, useState } from "react";

export default function CommandCenterPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    const fetchData = () => {
      const token = localStorage.getItem("satelink_token");

      fetch("http://localhost:8080/admin-api/stats", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((d) => {
          setData(d);
          setError("");
          setLastUpdated(new Date().toLocaleTimeString());
        })
        .catch((err) => {
          setError("Disconnected");
        });
    };

    fetchData(); // initial
    const interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
  }, []);

  const stats = data?.stats;

  return (
    <div className="p-6 text-white space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold">Admin Command Center</h1>
          <div className="flex items-center gap-2 text-green-400 mt-2">
            <span className="animate-pulse">●</span> LIVE
          </div>
        </div>
        <p className="text-sm text-zinc-400">Last updated: {lastUpdated || "—"}</p>
      </div>

      {!data && !error && <p>Loading dashboard...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card title="Total Nodes" value={stats.totalNodes} />
            <Card title="Active Nodes" value={stats.activeNodes} />
            <Card title="Revenue (USDT)" value={`$${stats.totalRevenueUsdt}`} />
            <Card title="Ops Processed" value={stats.totalOpsProcessed} />
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              {data?.recentEvents && <RevenueChart data={data.recentEvents} />}
              {data?.recentEvents && <ActivityFeed events={data.recentEvents} />}
            </div>
            <div className="col-span-1 space-y-6">
        <ControlPanel />
        {data?.stats && <AlertsPanel stats={data.stats} />}
              {data?.stats?.settlementMode && (
                <SettlementStatus mode={data.stats.settlementMode} />
              )}
            </div>
          </div>

          <div />
        </>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function ActivityFeed({ events }: { events: any[] }) {
  return (
    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
      <h2 className="text-xl font-semibold mb-4">Live Activity Feed</h2>
      <div className="max-h-64 overflow-y-auto text-sm space-y-2">
        {events?.slice(0, 10).map((e, i) => (
          <div key={i} className="flex justify-between text-zinc-300">
            <span>{e.op_type}</span>
            <span>${e.amount_usdt}</span>
            <span>{e.node_id}</span>
            <span>{e.client_id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}




function RevenueChart({ data }: { data: any[] }) {
  return (
    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
      <h2 className="text-xl font-semibold mb-4">Revenue Trend (Live)</h2>

      <div className="flex items-end gap-1 h-40">
        {data?.slice(-30).map((d, i) => (
          <div
            key={i}
            className="bg-green-500 w-2"
            style={{ height: `${Math.min(d.amount_usdt * 200, 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}


function SettlementStatus({ mode }: { mode: string }) {
  const isReal = mode !== "SIMULATED";

  return (
    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900">
      <h2 className="text-xl font-semibold mb-2">Settlement Mode</h2>

      <div className={isReal ? "text-green-400" : "text-yellow-400"}>
        {isReal ? "REAL MONEY FLOW ACTIVE" : "SIMULATED (NO REAL MONEY)"}
      </div>
    </div>
  );
}


function AlertsPanel({ stats }: { stats: any }) {
  const alerts = [];

  if (stats?.activeNodes < 3) {
    alerts.push({ type: "critical", msg: "Low active nodes" });
  }

  if (stats?.totalRevenueUsdt < 50) {
    alerts.push({ type: "warning", msg: "Revenue below threshold" });
  }

  if ((stats?.epoch_status || stats?.currentEpoch?.status) !== "OPEN") {
    alerts.push({ type: "critical", msg: "Epoch not running" });
  }

  if (stats?.opsPerMin < 5) {
    alerts.push({ type: "warning", msg: "Low system activity" });
  }

  return (
    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
      <h2 className="text-lg font-semibold mb-3">System Alerts</h2>

      {alerts.length === 0 ? (
        <div className="text-green-400">All systems healthy</div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={
                a.type === "critical"
                  ? "text-red-400"
                  : "text-yellow-400"
              }
            >
              • {a.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function ControlPanel() {
  return (
    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
      <h2 className="text-lg font-semibold mb-3">Control Panel</h2>

      <div className="space-y-2">
        <button onClick={triggerTestJob} className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded">
          Trigger Test Job (LIVE)
        </button>

        <button onClick={simulateLoad} className="w-full bg-yellow-600 hover:bg-yellow-700 p-2 rounded">
          Simulate Load Spike (LIVE)
        </button>

        <button className="w-full bg-red-600 hover:bg-red-700 p-2 rounded">
          Simulate Node Failure
        </button>
      </div>
    </div>
  );
}


async function triggerTestJob() {
  const token = localStorage.getItem("satelink_token");

  await fetch("http://localhost:8080/v1/jobs/test", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function simulateLoad() {
  const token = localStorage.getItem("satelink_token");

  await fetch("http://localhost:8080/v1/system/load", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

