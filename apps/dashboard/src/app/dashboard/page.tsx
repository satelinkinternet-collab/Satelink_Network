"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function DashboardPage() {
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  // ✅ AUTH GUARD
  useEffect(() => {
    const token = localStorage.getItem("satelink_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setCheckedAuth(true);
  }, []);

  // ✅ FETCH NETWORK DATA
  const fetchStats = async () => {
    try {
      const res = await api.get("/api/network/stats");
      setData(res.data);
    } catch (e: any) {
      setError(e.message || "Failed to load stats");
    }
  };

  useEffect(() => {
    if (!checkedAuth) return;
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [checkedAuth]);

  if (!checkedAuth) return null;

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Network Dashboard</h1>

      {error && <div className="text-red-500">{error}</div>}

      {!data ? (
        <div>Loading...</div>
      ) : (
        <pre className="bg-black p-4 rounded text-sm overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}