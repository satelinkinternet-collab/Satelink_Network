import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Satelink Network — Decentralized RPC Infrastructure",
  description:
    "The infrastructure layer for autonomous machine economies. Multi-chain RPC gateway with real-time USDT settlement on Polygon.",
  keywords: [
    "DePIN",
    "RPC",
    "blockchain",
    "infrastructure",
    "Polygon",
    "Ethereum",
    "decentralized",
    "API",
    "node",
  ],
  authors: [{ name: "Satelink Network" }],
  openGraph: {
    title: "Satelink Network — Decentralized RPC Infrastructure",
    description:
      "Multi-chain RPC gateway with real-time USDT settlement. Earn by running nodes.",
    type: "website",
    locale: "en_US",
    siteName: "Satelink Network",
  },
  twitter: {
    card: "summary_large_image",
    title: "Satelink Network",
    description: "Decentralized RPC infrastructure for autonomous machine economies.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
