import { create } from 'zustand';

export type TimeRange = '5m'|'1h'|'6h'|'24h'|'7d'|'30d';
export type ChainFilter = 'all'|'polygon'|'ethereum'|'arbitrum'|'base';
export type RevenueType = 'metered'|'collected';
export type Currency = 'USD'|'INR'|'EUR'|'GBP'|'SGD';
export type TrafficSource = 'all'|'public'|'api_key'|'bot'|'unknown';

const SYMBOLS: Record<Currency,string> = {
  USD:'$', INR:'₹', EUR:'€', GBP:'£', SGD:'S$'
};

const DEFAULT_RATES: Record<Currency,number> = {
  USD:1, INR:84.5, EUR:0.92, GBP:0.79, SGD:1.34
};

interface DashboardFilters {
  timeRange: TimeRange;
  chain: ChainFilter;
  revenueType: RevenueType;
  currency: Currency;
  trafficSource: TrafficSource;
  rates: Record<Currency,number>;
  setTimeRange: (t:TimeRange)=>void;
  setChain: (c:ChainFilter)=>void;
  setRevenueType: (r:RevenueType)=>void;
  setCurrency: (c:Currency)=>void;
  setTrafficSource: (s:TrafficSource)=>void;
  setRates: (r:Record<Currency,number>)=>void;
  fmt: (usd:number)=>string;
  sym: ()=>string;
}

function loadSaved() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('sl_filters')||'{}'); }
  catch { return {}; }
}

function persist(key:string, val:string) {
  if (typeof window === 'undefined') return;
  try {
    const cur = JSON.parse(localStorage.getItem('sl_filters')||'{}');
    localStorage.setItem('sl_filters', JSON.stringify({...cur,[key]:val}));
  } catch {}
}

export const useDashboardFilters = create<DashboardFilters>((set,get) => {
  const saved = loadSaved();
  return {
    timeRange: saved.timeRange || '24h',
    chain: saved.chain || 'all',
    revenueType: saved.revenueType || 'metered',
    currency: saved.currency || 'USD',
    trafficSource: saved.trafficSource || 'all',
    rates: DEFAULT_RATES,

    setTimeRange: (timeRange) => { set({timeRange}); persist('timeRange',timeRange); },
    setChain: (chain) => { set({chain}); persist('chain',chain); },
    setRevenueType: (revenueType) => { set({revenueType}); persist('revenueType',revenueType); },
    setCurrency: (currency) => { set({currency}); persist('currency',currency); },
    setTrafficSource: (trafficSource) => { set({trafficSource}); persist('trafficSource',trafficSource); },
    setRates: (rates) => set({rates}),

    fmt: (usd:number) => {
      const {currency,rates} = get();
      const v = usd * (rates[currency]||1);
      const s = SYMBOLS[currency];
      if (v===0) return `${s}0.00`;
      if (v<0.001) return `${s}${v.toFixed(6)}`;
      if (v<1) return `${s}${v.toFixed(4)}`;
      if (v<1000) return `${s}${v.toFixed(2)}`;
      return `${s}${v.toLocaleString('en',{maximumFractionDigits:2})}`;
    },
    sym: () => SYMBOLS[get().currency]||'$',
  };
});
