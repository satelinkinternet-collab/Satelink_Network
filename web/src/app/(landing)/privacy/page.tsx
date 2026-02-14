"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <LandingNav />
            <main className="pt-32 pb-24 container mx-auto px-6 max-w-3xl">
                <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
                <div className="prose prose-invert prose-lg text-zinc-400">
                    <p>Last updated: February 2026</p>
                    <p>
                        At Satelink, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your information.
                    </p>
                    <h3>1. Information We Collect</h3>
                    <p>
                        We collect minimal data necessary for network operation:
                    </p>
                    <ul>
                        <li>Node telemetry (uptime, bandwidth usage)</li>
                        <li>Wallet addresses for reward distribution</li>
                        <li>IP addresses for network routing (encrypted)</li>
                    </ul>
                    <h3>2. How We Use Your Information</h3>
                    <p>
                        Data is used solely to maintain network health, verify contributions, and distribute rewards. We do not sell user data to third parties.
                    </p>
                    <h3>3. Security</h3>
                    <p>
                        We implement industry-standard security measures to protect your data. However, no method of transmission over the Internet is 100% secure.
                    </p>
                </div>
            </main>
            <LandingFooter />
        </div>
    );
}
