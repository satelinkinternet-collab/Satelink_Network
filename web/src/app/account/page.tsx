'use client';
import { useUserMode } from '../../hooks/useUserMode';
import Link from 'next/link';

export default function AccountPage() {
    const { mode, toggleMode, loading } = useUserMode();

    if (loading) return <div className="p-8 text-zinc-400">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-zinc-100 mb-6">Account Settings</h1>

            <div className="grid gap-6">
                {/* Mode Toggle Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-emerald-400">Interface Mode</h2>
                            <p className="text-zinc-400 text-sm mt-1">
                                Customize your experience. Simple mode hides blockchain complexity.
                            </p>
                        </div>
                        <div className="flex items-center space-x-2 bg-black p-1 rounded-lg border border-zinc-700">
                            <button
                                onClick={() => toggleMode('SIMPLE')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'SIMPLE'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                Simple
                            </button>
                            <button
                                onClick={() => toggleMode('ADVANCED')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'ADVANCED'
                                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                Advanced
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sub-pages Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/account/security" className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-emerald-500/30 transition-all">
                        <div className="text-emerald-400 mb-2">🛡️ Security</div>
                        <div className="text-sm text-zinc-300">Manage 2FA, Devices, and Backup</div>
                    </Link>
                    <Link href="/account/devices" className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-emerald-500/30 transition-all">
                        <div className="text-emerald-400 mb-2">📱 Devices</div>
                        <div className="text-sm text-zinc-300">Trusted devices list</div>
                    </Link>
                    <Link href="/account/support" className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-emerald-500/30 transition-all">
                        <div className="text-emerald-400 mb-2">🎫 Support</div>
                        <div className="text-sm text-zinc-300">Get help & diagnostics</div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
