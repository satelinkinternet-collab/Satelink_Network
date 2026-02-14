'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface Ticket {
    id: number;
    wallet: string;
    message: string;
    bundle_json: string;
    status: string;
    created_at: number;
}

/**
 * Admin Support Tickets Dashboard
 * Manage user diagnostics and solve issues.
 */
export default function AdminTicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await axios.get('/admin/support/tickets');
            if (res.data.ok) setTickets(res.data.tickets);
        } catch (e: any) {
            toast.error('Failed to fetch tickets: ' + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
        }
    };

    const resolveTicket = async (id: number) => {
        try {
            await axios.post(`/admin/support/tickets/${id}/resolve`, { status: 'resolved' });
            toast.success('Ticket marked as resolved');
            fetchTickets();
            if (selectedTicket?.id === id) setSelectedTicket(null);
        } catch (e) {
            toast.error('Action failed');
        }
    };

    return (
        <div className="p-8 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Support Tickets</h1>
                    <p className="text-white/50 text-sm">Review diagnostic bundles from users.</p>
                </div>
                <button
                    onClick={fetchTickets}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-xs"
                >
                    Refresh
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Ticket List */}
                <div className="lg:col-span-1 space-y-4">
                    {loading ? (
                        <div className="p-12 text-center text-white/20">Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                        <div className="p-12 text-center text-white/20">No tickets found</div>
                    ) : (
                        tickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedTicket?.id === ticket.id
                                        ? 'bg-blue-600/20 border-blue-500'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                        #{ticket.id}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${ticket.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <h3 className="text-sm font-semibold truncate">{ticket.message}</h3>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-xs font-mono text-white/30">{ticket.wallet.slice(0, 8)}...</span>
                                    <span className="text-[10px] text-white/20">
                                        {new Date(ticket.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Ticket Details */}
                <div className="lg:col-span-2">
                    {selectedTicket ? (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-8 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start border-b border-white/5 pb-6">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">Ticket Details</h2>
                                    <div className="flex items-center gap-4 text-xs">
                                        <span className="text-white/50">User: <span className="text-white font-mono">{selectedTicket.wallet}</span></span>
                                        <span className="text-white/50">Created: <span className="text-white">{new Date(selectedTicket.created_at).toLocaleString()}</span></span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {selectedTicket.status !== 'resolved' && (
                                        <button
                                            onClick={() => resolveTicket(selectedTicket.id)}
                                            className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-500 transition-colors"
                                        >
                                            Mark Resolved
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-white/40">User Message</h4>
                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-sm leading-relaxed">
                                    {selectedTicket.message}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-white/40">Diagnostic Bundle</h4>
                                <pre className="p-4 bg-black/40 border border-white/10 rounded-xl text-[11px] font-mono text-blue-300 overflow-auto max-h-[400px]">
                                    {JSON.stringify(JSON.parse(selectedTicket.bundle_json), null, 2)}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-white/20">
                            Select a ticket to view diagnostics
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
