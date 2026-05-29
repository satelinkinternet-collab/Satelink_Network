'use client';
import { useState, useEffect, useRef } from 'react';
import { useDashboardFilters } from '@/lib/stores/dashboard-filters';

const API = 'https://rpc.satelink.network';

type EventType = 'all' | 'revenue' | 'epoch' | 'error' | 'node';

export default function EventsPage() {
  const { fmt } = useDashboardFilters();
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState<EventType>('all');
  const [connected, setConnected] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`${API}/os/events`);

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        const event = {
          ...d,
          id: Date.now() + Math.random(),
          ts: new Date().toISOString(),
          type: d.type || (d.amount_usdt ? 'revenue' : 'system'),
        };
        setEvents(prev => [event, ...prev].slice(0, 500));
        setTotalEvents(n => n + 1);
        if (d.amount_usdt) setTotalRevenue(n => n + parseFloat(d.amount_usdt));
      } catch {}
    };

    return () => es.close();
  }, []);

  const filtered = filter === 'all'
    ? events
    : events.filter(e => e.type === filter);

  const typeColor: Record<string, string> = {
    revenue: '#408A71',
    epoch: '#00D1FF',
    error: '#c04040',
    node: '#a0a030',
    system: '#285A48',
  };

  const FBtn = ({ t, label }: { t: EventType; label: string }) => (
    <button onClick={() => setFilter(t)}
            className={`text-[10px] px-3 py-1.5 rounded border font-semibold
                        transition-all ${
      filter === t
        ? 'bg-[#408A71] text-[#091413] border-[#408A71]'
        : 'bg-transparent text-[#285A48] border-[#1a3028] hover:border-[#285A48]'
    }`}>
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#091413]">
      {/* Header */}
      <div className="flex items-center justify-between
                      px-5 py-3 border-b border-[#1a3028]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              connected ? 'bg-[#00D1FF] animate-pulse' : 'bg-[#c04040]'
            }`} />
            <span className="text-[11px] font-semibold text-[#B0E4CC]">
              Live Event Stream
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#285A48]">
            {totalEvents.toLocaleString()} total
          </span>
          <span className="text-[10px] font-mono text-[#408A71]">
            +{fmt(totalRevenue)} this session
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5">
          <FBtn t="all" label="All" />
          <FBtn t="revenue" label="Revenue" />
          <FBtn t="epoch" label="Epoch" />
          <FBtn t="node" label="Node" />
          <FBtn t="error" label="Errors" />
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 gap-2 px-5 py-1.5
                      border-b border-[#1a3028] text-[9px]
                      text-[#285A48] uppercase tracking-widest font-semibold">
        <span className="col-span-1">Type</span>
        <span className="col-span-2">Time</span>
        <span className="col-span-3">Method / Event</span>
        <span className="col-span-2">Chain</span>
        <span className="col-span-2">Amount</span>
        <span className="col-span-2">Node</span>
      </div>

      {/* Event rows */}
      <div ref={scrollRef}
           className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-3 h-3 rounded-full bg-[#408A71] animate-pulse" />
            <p className="text-[11px] text-[#285A48]">
              {connected ? 'Waiting for events...' : 'Connecting to SSE...'}
            </p>
          </div>
        ) : (
          filtered.map((ev) => (
            <div key={ev.id}
                 className="grid grid-cols-12 gap-2 px-5 py-2
                            border-b border-[#0f2318] hover:bg-[#0c1a17]
                            transition-colors text-[10px] font-mono">
              <div className="col-span-1 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: typeColor[ev.type] || '#285A48' }} />
              </div>
              <span className="col-span-2 text-[#285A48]">
                {new Date(ev.ts).toLocaleTimeString('en', {
                  hour12: false, hour: '2-digit',
                  minute: '2-digit', second: '2-digit'
                })}
              </span>
              <span className="col-span-3 text-[#B0E4CC] truncate">
                {ev.method || ev.type || 'event'}
              </span>
              <span className="col-span-2 text-[#285A48]">
                {ev.chain || 'polygon'}
              </span>
              <span className="col-span-2"
                    style={{ color: typeColor[ev.type] || '#285A48' }}>
                {ev.amount_usdt ? `+${fmt(parseFloat(ev.amount_usdt))}` : '—'}
              </span>
              <span className="col-span-2 text-[#285A48] truncate text-[9px]">
                {ev.node_id?.slice(-8) || 'ap-south-1'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
