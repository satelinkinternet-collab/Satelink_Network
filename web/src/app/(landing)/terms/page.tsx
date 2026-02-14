"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <LandingNav />
            <main className="pt-32 pb-24 container mx-auto px-6 max-w-3xl">
                <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
                <div className="prose prose-invert prose-lg text-zinc-400">
                    <p>Last updated: February 2026</p>
                    <p>
                        Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Satelink Network operated by Satelink ("us", "we", or "our").
                    </p>
                    <h3>1. Acceptance of Terms</h3>
                    <p>
                        By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
                    </p>
                    <h3>2. Node Operation</h3>
                    <p>
                        Users operating a Node agree to maintain consistent uptime and adhere to the network protocols. Malicious behavior or tampering with node software will result in immediate ban and forfeiture of pending rewards.
                    </p>
                    <h3>3. Rewards</h3>
                    <p>
                        Rewards are calculated based on bandwidth contributions and network uptime. We reserve the right to adjust reward mechanisms to ensure network stability.
                    </p>
                </div>
            </main>
            <LandingFooter />
        </div>
    );
}
