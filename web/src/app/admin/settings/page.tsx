"use client";
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [rateLimits, setRateLimits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/admin-api/settings');
        if (res.data?.ok) {
          setFeatureFlags(res.data.featureFlags || []);
          setRateLimits(res.data.rateLimits || []);
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleFlag = async (key: string, current: boolean) => {
    setSaving(key);
    try {
      await api.post('/admin-api/settings', { key, value: current ? '0' : '1' });
      setFeatureFlags(prev => prev.map(f => f.key === key ? { ...f, value: !current } : f));
      toast.success('Setting updated');
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSaving(null);
    }
  };

  const updateRateLimit = async (key: string, value: string) => {
    setSaving(key);
    try {
      await api.post('/admin-api/settings', { key, value });
      toast.success('Rate limit updated');
    } catch {
      toast.error('Failed to update rate limit');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Admin Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Feature flags and rate limit configuration</p>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading...</p>}

      {!loading && (
        <>
          <Card className="bg-zinc-900/80 border-zinc-800/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-300">Feature Flags</CardTitle>
              <CardDescription className="text-xs text-zinc-600">Toggle system-wide features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-zinc-800/60">
                {featureFlags.map((f: any) => (
                  <div key={f.key} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{f.label}</p>
                      <p className="text-xs text-zinc-500 font-mono">{f.key}</p>
                    </div>
                    <button
                      onClick={() => toggleFlag(f.key, f.value)}
                      disabled={saving === f.key}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                        f.value ? 'bg-emerald-500' : 'bg-zinc-700'
                      } ${saving === f.key ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${f.value ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-300">Rate Limits</CardTitle>
              <CardDescription className="text-xs text-zinc-600">Editable rate limit configs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-zinc-800/60">
                {rateLimits.map((r: any) => (
                  <div key={r.key} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200">{r.label}</p>
                      <p className="text-xs text-zinc-500 font-mono">{r.key}</p>
                    </div>
                    <input
                      type="number"
                      defaultValue={r.value}
                      onBlur={e => updateRateLimit(r.key, e.target.value)}
                      disabled={saving === r.key}
                      className="w-24 px-2 py-1 text-sm text-zinc-200 bg-zinc-800 border border-zinc-700 rounded focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
