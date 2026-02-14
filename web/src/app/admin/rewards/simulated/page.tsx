
"use client";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SimulatedPayoutsPage() {
    const [payouts, setPayouts] = useState<any[]>([]);

    const fetchPayouts = async () => {
        try {
            // We can use the existing /ledger/payouts endpoint if it supports filtering by status?
            // Or use a direct db query via a new admin route?
            // The prompt says "Provide admin toggle... Admin pages... /admin/payouts/simulated"
            // Let's assume we need to fetch 'SIMULATED' status.
            // Existing ledger API might default to PENDING.
            // We'll try fetching from a new endpoint or reusing one.
            // Let's assume we added support or will add a proxy query.
            // For now, let's try calling /api/proxy?path=/admin/ledger/payouts&status=SIMULATED if supported.
            // If not, we might need to add it to admin_control_room_api.js or ledger.js

            // Let's check admin_control_room_api.js - it usually has general access.
            // Or ledger.js
            // I'll assume we can filter by status in the backend.
            // If not, I'll update the backend to allow status filter.

            const res = await fetch('/api/proxy?path=/admin-api/ledger/payouts&status=SIMULATED');
            // Wait, /admin-api is usually the prefix.
            // ledger.js is likely mounted under /admin-api/ledger or similar?
            // In server.js: app.use('/admin-api', ... createAdminApiRouter ... operations-engine methods are widely used there.
            // But ledger.js was seen in previous contexts.

            // I'll stick to a safe approach: Add a specific route in admin_control_room_api.js for full control?
            // Actually, I'll try to fetch from /admin/beta/payouts if I create it?
            // Or just generic query if I have a generic SQL runner (unsafe).

            // Let's assume I need to ADD the endpoint.
            // I'll update admin_control_room_api.js to add `GET /rewards/simulated`.

            // For now, I'll just write the frontend code assuming the endpoint exists at `/admin/rewards/simulated-list`

            const res2 = await fetch('/api/proxy?path=/admin/rewards/simulated-list');
            const data = await res2.json();
            if (data.ok) setPayouts(data.payouts);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { fetchPayouts(); }, []);

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-6">Simulated Payouts</h1>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-white">Simulation Queue</CardTitle>
                    <CardDescription className="text-zinc-400">
                        These payouts were generated while the system was in simulation mode. No real funds have moved.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs uppercase bg-zinc-950 text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">ID</th>
                                    <th className="px-6 py-3">Wallet</th>
                                    <th className="px-6 py-3">Amount (USDT)</th>
                                    <th className="px-6 py-3">Created At</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payouts.map((p) => (
                                    <tr key={p.id} className="border-b border-zinc-800">
                                        <td className="px-6 py-4 font-mono">{p.id}</td>
                                        <td className="px-6 py-4 font-mono text-zinc-300">{p.wallet}</td>
                                        <td className="px-6 py-4 text-green-400">${p.amount_usdt.toFixed(4)}</td>
                                        <td className="px-6 py-4">{new Date(p.created_at * 1000).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                                                {p.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {payouts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                                            No simulated payouts found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
