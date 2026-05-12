export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("sat_live_xxxxxxxxxxxxxxxxxxxxxxxx");
  const [showKey, setShowKey] = useState(false);
  const [notifications, setNotifications] = useState({
    epochClose: true,
    claimAvailable: true,
    networkAlerts: false,
    weeklyReport: true,
  });
  const [walletAddress, setWalletAddress] = useState("");
  const [saved, setSaved] = useState(false);

  const regenerateKey = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const newKey = "sat_live_" + Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setApiKey(newKey);
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 bg-[#091413] min-h-screen max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#B0E4CC]">Settings</h1>
        <p className="text-[#408A71] text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {/* API Key Section */}
        <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-6">
          <h2 className="text-lg font-bold text-[#B0E4CC] mb-4">API Key</h2>
          <p className="text-sm text-[#408A71] mb-4">Use this key to authenticate API requests. Keep it secret.</p>
          <div className="flex gap-3">
            <div className="flex-1 bg-[#0a1816] border border-[#285A48] rounded-lg px-4 py-3 font-mono text-sm text-[#B0E4CC] overflow-hidden">
              {showKey ? apiKey : apiKey.replace(/./g, (c, i) => i < 9 ? c : "•")}
            </div>
            <button
              onClick={() => setShowKey(!showKey)}
              className="px-4 py-2 bg-[#285A48] text-[#B0E4CC] rounded-lg text-sm hover:bg-[#408A71] transition-colors"
            >
              {showKey ? "Hide" : "Show"}
            </button>
            <button
              onClick={regenerateKey}
              className="px-4 py-2 bg-[#0a1816] border border-[#408A71] text-[#408A71] rounded-lg text-sm hover:bg-[#285A48] hover:text-[#B0E4CC] transition-colors"
            >
              Regenerate
            </button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-6">
          <h2 className="text-lg font-bold text-[#B0E4CC] mb-4">Notifications</h2>
          <div className="space-y-4">
            {[
              { key: "epochClose", label: "Epoch Close Alerts", desc: "Get notified when epochs close" },
              { key: "claimAvailable", label: "Claim Available", desc: "Alert when rewards are claimable" },
              { key: "networkAlerts", label: "Network Alerts", desc: "Critical network status updates" },
              { key: "weeklyReport", label: "Weekly Report", desc: "Summary of your node performance" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-[#B0E4CC] font-medium">{item.label}</div>
                  <div className="text-xs text-[#408A71]">{item.desc}</div>
                </div>
                <button
                  onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications[item.key as keyof typeof notifications] ? "bg-[#408A71]" : "bg-[#285A48]"
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications[item.key as keyof typeof notifications] ? "translate-x-6" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Wallet Section */}
        <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-6">
          <h2 className="text-lg font-bold text-[#B0E4CC] mb-4">Payout Wallet</h2>
          <p className="text-sm text-[#408A71] mb-4">Polygon address for USDT settlement payouts</p>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
            className="w-full bg-[#0a1816] border border-[#285A48] rounded-lg px-4 py-3 text-[#B0E4CC] placeholder-[#408A71] font-mono text-sm focus:outline-none focus:border-[#00D1FF]"
          />
        </div>

        {/* Account Info */}
        <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-6">
          <h2 className="text-lg font-bold text-[#B0E4CC] mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#408A71]">Plan</span>
              <span className="text-[#B0E4CC]">Beta Access</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#408A71]">Rate Limit</span>
              <span className="text-[#B0E4CC]">1,000 req/day (free tier)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#408A71]">Member Since</span>
              <span className="text-[#B0E4CC]">May 2026</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-[#408A71] text-[#091413] font-bold rounded-lg hover:bg-[#285A48] hover:shadow-[0_0_20px_rgba(0,209,255,0.3)] transition-all"
        >
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
