"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function AdminNodesPage() {
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [nodes, setNodes] = useState<any[]>([]);
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

  // ✅ FETCH NODES
  const fetchNodes = async () => {
    try {
      const res = await api.get("/admin-api/nodes");
      if (res.data?.ok) {
        setNodes(res.data.nodes);
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch nodes");
    }
  };

  useEffect(() => {
    if (!checkedAuth) return;
    fetchNodes();
  }, [checkedAuth]);

  if (!checkedAuth) return null;

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Node Dashboard</h1>

      {error && <div className="text-red-500">{error}</div>}

      {nodes.length === 0 ? (
        <div>No nodes found</div>
      ) : (
        <pre className="bg-black p-4 rounded text-sm overflow-auto">
          {JSON.stringify(nodes, null, 2)}
        </pre>
      )}
    </div>
  );
}