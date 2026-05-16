'use client';

import { useEffect, useState, useRef } from 'react';
import { getSSEUrl } from '@/lib/api/satelink-api';

interface LiveEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

type EventFilter = 'all' | 'revenue' | 'epoch' | 'node' | 'claim' | 'error';

const FILTER_COLORS: Record<EventFilter, string> = {
  all: '#B0E4CC',
  revenue: '#00D1FF',
  epoch: '#408A71',
  node: '#285A48',
  claim: '#00D1FF',
  error: '#ff6b6b',
};

export default function LiveEventsPage() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [filter, setFilter] = useState<EventFilter>('all');
  const [connected, setConnected] = useState(false);
  const eventsRef = useRef<LiveEvent[]>([]);

  useEffect(() => {
    const es = new EventSource(getSSEUrl());

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const event: LiveEvent = {
          ...data,
          timestamp: new Date().toISOString(),
        };
        eventsRef.current = [event, ...eventsRef.current].slice(0, 200);
        setEvents([...eventsRef.current]);
      } catch {}
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => es.close();
  }, []);

  const filteredEvents = events.filter((ev) => {
    if (filter === 'all') return true;
    const type = ev.type?.toLowerCase() || '';
    return type.includes(filter);
  });

  const getEventColor = (type: string) => {
    if (type.includes('revenue')) return '#00D1FF';
    if (type.includes('epoch')) return '#408A71';
    if (type.includes('node')) return '#285A48';
    if (type.includes('claim')) return '#00D1FF';
    if (type.includes('error')) return '#ff6b6b';
    return '#408A71';
  };

  return (
    <div className="min-h-screen bg-[#091413]">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-[#1a3028] bg-[#091413]/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#B0E4CC]">Live Events</h1>
            <span className={`flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded border ${
              connected
                ? 'bg-[#0f2e1a] text-[#00D1FF] border-[#285A48]'
                : 'bg-[#1a1a0f] text-[#a0a030] border-[#3a3e18]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#00D1FF] animate-pulse' : 'bg-[#a0a030]'}`} />
              {connected ? 'SSE CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <span className="text-[10px] text-[#285A48]">{events.length} events captured</span>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 px-5 pb-3">
          {(['all', 'revenue', 'epoch', 'node', 'claim', 'error'] as EventFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] px-2.5 py-1 rounded border font-medium transition-all ${
                filter === f
                  ? 'bg-[#408A71] text-[#091413] border-[#408A71]'
                  : 'bg-transparent text-[#285A48] border-[#1a3028] hover:border-[#285A48] hover:text-[#B0E4CC]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Event stream */}
      <div className="p-5">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#285A48] border-t-[#408A71] rounded-full animate-spin mb-4" />
            <p className="text-[12px] text-[#408A71]">Waiting for events...</p>
            <p className="text-[10px] text-[#285A48] mt-1">Send an RPC request to generate one</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredEvents.map((ev, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-2.5 bg-[#0c1a17] border border-[#1a3028] rounded hover:border-[#285A48] transition-colors"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: getEventColor(ev.type || '') }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-medium text-[#B0E4CC]">
                      {ev.type?.replace(':', ' · ') || 'unknown'}
                    </span>
                    {ev.timestamp && (
                      <span className="text-[9px] text-[#285A48]">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {ev.data && (
                    <div className="text-[10px] text-[#408A71] font-mono">
                      {'amount_usdt' in ev.data && ev.data.amount_usdt && (
                        <span className="text-[#00D1FF]">${parseFloat(String(ev.data.amount_usdt)).toFixed(6)} </span>
                      )}
                      {'method' in ev.data && ev.data.method && <span>method: {String(ev.data.method)} </span>}
                      {'epoch_id' in ev.data && ev.data.epoch_id && <span>epoch: #{String(ev.data.epoch_id)} </span>}
                      {'node_id' in ev.data && ev.data.node_id && <span>node: {String(ev.data.node_id)} </span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
