import { Navigation } from "@/components/marketing/Navigation";
import { HeroSection } from "@/components/marketing/HeroSection";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { LiveNetworkStats } from "@/components/marketing/LiveNetworkStats";
import { SupportedChains } from "@/components/marketing/SupportedChains";
import { UseCases } from "@/components/marketing/UseCases";
import { DeveloperQuickStart } from "@/components/marketing/DeveloperQuickStart";
import { Footer } from "@/components/marketing/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Satelink Network | Decentralized RPC Infrastructure for Machine Economies",
  description:
    "The infrastructure layer for autonomous machine economies. Decentralized RPC gateway with USDT settlement, multi-chain support, and 50% revenue share for node operators.",
  keywords: [
    "DePIN",
    "decentralized infrastructure",
    "RPC gateway",
    "blockchain",
    "Polygon",
    "Ethereum",
    "node operators",
    "USDT",
    "machine economy",
    "AI agents",
    "DeFi bots",
  ],
  openGraph: {
    title: "Satelink Network | Decentralized RPC Infrastructure",
    description:
      "Power your dApps, DeFi bots, and AI agents with decentralized RPC infrastructure. Earn USDT as a node operator.",
    type: "website",
    url: "https://satelink.network",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Satelink Network - Decentralized Infrastructure",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Satelink Network | Decentralized RPC Infrastructure",
    description:
      "Power your dApps, DeFi bots, and AI agents with decentralized RPC infrastructure.",
    images: ["/og-image.png"],
  },
};

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main>
        <HeroSection />
        <HowItWorks />
        <LiveNetworkStats />
        <SupportedChains />
        <UseCases />
        <DeveloperQuickStart />
      </main>
      <Footer />
    </>
  );
}
