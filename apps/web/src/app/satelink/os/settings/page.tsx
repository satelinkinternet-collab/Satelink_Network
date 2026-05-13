"use client";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;


import { useState, useEffect } from "react";
import { Key, Server, Bell, Globe, Eye, EyeOff, Copy, Check, Plus, Trash2 } from "lucide-react";
import { OsPageTemplate } from "@/components/satelink/os-page-template";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  tier: string;
  createdAt: string;
  lastUsed: string | null;
}

export default function SatelinkSettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [nodeId, setNodeId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [notifications, setNotifications] = useState({
    epochClose: true,
    claimAvailable: true,
    nodeOffline: true,
  });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    const storedKeys = localStorage.getItem("satelink_api_keys");
    if (storedKeys) {
      setApiKeys(JSON.parse(storedKeys));
    }
    const storedNodeId = localStorage.getItem("satelink_node_id");
    if (storedNodeId) setNodeId(storedNodeId);
    const storedWallet = localStorage.getItem("satelink_wallet");
    if (storedWallet) setWalletAddress(storedWallet);
    const storedNotifs = localStorage.getItem("satelink_notifications");
    if (storedNotifs) setNotifications(JSON.parse(storedNotifs));
  }, []);

  const createApiKey = async () => {
    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: `API Key ${apiKeys.length + 1}`,
      key: `sk_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
      tier: "free",
      createdAt: new Date().toISOString(),
      lastUsed: null,
    };
    const updatedKeys = [...apiKeys, newKey];
    setApiKeys(updatedKeys);
    localStorage.setItem("satelink_api_keys", JSON.stringify(updatedKeys));
  };

  const deleteApiKey = (id: string) => {
    const updatedKeys = apiKeys.filter((k) => k.id !== id);
    setApiKeys(updatedKeys);
    localStorage.setItem("satelink_api_keys", JSON.stringify(updatedKeys));
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveSettings = () => {
    setSaveStatus("saving");
    localStorage.setItem("satelink_node_id", nodeId);
    localStorage.setItem("satelink_wallet", walletAddress);
    localStorage.setItem("satelink_notifications", JSON.stringify(notifications));
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 500);
  };

  return (
    <OsPageTemplate
      title="Settings"
      subtitle="Configure API keys, node settings, and notification preferences."
      metrics={[
        { label: "API Keys", value: String(apiKeys.length) },
        { label: "Node Status", value: nodeId ? "Configured" : "Not Set" },
        { label: "Notifications", value: Object.values(notifications).filter(Boolean).length + "/3" },
        { label: "Tier", value: "Free" },
      ]}
    >
      <div className="space-y-8">
        <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00D1FF]/10">
                <Key className="h-5 w-5 text-[#00D1FF]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">API Keys</h2>
                <p className="text-sm text-[#B0E4CC]/60">Manage your RPC API keys</p>
              </div>
            </div>
            <button
              onClick={createApiKey}
              className="flex items-center gap-2 rounded-lg bg-[#408A71] px-4 py-2 text-sm font-medium text-white hover:bg-[#3b7f68]"
            >
              <Plus className="h-4 w-4" />
              Create New Key
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/20 bg-black/10 p-8 text-center">
              <Key className="mx-auto mb-3 h-8 w-8 text-[#B0E4CC]/30" />
              <p className="text-[#B0E4CC]/60">No API keys yet</p>
              <p className="mt-1 text-sm text-[#B0E4CC]/40">Create a key to access higher rate limits</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-black/30">
                  <tr>
                    <th className="px-4 py-3 font-medium text-[#B0E4CC]/60">Name</th>
                    <th className="px-4 py-3 font-medium text-[#B0E4CC]/60">Key</th>
                    <th className="px-4 py-3 font-medium text-[#B0E4CC]/60">Tier</th>
                    <th className="px-4 py-3 font-medium text-[#B0E4CC]/60">Created</th>
                    <th className="px-4 py-3 font-medium text-[#B0E4CC]/60">Last Used</th>
                    <th className="px-4 py-3 font-medium text-[#B0E4CC]/60">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((apiKey) => (
                    <tr key={apiKey.id} className="border-b border-white/5">
                      <td className="px-4 py-3 text-white">{apiKey.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs text-[#00D1FF]">
                            {showKey === apiKey.id ? apiKey.key : `${apiKey.key.slice(0, 12)}...`}
                          </code>
                          <button
                            onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                            className="text-[#B0E4CC]/50 hover:text-[#B0E4CC]"
                          >
                            {showKey === apiKey.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => copyKey(apiKey.key)}
                            className="text-[#B0E4CC]/50 hover:text-[#B0E4CC]"
                          >
                            {copied === apiKey.key ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#408A71]/20 px-2 py-0.5 text-xs text-[#408A71]">
                          {apiKey.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#B0E4CC]/60">
                        {new Date(apiKey.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-[#B0E4CC]/60">
                        {apiKey.lastUsed ? new Date(apiKey.lastUsed).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteApiKey(apiKey.id)}
                          className="text-red-400/60 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#408A71]/10">
              <Server className="h-5 w-5 text-[#408A71]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Node Configuration</h2>
              <p className="text-sm text-[#B0E4CC]/60">Configure your node identity and payout wallet</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[#B0E4CC]/60">Node ID</label>
              <input
                type="text"
                value={nodeId}
                onChange={(e) => setNodeId(e.target.value)}
                placeholder="NODE-ap-south-1-001"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2.5 text-white placeholder-[#B0E4CC]/30 focus:border-[#408A71] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-[#B0E4CC]/60">Wallet Address (for payouts)</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2.5 font-mono text-sm text-white placeholder-[#B0E4CC]/30 focus:border-[#408A71] focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <Bell className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
              <p className="text-sm text-[#B0E4CC]/60">Configure alerts for revenue events</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { key: "epochClose" as const, label: "Epoch Close Notifications", desc: "Alert when epochs close with revenue" },
              { key: "claimAvailable" as const, label: "Claim Available Notifications", desc: "Alert when earnings are claimable" },
              { key: "nodeOffline" as const, label: "Node Offline Alerts", desc: "Alert when your node goes offline" },
            ].map((pref) => (
              <label key={pref.key} className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-black/10 p-4">
                <div>
                  <p className="text-sm font-medium text-white">{pref.label}</p>
                  <p className="text-xs text-[#B0E4CC]/50">{pref.desc}</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={notifications[pref.key]}
                    onChange={(e) => setNotifications({ ...notifications, [pref.key]: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-white/10 peer-checked:bg-[#408A71]" />
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Globe className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Network Endpoints</h2>
              <p className="text-sm text-[#B0E4CC]/60">RPC and WebSocket connection URLs</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-black/30 px-4 py-3">
              <div>
                <p className="text-xs text-[#B0E4CC]/50">RPC Endpoint</p>
                <code className="text-sm text-[#00D1FF]">https://rpc.satelink.network/rpc/polygon</code>
              </div>
              <button
                onClick={() => copyKey("https://rpc.satelink.network/rpc/polygon")}
                className="text-[#B0E4CC]/50 hover:text-[#B0E4CC]"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-black/30 px-4 py-3">
              <div>
                <p className="text-xs text-[#B0E4CC]/50">WebSocket</p>
                <code className="text-sm text-[#00D1FF]">wss://rpc.satelink.network/rpc/ws/polygon</code>
              </div>
              <button
                onClick={() => copyKey("wss://rpc.satelink.network/rpc/ws/polygon")}
                className="text-[#B0E4CC]/50 hover:text-[#B0E4CC]"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-black/30 px-4 py-3">
              <div>
                <p className="text-xs text-[#B0E4CC]/50">API Base</p>
                <code className="text-sm text-[#00D1FF]">https://rpc.satelink.network</code>
              </div>
              <button
                onClick={() => copyKey("https://rpc.satelink.network")}
                className="text-[#B0E4CC]/50 hover:text-[#B0E4CC]"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saveStatus === "saving"}
            className="flex items-center gap-2 rounded-lg bg-[#408A71] px-6 py-2.5 font-medium text-white hover:bg-[#3b7f68] disabled:opacity-50"
          >
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>
    </OsPageTemplate>
  );
}
