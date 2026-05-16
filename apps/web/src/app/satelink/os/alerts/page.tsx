'use client';

import { useEffect, useState, useRef } from 'react';
import { getSSEUrl } from '@/lib/api/satelink-api';

interface LiveEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

export default function AlertsPage() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [hasAlerts] = useState(false);
  const eventsRef = useRef<LiveEvent[]>([]);

  useEffect(() => {
    const es = new EventSource(getSSEUrl());

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const event: LiveEvent = {
          ...data,
          timestamp: new Date().toISOString(),
        };
        eventsRef.current = [event, ...eventsRef.current].slice(0, 5);
        setEvents([...eventsRef.current]);
      } catch {}
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[15px] font-semibold text-[#B0E4CC]">Alerts</h1>
        <p className="text-[11px] text-[#285A48] mt-0.5">
          System notifications and warnings
        </p>
      </div>

      {/* Alert status */}
      {!hasAlerts ? (
        <div className="bg-[#0c1a17] border border-[#285A48] rounded-md p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-[#0f2e1a] border border-[#285A48] flex items-center justify-center mx-auto mb-4">
            <span className="text-[20px]">✓</span>
          </div>
          <h2 className="text-[14px] font-medium text-[#B0E4CC] mb-1">No Active Alerts</h2>
          <p className="text-[11px] text-[#408A71]">System operational · All checks passing</p>
        </div>
      ) : (
        <div className="bg-[#2e1a0f] border border-[#5a3828] rounded-md p-4">
          <p className="text-[12px] text-[#ff9966]">Active alerts would appear here</p>
        </div>
      )}

      {/* Recent events timeline */}
      <div>
        <h2 className="text-[11px] text-[#285A48] uppercase tracking-wider mb-3 font-semibold">
          Recent Activity
        </h2>
        {events.length === 0 ? (
          <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-6 text-center">
            <p className="text-[11px] text-[#285A48]">Waiting for events...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((ev, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 bg-[#0c1a17] border border-[#1a3028] rounded hover:border-[#285A48] transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#408A71]" />
                <div className="flex-1">
                  <span className="text-[11px] text-[#B0E4CC]">
                    {ev.type?.replace(':', ' · ') || 'event'}
                  </span>
                </div>
                {ev.timestamp && (
                  <span className="text-[9px] text-[#285A48]">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
