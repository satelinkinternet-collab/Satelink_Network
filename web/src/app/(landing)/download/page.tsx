"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Check, Download, Monitor, Globe, Apple } from "lucide-react";

export default function DownloadPage() {
    return (
        <div className="min-h-screen bg-[#fdfbf7] text-zinc-900 font-sans">
            <LandingNav />
            <main className="pt-32 pb-24 container mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h1 className="text-5xl md:text-7xl font-bold mb-6">Download Node</h1>
                    <p className="text-xl text-zinc-600">
                        Start earning legal passive income by running a Satelink Node on your device.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {/* Windows */}
                    <div className="bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col items-center hover:border-zinc-400 transition-colors group shadow-sm">
                        <Monitor className="w-16 h-16 text-zinc-400 mb-6 group-hover:text-zinc-900 transition-colors" />
                        <h3 className="text-2xl font-bold mb-2 text-zinc-900">Windows</h3>
                        <p className="text-zinc-500 mb-8">Windows 10/11 (64-bit)</p>
                        <button className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                            <Download className="w-5 h-5" /> Download .exe
                        </button>
                    </div>

                    {/* Mac */}
                    <div className="bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col items-center hover:border-zinc-400 transition-colors group shadow-sm">
                        <Apple className="w-16 h-16 text-zinc-400 mb-6 group-hover:text-zinc-900 transition-colors" />
                        <h3 className="text-2xl font-bold mb-2 text-zinc-900">macOS</h3>
                        <p className="text-zinc-500 mb-8">Apple Silicon & Intel</p>
                        <button className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                            <Download className="w-5 h-5" /> Download .dmg
                        </button>
                    </div>

                    {/* Linux */}
                    <div className="bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col items-center hover:border-zinc-400 transition-colors group shadow-sm">
                        <Globe className="w-16 h-16 text-zinc-400 mb-6 group-hover:text-zinc-900 transition-colors" />
                        <h3 className="text-2xl font-bold mb-2 text-zinc-900">Linux</h3>
                        <p className="text-zinc-500 mb-8">Ubuntu, Debian, Fedora</p>
                        <button className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                            <Download className="w-5 h-5" /> Download .deb
                        </button>
                    </div>
                </div>

                <div className="mt-24 max-w-2xl mx-auto">
                    <h3 className="text-xl font-bold mb-6 text-center">System Requirements</h3>
                    <ul className="space-y-4 text-zinc-400">
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-white" />
                            <span>Any modern dual-core processor</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-white" />
                            <span>4GB RAM minimum (8GB recommended)</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-white" />
                            <span>Stable internet connection (10Mbps+)</span>
                        </li>
                    </ul>
                </div>
            </main>
            <LandingFooter />
        </div>
    );
}
