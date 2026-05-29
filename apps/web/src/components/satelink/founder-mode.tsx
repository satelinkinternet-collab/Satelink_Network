'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle, Database, Cpu, TrendingUp, Wallet } from 'lucide-react';
import { useFounderMode } from '@/lib/stores/founder-mode';
import { useDashboardFilters } from '@/lib/stores/dashboard-filters';

export function FounderModeToggle() {
  const { enabled, toggle, adminToken, setAdminToken, error } = useFounderMode();
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  const handleSubmitToken = () => {
    if (tokenInput.trim()) {
      setAdminToken(tokenInput.trim());
      setShowTokenInput(false);
      setTokenInput('');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          if (!enabled && !adminToken) {
            setShowTokenInput(true);
          } else {
            toggle();
          }
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-medium transition-all ${
          enabled
            ? 'bg-[#2a1a0a] border-[#ff6b00] text-[#ff6b00]'
            : 'bg-transparent border-[#1a3028] text-[#285A48] hover:border-[#285A48] hover:text-[#408A71]'
        }`}
      >
        {enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        <span>Founder Mode</span>
      </button>

      <AnimatePresence>
        {showTokenInput && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-1.5"
          >
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitToken()}
              placeholder="Admin token..."
              className="w-32 px-2 py-1 text-[10px] bg-[#091413] border border-[#1a3028] rounded text-[#B0E4CC] placeholder:text-[#285A48] focus:border-[#408A71] outline-none"
              autoFocus
            />
            <button
              onClick={handleSubmitToken}
              className="px-2 py-1 text-[10px] bg-[#408A71] text-[#091413] rounded font-medium hover:bg-[#4fa07f]"
            >
              Set
            </button>
            <button
              onClick={() => setShowTokenInput(false)}
              className="px-2 py-1 text-[10px] text-[#285A48] hover:text-[#B0E4CC]"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && enabled && (
        <span className="text-[9px] text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </span>
      )}
    </div>
  );
}

export function FounderInsights() {
  const { enabled, diagnostics, economics, loading, error, fetchAll, lastFetch } = useFounderMode();
  const { fmt } = useDashboardFilters();

  useEffect(() => {
    if (enabled && !diagnostics && !loading) {
      fetchAll();
    }
  }, [enabled, diagnostics, loading, fetchAll]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [enabled, fetchAll]);

  if (!enabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gradient-to-r from-[#1a0f05] to-[#0c1a17] border border-[#3a2a1a] rounded-md p-4 mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ff6b00] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#ff6b00] uppercase tracking-wider">
            Founder Diagnostics
          </span>
        </div>
        <div className="flex items-center gap-2">
          {lastFetch && (
            <span className="text-[9px] text-[#3a2a1a]">
              {lastFetch.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-1 text-[#ff6b00] hover:text-[#ff8c40] disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-2 mb-3 text-[10px] text-red-400 flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}

      {loading && !diagnostics && (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {diagnostics && economics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InsightCard
            icon={<Database className="w-3.5 h-3.5" />}
            label="Database"
            value={diagnostics.health.database === 'healthy' ? 'Healthy' : 'Degraded'}
            sub={`${diagnostics.database.latencyMs || 0}ms latency`}
            status={diagnostics.health.database === 'healthy' ? 'good' : 'warn'}
          />
          <InsightCard
            icon={<Cpu className="w-3.5 h-3.5" />}
            label="System"
            value={`${Math.floor(diagnostics.system.uptimeSeconds / 3600)}h uptime`}
            sub={`${diagnostics.system.memoryUsageMb}MB memory`}
            status="good"
          />
          <InsightCard
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            label="Revenue Today"
            value={fmt(economics.revenue.today.usdt)}
            sub={`${economics.revenue.today.events} events`}
            status={economics.revenue.today.usdt > 0 ? 'good' : 'neutral'}
          />
          <InsightCard
            icon={<Wallet className="w-3.5 h-3.5" />}
            label="Projected Monthly"
            value={fmt(economics.insights.projectedMonthly)}
            sub={economics.insights.revenueGrowth !== 'N/A' ? `${economics.insights.revenueGrowth} growth` : 'Building...'}
            status={economics.insights.projectedMonthly > 0 ? 'good' : 'neutral'}
          />
        </div>
      )}

      {diagnostics && (
        <div className="mt-3 pt-3 border-t border-[#3a2a1a] flex items-center justify-between text-[9px]">
          <span className="text-[#5a4a3a]">
            {diagnostics.counts.nodes} nodes · {diagnostics.counts.epochs} epochs · {fmt(diagnostics.counts.totalRevenueUsdt)} total
          </span>
          <span className="text-[#5a4a3a]">
            API: {diagnostics.responseTimeMs}ms
          </span>
        </div>
      )}
    </motion.div>
  );
}

function InsightCard({
  icon,
  label,
  value,
  sub,
  status
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  status: 'good' | 'warn' | 'neutral';
}) {
  const statusColors = {
    good: 'text-[#408A71]',
    warn: 'text-[#ff6b00]',
    neutral: 'text-[#285A48]'
  };

  return (
    <div className="bg-[#091413]/50 border border-[#2a1a0a] rounded p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[#ff6b00]">{icon}</span>
        <span className="text-[9px] text-[#5a4a3a] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-[14px] font-semibold font-mono ${statusColors[status]}`}>
        {value}
      </p>
      <p className="text-[9px] text-[#3a2a1a] mt-0.5">{sub}</p>
    </div>
  );
}

export function FounderModeBar() {
  const { enabled } = useFounderMode();

  if (!enabled) return null;

  return (
    <div className="bg-gradient-to-r from-[#2a1a0a] via-[#1a0f05] to-[#2a1a0a] border-b border-[#3a2a1a] px-4 py-1.5">
      <div className="flex items-center justify-center gap-2 text-[10px] text-[#ff6b00]">
        <Eye className="w-3 h-3" />
        <span>Founder Mode Active — Real-time platform diagnostics enabled</span>
      </div>
    </div>
  );
}
