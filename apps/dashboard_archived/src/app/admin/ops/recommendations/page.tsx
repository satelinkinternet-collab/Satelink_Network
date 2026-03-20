'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle, XCircle, Play } from 'lucide-react';

export default function RecommendationsPage() {
    const [recs, setRecs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchRecs();
    }, []);

    const fetchRecs = async () => {
        try {
            const res = await fetch('/api/admin/ops/recommendations?status=pending');
            const data = await res.json();
            setRecs(data.recommendations || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, action: 'accept' | 'reject') => {
        setProcessing(id);
        try {
            await fetch(`/api/admin/ops/recommendations/${id}/${action}`, { method: 'POST' });
            await fetchRecs();
        } catch (err) {
            console.error(err);
        } finally {
            setProcessing(null);
        }
    };

    const triggerAnalysis = async () => {
        await fetch('/api/admin/trigger', { method: 'POST' });
        setTimeout(fetchRecs, 1000); // Wait for job
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Ops Recommendations</h1>
                <Button onClick={triggerAnalysis} variant="outline">
                    <Play className="mr-2 h-4 w-4" /> Run Analysis
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Actions ({recs.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div>Loading...</div>
                    ) : recs.length === 0 ? (
                        <div className="text-center py-8 text-neutral-500">No pending recommendations</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recs.map((r) => {
                                    const details = JSON.parse(r.recommendation_json);
                                    return (
                                        <TableRow key={r.id}>
                                            <TableCell>
                                                <Badge variant="outline">{r.type}</Badge>
                                            </TableCell>
                                            <TableCell>{r.entity_id}</TableCell>
                                            <TableCell className="max-w-md truncate" title={details.reason}>
                                                {details.reason}
                                            </TableCell>
                                            <TableCell>
                                                <pre className="text-xs bg-neutral-900 p-2 rounded max-w-[200px] overflow-auto">
                                                    {JSON.stringify(details, null, 2)}
                                                </pre>
                                            </TableCell>
                                            <TableCell className="space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => handleAction(r.id, 'accept')}
                                                    disabled={!!processing}
                                                >
                                                    <CheckCircle className="mr-1 h-3 w-3" /> Accept
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleAction(r.id, 'reject')}
                                                    disabled={!!processing}
                                                >
                                                    <XCircle className="mr-1 h-3 w-3" /> Reject
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
