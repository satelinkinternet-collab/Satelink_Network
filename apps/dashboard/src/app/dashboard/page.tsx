"use client";

import { useState, useEffect } from "react";
import { Server, Activity, Coins, Zap, Shield, ArrowUpRight, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNetworkStats } from "@/hooks/useNetworkStats";
import { useNetworkHealth } from "@/hooks/useNetworkHealth";
import api from "@/lib/api";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { stats, isLoading: statsLoading } = useNetworkStats();
    const { health } = useNetworkHealth();
    const [systemStatus, setSystemStatus] = useState<any>(null);

    useEffect(() => {
        const fetchSystemStatus = async () => {
            try {
                const { data } = await api.get('/system/status');
                if (data.ok) {
                    setSystemStatus(data);
                }
            } catch (err) {
                console.error("Failed to fetch system status", err);
            }
        };
        fetchSystemStatus();
    }, []);

    if (authLoading) {
        return <div className="flex h-full items-center justify-center font-mono opacity-50">AUTHORIZING_SESSION...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        Network Overview
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono uppercase tracking-widest">Live</span>
                    </h1>
                    <p className="text-zinc-500 mt-1 font-medium">Real-time status of the Satelink Settlement Engine</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                {String.fromCharCode(64 + i)}
                            </div>
                        ))}
                    </div>
                    <span className="text-sm text-zinc-400 font-medium">Active Operators</span>
                </div>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                    title="Network Revenue" 
                    value={systemStatus?.total_revenue} 
                    unit="$" 
                    trend={systemStatus ? "+12.5%" : "N/A"} 
                    icon={Coins} 
                    color="emerald"
                    loading={!systemStatus && !statsLoading}
                />
                <MetricCard 
                    title="Active Nodes" 
                    value={stats?.activeNodes} 
                    trend={stats ? "Stable" : "N/A"} 
                    icon={Server} 
                    color="blue"
                    loading={statsLoading}
                />
                <MetricCard 
                    title="Ops / Minute" 
                    value={systemStatus?.ops_per_min} 
                    trend={systemStatus ? "+5.2%" : "N/A"} 
                    icon={Activity} 
                    color="amber"
                    loading={!systemStatus && !statsLoading}
                />
                <MetricCard 
                    title="Network Status" 
                    value={health?.status?.toUpperCase() || (health === undefined ? "LOADING" : "OFFLINE")} 
                    trend={health ? "Optimal" : "Check API"} 
                    icon={Shield} 
                    color={health?.status === 'healthy' ? "emerald" : "purple"}
                    loading={!health && !statsLoading}
                />
            </div>

            {/* Middle Section: Chart and Secondary Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#0F0F0F] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group min-h-[440px]">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BarChart3 className="w-32 h-32" />
                    </div>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white">Revenue Throughput</h3>
                            <p className="text-sm text-zinc-500">Epoch distribution across the network</p>
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-900 rounded-xl p-1 px-3 border border-white/5">
                            <div className={`w-2 h-2 rounded-full ${stats ? 'bg-blue-500 animate-pulse' : 'bg-zinc-600'}`} />
                            <span className="text-xs font-mono text-zinc-400">{stats ? 'Real-time' : 'Offline'}</span>
                        </div>
                    </div>
                    
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {stats ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F1F" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#52525B', fontSize: 12}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#52525B', fontSize: 12}} tickFormatter={(v) => `$${v}`} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#0A0A0A', border: '1px solid #27272A', borderRadius: '12px'}}
                                        itemStyle={{color: '#3B82F6'}}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-zinc-600 font-mono text-sm tracking-widest uppercase">
                                <Activity className="w-8 h-8 opacity-20" />
                                Live Throughput Data Unavailable
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-6 flex flex-col justify-between h-[200px]">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h4 className="text-zinc-400 font-medium text-sm">System Capacity</h4>
                            <div className="text-2xl font-bold text-white mt-1">1.2 Peta-Ops</div>
                        </div>
                        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full w-[65%]" />
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white h-[260px] flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/10 blur-3xl rounded-full" />
                        <div>
                            <h4 className="font-bold text-xl leading-tight">Join the decentralized infrastructure revolution.</h4>
                            <p className="text-blue-100/70 text-sm mt-3">Register your node and start earning real protocol revenue today.</p>
                        </div>
                        <button className="bg-white text-blue-600 font-bold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/90 transition-colors">
                            Deploy Node <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const chartData = [
    { name: '08:00', value: 400 },
    { name: '10:00', value: 300 },
    { name: '12:00', value: 600 },
    { name: '14:00', value: 800 },
    { name: '16:00', value: 500 },
    { name: '18:00', value: 900 },
    { name: '20:00', value: 750 },
];

function MetricCard({ title, value, unit = "", trend, icon: Icon, color, loading }: any) {
    const colors: any = {
        emerald: "bg-emerald-500/10 text-emerald-500",
        blue: "bg-blue-500/10 text-blue-500",
        amber: "bg-amber-500/10 text-amber-500",
        purple: "bg-purple-500/10 text-purple-500",
    };

    const isAvailable = value !== undefined && value !== null;
    const formattedValue = isAvailable
        ? typeof value === 'number' ? value.toLocaleString() : value
        : "UNAVAILABLE";

    return (
        <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-colors group relative overflow-hidden">
            {loading && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] animate-pulse z-10" />
            )}
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${colors[color] || colors.blue}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-mono text-zinc-600 font-bold uppercase tracking-wider">{trend}</div>
            </div>
            <div className="text-zinc-500 font-medium text-sm">{title}</div>
            <div className={`text-3xl font-bold mt-1 group-hover:scale-105 transition-transform origin-left ${isAvailable ? 'text-white' : 'text-zinc-700 font-mono text-xl'}`}>
                {isAvailable && unit}
                {formattedValue}
            </div>
        </div>
    );
}
