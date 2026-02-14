'use client';

import React, { useState, useEffect } from 'react';
import { getActiveAddress } from '@/lib/embeddedWallet';
import { generateSupportBundle } from '@/lib/supportBundle';
import axios from 'axios';
import { toast } from 'sonner';

/**
 * Phase H4 — Support Page
 * Submit diagnostic bundles to the engineering team.
 */
export default function SupportPage() {
    const [address, setAddress] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        getActiveAddress().then(setAddress);
    }, []);

    const handleSubmit = async () => {
        if (!message || message.length < 10) {
            toast.error('Please describe your issue in more detail (min 10 chars)');
            return;
        }

        setLoading(true);
        try {
            const bundle = await generateSupportBundle(message);

            const res = await axios.post('/support/ticket', {
                wallet: address,
                message,
                bundle_json: bundle
            });

            if (res.data.ok) {
                setSubmitted(true);
                toast.success('Support ticket submitted!');
            } else {
                throw new Error(res.data.error);
            }
        } catch (e: any) {
            toast.error('Failed to submit: ' + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
        }
    };

    const downloadBundleLocal = async () => {
        const bundle = await generateSupportBundle(message || 'Manual Export');
        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `satelink-support-bundle-${Date.now()}.json`;
        a.click();
        toast.info('Local diagnostic bundle downloaded');
    };

    if (submitted) {
        return (
            <div className="p-12 text-center max-w-2xl mx-auto space-y-6">
                <div className="text-6xl mb-4">📬</div>
                <h1 className="text-3xl font-bold">Ticket Received</h1>
                <p className="text-white/60">
                    Our team has received your diagnostic bundle and will investigate.
                    Reference: {address?.slice(0, 8)}...
                </p>
                <button
                    onClick={() => setSubmitted(false)}
                    className="px-6 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all"
                >
                    Submit another issue
                </button>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Support & Diagnostics</h1>
                <p className="text-white/50">Troubleshoot issues or submit a support ticket.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <div className="p-6 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                        <label className="block text-sm font-medium">What's happening?</label>
                        <textarea
                            rows={5}
                            placeholder="Describe the problem, steps to reproduce, or any error messages you see..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:border-white/40 outline-none transition-all"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !address}
                            className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Submit Support Ticket'}
                        </button>
                        <p className="text-[10px] text-center text-white/30 uppercase tracking-widest">
                            Submitting will include a sanitized diagnostic bundle
                        </p>
                    </div>
                </div>

                <div className="space-y-6 text-sm">
                    <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                        <h3 className="font-bold mb-2">Self-Service Fixes</h3>
                        <ul className="space-y-3 text-white/70">
                            <li>• Refresh the page</li>
                            <li>• Clear browser cache (restart browser)</li>
                            <li>• Check internet connection</li>
                            <li>• Verify your device time is correct</li>
                        </ul>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                        <h3 className="font-bold mb-2">Inspect Bundle</h3>
                        <p className="text-xs text-white/50 mb-4">
                            You can export the diagnostic data locally to see exactly what we collect.
                            <strong> We never collect private keys or passwords.</strong>
                        </p>
                        <button
                            onClick={downloadBundleLocal}
                            className="w-full py-2 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-xs font-semibold"
                        >
                            Export Local Bundle (JSON)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
