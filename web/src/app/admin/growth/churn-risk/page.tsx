'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown } from 'lucide-react';

export default function ChurnRiskPage() {
    const [risks, setRisks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRisks();
    }, []);

    const fetchRisks = async () => {
        try {
            const res = await fetch('/api/admin/growth/churn-risk');
            const data = await res.json();
            setRisks(data.risks || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Churn Risk Monitor</h1>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nodes at Risk</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{risks.length}</div>
                        <p className="text-xs text-neutral-500">Flagged in last 24h</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>At-Risk Nodes</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div>Loading...</div>
                    ) : risks.length === 0 ? (
                        <div className="text-center py-8 text-neutral-500">No churn risks detected</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Node ID</TableHead>
                                    <TableHead>Risk Score</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Detected At</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {risks.map((r) => (
                                    <TableRow key={r.node_id}>
                                        <TableCell className="font-mono">{r.node_id}</TableCell>
                                        <TableCell>
                                            <Badge variant={r.risk_score > 80 ? "destructive" : "default"}>
                                                {r.risk_score}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{r.reason}</TableCell>
                                        <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">Active Flag</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
