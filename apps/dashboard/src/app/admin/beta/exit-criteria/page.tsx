"use client";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { PageHeader, ErrorBanner } from '@/components/admin/admin-shared';
import api from '@/lib/api';

interface Criteria {
    key: string;
    label: string;
    current: number;
    target: number;
    unit: string;
    status: 'pass' | 'fail' | 'warn';
}

export default function ExitCriteriaPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [criteria, setCriteria] = useState<Criteria[]>([]);
    const [overallStatus, setOverallStatus] = useState<'NOT_READY' | 'READY'>('NOT_READY');

    useEffect(() => {
        fetchCriteria();
    }, []);

    const fetchCriteria = async () => {
        try {
            const res = await api.get('/admin/beta/exit-criteria');
            if (res.data.ok) {
                setCriteria(res.data.criteria);
                setOverallStatus(res.data.overall);
            }
        } catch (e: any) {
            console.error('[ExitCriteria]', e);
            setError(e.response?.data?.error || 'Failed to load exit criteria');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
            <PageHeader
                title="Beta Exit Criteria"
                subtitle="Readiness for Public Mainnet Launch"
            />
            {error && <ErrorBanner message={error} onRetry={fetchCriteria} />}

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-white">Launch Readiness</CardTitle>
                        <Badge className={`${overallStatus === 'READY' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                            {overallStatus}
                        </Badge>
                    </div>
                    <CardDescription className="text-zinc-400">
                        All criteria must be met to exit Beta phase.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {loading ? <div className="text-zinc-500">Calculating...</div> : criteria.map((c) => (
                        <div key={c.key} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-300 font-medium">{c.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-zinc-400">{c.current} / {c.target} {c.unit}</span>
                                    {c.status === 'pass' && <CheckCircle2 className="text-green-500 w-4 h-4" />}
                                    {c.status === 'fail' && <XCircle className="text-red-500 w-4 h-4" />}
                                    {c.status === 'warn' && <AlertTriangle className="text-yellow-500 w-4 h-4" />}
                                </div>
                            </div>
                            <Progress value={Math.min(100, (c.current / c.target) * 100)} className="h-2 bg-zinc-800" indicatorClassName={
                                c.status === 'pass' ? 'bg-green-500' : c.status === 'warn' ? 'bg-yellow-500' : 'bg-red-500'
                            } />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
