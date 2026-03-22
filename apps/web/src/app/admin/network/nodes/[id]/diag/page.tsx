'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Wrench, RefreshCw, Server, Activity, HardDrive } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function NodeDiagPage() {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDiag();
    }, [id]);

    const fetchDiag = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/network/nodes/${id}/diag`);
            const json = await res.json();
            if (json.ok) setData(json.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (s: string) => {
        switch (s) {
            case 'critical': return 'destructive';
            case 'medium': return 'warning'; // requires custom variant or default
            default: return 'secondary';
        }
    };

    if (loading) return <div className="p-8">Loading diagnostics...</div>;
    if (!data) return <div className="p-8">No diagnostic data found for this node.</div>;

    const { latest_bundle: bundle, remediation } = data;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">Diagnostic Bundle</h1>
                    <p className="text-muted-foreground font-mono text-sm">Target: {id}</p>
                </div>
                <Button variant="outline" onClick={fetchDiag}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
            </div>

            {remediation && remediation.length > 0 && (
                <div className="grid gap-4">
                    {remediation.map((r: any) => {
                        const rec = JSON.parse(r.suggestion_json);
                        return (
                            <Alert key={r.id} variant={r.severity === 'critical' ? 'destructive' : 'default'} className="border-l-4">
                                <Wrench className="h-4 w-4" />
                                <AlertTitle className="capitalize">{rec.action.replace('_', ' ')}</AlertTitle>
                                <AlertDescription className="flex justify-between items-center">
                                    <span>{rec.reason}</span>
                                    <Badge variant="outline">{r.severity}</Badge>
                                </AlertDescription>
                            </Alert>
                        );
                    })}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">CPU Load</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center">
                            <Activity className="mr-2 h-5 w-5 text-blue-500" />
                            {bundle?.cpu_load}%
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Disk Free</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center">
                            <HardDrive className="mr-2 h-5 w-5 text-gray-500" />
                            {bundle?.disk_free_percent}%
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Version</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center">
                            <Server className="mr-2 h-5 w-5 text-purple-500" />
                            {bundle?.version}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="logs">
                <TabsList>
                    <TabsTrigger value="logs">Recent Logs (Redacted)</TabsTrigger>
                    <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="logs">
                    <Card>
                        <CardContent className="p-0">
                            <div className="bg-black text-white font-mono text-xs p-4 rounded-md h-[400px] overflow-auto">
                                {bundle?.logs?.map((line: string, i: number) => (
                                    <div key={i} className="mb-1 border-b border-white/10 pb-1">{line}</div>
                                )) || "No logs available"}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="raw">
                    <Card>
                        <CardContent className="p-4">
                            <pre className="text-xs overflow-auto max-h-[400px]">
                                {JSON.stringify(bundle, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
