
"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from 'sonner';

export default function BetaJoinPage() {
    const [step, setStep] = useState(1);
    const [inviteCode, setInviteCode] = useState('');
    const [wallet, setWallet] = useState(''); // Would typically come from wallet connector
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!inviteCode || !wallet) {
            toast.error("Please enter code and wallet");
            return;
        }
        setLoading(true);
        try {
            // Call public beta join (not via admin proxy)
            // Need to proxy via frontend to /beta endpoint if mounted on backend
            // Our backend is on localhost:8080 usually. 
            // We assume frontend handles proxying or CORS.
            // If using Next.js dev server, we might need a rewrites config.
            // For MVP, checking direct fetch to backend port if possible, 
            // or just use `/api/proxy` but directing to public route?
            // Actually, /api/proxy might require admin auth.
            // We'll try fetching relative path if we have rewrites, or absolute if CORS allowed.
            // Given setup, we likely have rewrites in next.config.mjs or we use localhost:8080.

            // Wait, we are in Next.js. We should use a server action or API route.
            // But we have a Node backend separate.
            // We'll assume fetch to /beta/join is proxied by Next.js or direct.
            // Let's try direct fetch to port 8080 from client (assuming CORS is open)

            const res = await fetch('http://localhost:8080/beta/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet, invite_code: inviteCode })
            });

            const data = await res.json();
            if (data.ok) {
                toast.success("Welcome to Beta!");
                setStep(2);
            } else {
                toast.error(data.error || "Join failed");
            }
        } catch (e) {
            toast.error("Failed to connect");
        } finally {
            setLoading(false);
        }
    };

    if (step === 2) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-center p-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent mb-4">
                        You're In!
                    </h1>
                    <p className="text-zinc-400 mb-6">
                        Welcome to the Satelink Beta Program. Your wallet has been whitelisted.
                    </p>
                    <Button onClick={() => window.location.href = '/dashboard'} className="w-full bg-emerald-600 hover:bg-emerald-700">
                        Go to Dashboard
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

            <Card className="w-full max-w-md bg-zinc-900/80 backdrop-blur border-zinc-800 relative z-10">
                <CardHeader>
                    <CardTitle className="text-2xl text-white text-center">Join Beta</CardTitle>
                    <CardDescription className="text-center text-zinc-500">
                        Enter your invite code to access the platform.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-400 uppercase font-bold">Wallet Address</label>
                        <Input
                            value={wallet}
                            onChange={e => setWallet(e.target.value)}
                            placeholder="0x..."
                            className="bg-zinc-950 border-zinc-800 text-white font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-400 uppercase font-bold">Invite Code</label>
                        <Input
                            value={inviteCode}
                            onChange={e => setInviteCode(e.target.value)}
                            placeholder="SAT-..."
                            className="bg-zinc-950 border-zinc-800 text-white font-mono tracking-widest text-center text-lg h-12"
                        />
                    </div>
                    <Button
                        onClick={handleJoin}
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg font-medium"
                    >
                        {loading ? 'Verifying...' : 'Unlock Access'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
