
"use client";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

export default function DailyReportsPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchReports = async () => {
        try {
            const res = await fetch('/api/proxy?path=/admin-api/ops/reports/daily');
            const data = await res.json();
            if (data.ok) setReports(data.reports);
        } catch (e) {
            console.error(e);
        }
    };

    const generateReport = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/proxy?path=/admin-api/ops/reports/generate', { method: 'POST' });
            const data = await res.json();
            if (data.ok) {
                toast.success("Report generated!");
                fetchReports();
            } else {
                toast.error("Failed to generate report");
            }
        } catch (e) {
            toast.error("Error generating report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, []);

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Daily Ops Reports</h1>
                    <p className="text-zinc-400 mt-1">Automated daily summary of system health and activity.</p>
                </div>
                <Button onClick={generateReport} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                    {loading ? 'Generating...' : 'Generate Now'}
                </Button>
            </div>

            <div className="grid gap-6">
                {reports.map((r) => (
                    <Card key={r.id} className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between">
                                <CardTitle className="text-lg font-medium text-white">
                                    Report #{r.id} • {new Date(r.created_at * 1000).toLocaleDateString()}
                                </CardTitle>
                                <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                                    {new Date(r.start_ts * 1000).toLocaleTimeString()} - {new Date(r.end_ts * 1000).toLocaleTimeString()}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                                <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                                    <div className="text-xs text-zinc-500 uppercase">Errors</div>
                                    <div className="text-2xl font-bold text-red-500">{r.error_count}</div>
                                </div>
                                <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                                    <div className="text-xs text-zinc-500 uppercase">Slow Queries</div>
                                    <div className="text-2xl font-bold text-yellow-500">{r.slow_query_count}</div>
                                </div>
                                <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                                    <div className="text-xs text-zinc-500 uppercase">Incidents</div>
                                    <div className="text-2xl font-bold text-orange-500">{r.incident_count}</div>
                                </div>
                                <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                                    <div className="text-xs text-zinc-500 uppercase">Active Beta Users</div>
                                    <div className="text-2xl font-bold text-indigo-500">{r.beta_user_count}</div>
                                </div>
                                <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                                    <div className="text-xs text-zinc-500 uppercase">Invites Left</div>
                                    <div className="text-2xl font-bold text-green-500">{r.active_invites}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-semibold text-zinc-400 mb-2">Top Errors</h4>
                                    <div className="space-y-2">
                                        {r.top_errors?.length > 0 ? r.top_errors.map((e: any, i: number) => (
                                            <div key={i} className="text-xs p-2 bg-zinc-950 border border-zinc-800 rounded flex justify-between">
                                                <span className="truncate pr-2 text-zinc-300">{e.message}</span>
                                                <span className="font-mono text-red-400 ml-auto">{e.count}</span>
                                            </div>
                                        )) : <div className="text-xs text-zinc-600">No errors recorded.</div>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-zinc-400 mb-2">Top Slow Queries</h4>
                                    <div className="space-y-2">
                                        {r.top_slow_queries?.length > 0 ? r.top_slow_queries.map((q: any, i: number) => (
                                            <div key={i} className="text-xs p-2 bg-zinc-950 border border-zinc-800 rounded flex justify-between">
                                                <span className="truncate pr-2 text-zinc-300 max-w-[200px]">{q.sample_sql}</span>
                                                <span className="font-mono text-yellow-400 ml-auto">{Math.round(q.avg_ms)}ms</span>
                                            </div>
                                        )) : <div className="text-xs text-zinc-600">No slow queries.</div>}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
