import { create } from 'zustand';

interface FounderModeState {
  enabled: boolean;
  adminToken: string;
  lastFetch: Date | null;
  diagnostics: DiagnosticsData | null;
  economics: EconomicsData | null;
  loading: boolean;
  error: string | null;
  toggle: () => void;
  setAdminToken: (token: string) => void;
  fetchDiagnostics: () => Promise<void>;
  fetchEconomics: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

interface DiagnosticsData {
  ok: boolean;
  timestamp: string;
  system: {
    uptimeSeconds: number;
    memoryUsageMb: number;
    nodeVersion: string;
    platform: string;
  };
  database: { ok: boolean; latencyMs?: number };
  counts: {
    nodes: number;
    epochs: number;
    totalRevenueUsdt: number;
  };
  health: {
    database: string;
    api: string;
    settlement: string;
  };
  responseTimeMs: number;
}

interface EconomicsData {
  ok: boolean;
  timestamp: string;
  revenue: {
    today: { usdt: number; events: number };
    week: { usdt: number; events: number };
    allTime: { usdt: number; events: number };
  };
  distribution: {
    nodeOperators: { percentage: number; usdt: number };
    platformFee: { percentage: number; usdt: number };
    distributionPool: { percentage: number; usdt: number };
  };
  insights: {
    avgDailyRevenue: number;
    projectedMonthly: number;
    revenueGrowth: string;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://rpc.satelink.network';

function loadSavedState() {
  if (typeof window === 'undefined') return { enabled: false, adminToken: '' };
  try {
    const saved = localStorage.getItem('sl_founder_mode');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { enabled: parsed.enabled || false, adminToken: parsed.adminToken || '' };
    }
  } catch {}
  return { enabled: false, adminToken: '' };
}

function persist(state: { enabled: boolean; adminToken: string }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('sl_founder_mode', JSON.stringify(state));
  } catch {}
}

export const useFounderMode = create<FounderModeState>((set, get) => {
  const saved = loadSavedState();
  return {
    enabled: saved.enabled,
    adminToken: saved.adminToken,
    lastFetch: null,
    diagnostics: null,
    economics: null,
    loading: false,
    error: null,

    toggle: () => {
      const newEnabled = !get().enabled;
      set({ enabled: newEnabled });
      persist({ enabled: newEnabled, adminToken: get().adminToken });
      if (newEnabled && get().adminToken) {
        get().fetchAll();
      }
    },

    setAdminToken: (token: string) => {
      set({ adminToken: token, error: null });
      persist({ enabled: get().enabled, adminToken: token });
      if (get().enabled && token) {
        get().fetchAll();
      }
    },

    fetchDiagnostics: async () => {
      const { adminToken } = get();
      if (!adminToken) {
        set({ error: 'Admin token required' });
        return;
      }

      set({ loading: true, error: null });
      try {
        const res = await fetch(`${API_BASE}/api/admin/mal/diagnostics`, {
          headers: { 'X-Admin-Token': adminToken }
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        set({ diagnostics: data, lastFetch: new Date(), loading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Fetch failed', loading: false });
      }
    },

    fetchEconomics: async () => {
      const { adminToken } = get();
      if (!adminToken) {
        set({ error: 'Admin token required' });
        return;
      }

      set({ loading: true, error: null });
      try {
        const res = await fetch(`${API_BASE}/api/admin/mal/economics`, {
          headers: { 'X-Admin-Token': adminToken }
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        set({ economics: data, lastFetch: new Date(), loading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Fetch failed', loading: false });
      }
    },

    fetchAll: async () => {
      const { adminToken } = get();
      if (!adminToken) {
        set({ error: 'Admin token required' });
        return;
      }

      set({ loading: true, error: null });
      try {
        const [diagRes, econRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/mal/diagnostics`, {
            headers: { 'X-Admin-Token': adminToken }
          }),
          fetch(`${API_BASE}/api/admin/mal/economics`, {
            headers: { 'X-Admin-Token': adminToken }
          })
        ]);

        if (!diagRes.ok || !econRes.ok) {
          const errorRes = !diagRes.ok ? diagRes : econRes;
          const data = await errorRes.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${errorRes.status}`);
        }

        const [diagnostics, economics] = await Promise.all([
          diagRes.json(),
          econRes.json()
        ]);

        set({ diagnostics, economics, lastFetch: new Date(), loading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Fetch failed', loading: false });
      }
    }
  };
});
