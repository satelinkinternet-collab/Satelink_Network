"use client";

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

export default function CommandCenterPage() {
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

  // ✅ FETCH DATA
  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/admin/command/summary");
      setData(res.data);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    }
  }, []);

  useEffect(() => {
    if (!checkedAuth) return;
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [checkedAuth, fetchData]);

  if (!checkedAuth) return null;

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Admin Command Center</h1>

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