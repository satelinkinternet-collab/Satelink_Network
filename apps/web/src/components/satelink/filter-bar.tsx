'use client';
import { useEffect } from 'react';
import { useDashboardFilters,
         TimeRange, ChainFilter, RevenueType,
         Currency } from '@/lib/stores/dashboard-filters';

const B = (active:boolean) =>
  `text-[10px] px-2.5 py-1 rounded border font-medium cursor-pointer transition-all ${
    active
      ? 'bg-[#408A71] text-[#091413] border-[#408A71]'
      : 'bg-transparent text-[#285A48] border-[#1a3028] hover:border-[#285A48] hover:text-[#B0E4CC]'
  }`;

type FilterGroupProps<T extends string> = {
  label: string;
  value: T;
  options: {value:T; label:string}[];
  onChange: (v:T)=>void;
};

function FG<T extends string>({label,value,options,onChange}:FilterGroupProps<T>) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-[#1a3028] uppercase tracking-widest font-semibold whitespace-nowrap">
        {label}
      </span>
      <div className="flex gap-0.5 flex-wrap">
        {options.map(o=>(
          <button key={o.value} onClick={()=>onChange(o.value)}
                  className={B(value===o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export type FilterPage = 'overview'|'analytics'|'nodes'|'withdraw'|'network'|'all';

export function FilterBar({page}:{page:FilterPage}) {
  const {
    timeRange,setTimeRange,
    chain,setChain,
    revenueType,setRevenueType,
    currency,setCurrency,
    setRates,
  } = useDashboardFilters();

  useEffect(()=>{
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r=>r.json())
      .then(d=>{ if(d.rates) setRates({USD:1,INR:d.rates.INR,EUR:d.rates.EUR,GBP:d.rates.GBP,SGD:d.rates.SGD}); })
      .catch(()=>{});
  },[setRates]);

  const showChain = ['overview','analytics','network','all'].includes(page);
  const showRevType = ['overview','analytics','all'].includes(page);

  return (
    <div className="sticky top-[48px] z-40 border-b border-[#1a3028]
                    bg-[#091413]/95 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2
                      px-5 py-2.5 min-h-[40px]">

        <FG<TimeRange>
          label="Period"
          value={timeRange}
          options={[
            {value:'5m',label:'5m'},{value:'1h',label:'1h'},
            {value:'6h',label:'6h'},{value:'24h',label:'24h'},
            {value:'7d',label:'7d'},{value:'30d',label:'30d'},
          ]}
          onChange={setTimeRange}
        />

        {showChain && (
          <div className="flex items-center gap-1">
            <FG<ChainFilter>
              label="Chain"
              value={chain}
              options={[
                {value:'all',label:'All'},{value:'polygon',label:'Polygon'},
                {value:'ethereum',label:'ETH'},{value:'arbitrum',label:'ARB'},
                {value:'base',label:'Base'},
              ]}
              onChange={setChain}
            />
            {page === 'overview' && (
              <span title="Chain filter applies to Analytics page. Epoch revenue is network-wide across all chains."
                    className="text-[9px] text-[#1a3028] cursor-help ml-1">ⓘ</span>
            )}
          </div>
        )}

        {showRevType && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-[#1a3028] uppercase tracking-widest font-semibold">
              Revenue
            </span>
            <div className="flex gap-0.5">
              <button onClick={()=>setRevenueType('metered')}
                      className={B(revenueType==='metered')}>
                Metered
                {revenueType==='metered'&&<span className="ml-1 opacity-50 text-[8px]">tracked</span>}
              </button>
              <button onClick={()=>setRevenueType('collected')}
                      className={B(revenueType==='collected')}>
                Collected
                {revenueType==='collected'&&<span className="ml-1 opacity-50 text-[8px]">on-chain</span>}
              </button>
            </div>
          </div>
        )}

        {/* Currency — always right side */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[9px] text-[#1a3028] uppercase tracking-widest font-semibold">
            Currency
          </span>
          <div className="flex gap-0.5">
            {(['USD','INR','EUR','GBP','SGD'] as Currency[]).map(c=>(
              <button key={c} onClick={()=>setCurrency(c)}
                      className={B(currency===c)}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue reality warning */}
      {showRevType && revenueType==='metered' && (
        <div className="px-5 py-1.5 bg-[#16140a] border-t border-[#3a3e18]
                        text-[10px] text-[#a0a030] flex items-center gap-2">
          <span>⚠</span>
          <span>
            Metered revenue = economic value tracked by usage · No USDT collected yet ·
            <button onClick={()=>setRevenueType('collected')}
                    className="ml-1 underline hover:text-[#B0E4CC]">
              Switch to Collected
            </button>
          </span>
        </div>
      )}
      {showRevType && revenueType==='collected' && (
        <div className="px-5 py-1.5 bg-[#0a1610] border-t border-[#285A48]
                        text-[10px] text-[#408A71] flex items-center gap-2">
          <span>✓</span>
          <span>Showing real on-chain USDT only · Metered value is higher</span>
        </div>
      )}
    </div>
  );
}
