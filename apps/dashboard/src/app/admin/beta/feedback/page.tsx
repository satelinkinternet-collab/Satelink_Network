
"use client";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BetaFeedbackPage() {
    const [feedback, setFeedback] = useState<any[]>([]);

    const fetchFeedback = async () => {
        try {
            const res = await fetch('/api/proxy?path=/admin/beta/feedback');
            const data = await res.json();
            if (data.ok) setFeedback(data.feedback);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { fetchFeedback(); }, []);

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-6">Beta Feedback</h1>

            <div className="grid gap-4">
                {feedback.map((f) => (
                    <Card key={f.id} className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={f.category === 'bug' ? 'destructive' : 'secondary'}>
                                            {f.category}
                                        </Badge>
                                        <Badge variant="outline" className={`
                                            ${f.severity === 'high' ? 'border-red-500 text-red-500' :
                                                f.severity === 'med' ? 'border-yellow-500 text-yellow-500' :
                                                    'border-blue-500 text-blue-500'}
                                        `}>
                                            {f.severity}
                                        </Badge>
                                        <span className="text-xs text-zinc-500 ml-2">
                                            {new Date(f.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <CardTitle className="text-base text-zinc-200 mt-2">
                                        {f.message}
                                    </CardTitle>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-zinc-500 font-mono">{f.wallet?.substring(0, 8)}...</div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-zinc-400 space-y-2">
                                <div>Page: <span className="text-zinc-300">{f.page_url}</span></div>
                                {f.trace_id && (
                                    <div className="bg-zinc-950 p-2 rounded text-xs font-mono border border-zinc-800">
                                        <div>Trace ID: {f.trace_id}</div>
                                        {f.trace_summary && (
                                            <div className="flex gap-2 mt-1">
                                                <span className={f.trace_summary.status_code >= 400 ? 'text-red-400' : 'text-green-400'}>
                                                    {f.trace_summary.status_code}
                                                </span>
                                                <span>{f.trace_summary.duration_ms}ms</span>
                                                <span className="text-zinc-500">{f.trace_summary.route}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
