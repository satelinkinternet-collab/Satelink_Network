'use client';

import { useEffect, useState } from 'react';
import { getEpochs, type EpochData } from '@/lib/api/satelink-api';

export default function EpochManagerPage() {
  const [epochs, setEpochs] = useState<EpochData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getEpochs();
        setEpochs(data);
      } catch (err) {
        console.error('Failed to load epochs:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalRevenue = epochs.reduce((sum, e) => sum + (e.total || 0), 0);
  const epochsWithRevenue = epochs.filter((e) => e.total > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-[#B0E4CC]">Epoch Manager</h1>
          <p className="text-[11px] text-[#285A48] mt-0.5">
            Revenue settlement history · 60s epochs
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider">Total Revenue</p>
          <p className="text-[16px] font-bold font-mono text-[#00D1FF]">${totalRevenue.toFixed(6)}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider">Total Epochs</p>
          <p className="text-[18px] font-semibold font-mono text-[#B0E4CC] mt-1">{epochs.length}</p>
        </div>
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider">With Revenue</p>
          <p className="text-[18px] font-semibold font-mono text-[#408A71] mt-1">{epochsWithRevenue.length}</p>
        </div>
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider">Avg / Epoch</p>
          <p className="text-[18px] font-semibold font-mono text-[#00D1FF] mt-1">
            ${epochs.length > 0 ? (totalRevenue / epochs.length).toFixed(6) : '0.000000'}
          </p>
        </div>
      </div>

      {/* Epoch table */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a3028]">
          <p className="text-[12px] font-medium text-[#B0E4CC]">Epoch History</p>
          <p className="text-[10px] text-[#285A48] mt-0.5">50/30/20 revenue split</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#285A48] border-t-[#408A71] rounded-full animate-spin" />
          </div>
        ) : epochs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[11px] text-[#285A48]">No epochs recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#0c1a17]">
                <tr className="border-b border-[#1a3028]">
                  {['Epoch', 'Revenue', 'Node Pool (50%)', 'Platform (30%)', 'Distrib (20%)', 'Requests', 'Status', 'Closed'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-[9px] font-semibold text-[#285A48] uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {epochs.map((e, i) => {
                  const rev = e.total || 0;
                  const hasRev = rev > 0;
                  const nodePool = rev * 0.5;
                  const platform = rev * 0.3;
                  const distrib = rev * 0.2;
                  return (
                    <tr key={i} className="border-b border-[#0f1d15] hover:bg-[#0f1e17] transition-colors">
                      <td className="px-3 py-2 font-mono text-[11px] text-[#B0E4CC]">
                        #{e.epoch_id ?? 'pending'}
                      </td>
                      <td className={`px-3 py-2 font-mono text-[11px] ${hasRev ? 'text-[#00D1FF]' : 'text-[#285A48]'}`}>
                        ${rev.toFixed(6)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[#408A71]">${nodePool.toFixed(6)}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[#408A71]">${platform.toFixed(6)}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[#408A71]">${distrib.toFixed(6)}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[#285A48]">{e.requests}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
                            hasRev
                              ? 'bg-[#0f2e1a] text-[#408A71] border-[#285A48]'
                              : 'bg-[#0f1510] text-[#285A48] border-[#1a2e25]'
                          }`}
                        >
                          {hasRev ? '● REVENUE' : '○ EMPTY'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-[#285A48]">
                        {(e as any).closed_at ? new Date((e as any).closed_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
