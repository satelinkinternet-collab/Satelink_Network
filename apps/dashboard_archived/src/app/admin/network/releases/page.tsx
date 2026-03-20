'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, Check } from 'lucide-react';

export default function ReleasePolicyPage() {
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState({ min_version: '', build_hash: '' });

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        try {
            const res = await fetch('/api/admin/network/releases');
            const json = await res.json();
            if (json.ok) setPolicies(json.policies);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (p: any) => {
        setEditing(p.channel);
        setFormData({ min_version: p.min_version, build_hash: p.build_hash || '' });
    };

    const savePolicy = async (channel: string) => {
        try {
            await fetch('/api/admin/network/releases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel,
                    min_version: formData.min_version,
                    build_hash: formData.build_hash
                })
            });
            setEditing(null);
            fetchPolicies();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Release Channels</h1>
                <p className="text-muted-foreground">Manage minimum required versions for the fleet.</p>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Channel</TableHead>
                                <TableHead>Min Version</TableHead>
                                <TableHead>Build Hash</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {policies.map((p) => (
                                <TableRow key={p.channel}>
                                    <TableCell>
                                        <Badge variant="outline" className="uppercase">{p.channel}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {editing === p.channel ? (
                                            <Input
                                                value={formData.min_version}
                                                onChange={e => setFormData({ ...formData, min_version: e.target.value })}
                                                className="w-32"
                                            />
                                        ) : (
                                            <span className="font-mono">{p.min_version}</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editing === p.channel ? (
                                            <Input
                                                value={formData.build_hash}
                                                onChange={e => setFormData({ ...formData, build_hash: e.target.value })}
                                                className="w-48 font-mono text-xs"
                                            />
                                        ) : (
                                            <code className="text-xs bg-muted px-1 rounded">{p.build_hash?.substring(0, 8) || 'N/A'}</code>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(p.updated_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editing === p.channel ? (
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" onClick={() => savePolicy(p.channel)}>
                                                    <Check className="h-4 w-4" /> Save
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
                                                <UploadCloud className="mr-2 h-4 w-4" /> Update
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
