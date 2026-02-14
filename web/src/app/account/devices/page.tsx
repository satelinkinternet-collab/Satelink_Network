"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useReAuth } from '@/hooks/use-reauth';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Laptop, Trash2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Device {
    id: number;
    device_public_id: string;
    label: string | null;
    user_agent: string;
    last_seen_at: number;
    first_seen_at: number;
    status: string;
}

export default function DevicesPage() {
    const { user } = useAuth();
    const { requestReAuth, ReAuthComponent } = useReAuth();
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDevices();
    }, []);

    const fetchDevices = async () => {
        try {
            const res = await axios.get('/auth/account/devices'); // Path confirmed in backend
            if (res.data.ok) {
                setDevices(res.data.devices);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (devicePublicId: string) => {
        try {
            // Require Re-Auth for revocation
            const token = await requestReAuth('revoke_device');

            // Call revoke endpoint (TODO: Implement backend endpoint)
            // For now assuming /auth/account/devices/revoke
            // I'll implement this endpoint right after this file creation.
            // Using POST /auth/account/devices/revoke
            await axios.post('/auth/account/devices/revoke', {
                deviceTimestamp: Date.now() // placeholder payload
            }, {
                headers: { 'x-reauth-token': token },
                data: { device_public_id: devicePublicId } // axios data for post
            });

            toast.success('Device revoked');
            fetchDevices();
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to revoke device");
        }
    };

    // Helper to parse UA
    const getIcon = (ua: string) => {
        if (ua.toLowerCase().includes('mobile')) return <Smartphone className="w-5 h-5" />;
        return <Laptop className="w-5 h-5" />;
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Trusted Devices</h1>
                    <p className="text-zinc-400">Manage devices authorized to access your account.</p>
                </div>
                {ReAuthComponent}
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div>Loading...</div>
                ) : devices.map(device => (
                    <Card key={device.id} className="bg-zinc-900 border-zinc-800">
                        <CardContent className="flex items-center justify-between p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                    {getIcon(device.user_agent)}
                                </div>
                                <div>
                                    <div className="font-semibold text-white flex items-center gap-2">
                                        {device.label || 'Unknown Device'}
                                        {device.device_public_id === localStorage.getItem('satelink_device_id') && (
                                            <Badge variant="outline" className="text-green-400 border-green-400/20 bg-green-400/10 text-[10px]">
                                                This Device
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-zinc-500">
                                        Last active: {formatDistanceToNow(device.last_seen_at)} ago
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-950/20" onClick={() => handleRevoke(device.device_public_id)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Revoke
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
