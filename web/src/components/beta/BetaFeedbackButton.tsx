"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { Bug } from 'lucide-react';

export function BetaFeedbackButton() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState('bug');
    const [severity, setSeverity] = useState('low');
    const [message, setMessage] = useState('');

    const handleSubmit = async () => {
        if (!message.trim()) return;
        setLoading(true);

        try {
            // Collect meta
            const page_url = window.location.href;
            const wallet = localStorage.getItem('wallet_address') || 'anon';

            const res = await fetch('http://localhost:8080/beta/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet,
                    category,
                    severity,
                    message,
                    page_url,
                    trace_id: null
                })
            });

            if (res.ok) {
                toast.success("Feedback received. Thank you!");
                setOpen(false);
                setMessage('');
                setCategory('bug');
                setSeverity('low');
            } else {
                toast.error("Failed to send feedback");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error sending feedback");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white w-12 h-12 p-0 flex items-center justify-center transition-transform hover:scale-105"
                title="Report Issue"
            >
                <Bug size={20} />
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Report an Issue</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Help us improve Satelink Beta.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="bug">Bug</option>
                                    <option value="ux">UX / Design</option>
                                    <option value="feature">Feature Request</option>
                                    <option value="perf">Performance</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Severity</label>
                                <select
                                    value={severity}
                                    onChange={(e) => setSeverity(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="low">Low</option>
                                    <option value="med">Medium</option>
                                    <option value="high">High (Critical)</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Description</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="What happened? Steps to reproduce..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white min-h-[100px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white">Cancel</Button>
                        <Button onClick={handleSubmit} disabled={loading || !message.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                            {loading ? 'Sending...' : 'Submit Report'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
