import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "@/styles/satelink.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Satelink Network | Decentralized RPC Infrastructure for Machine Economies",
  description:
    "The infrastructure layer for autonomous machine economies. Decentralized RPC gateway with USDT settlement, multi-chain support, and 50% revenue share for node operators.",
  keywords: [
    "DePIN",
    "decentralized RPC",
    "blockchain infrastructure",
    "Polygon RPC",
    "Ethereum RPC",
    "Arbitrum RPC",
    "Base RPC",
    "node operators",
    "USDT settlement",
    "machine economy",
    "AI agents",
    "DeFi bots",
    "RPC gateway",
  ],
  authors: [{ name: "Satelink Network" }],
  creator: "Satelink Network",
  publisher: "Satelink Network",
  metadataBase: new URL("https://satelink.network"),
  openGraph: {
    title: "Satelink Network | Decentralized RPC Infrastructure",
    description:
      "Power your dApps, DeFi bots, and AI agents with decentralized RPC infrastructure. Earn USDT as a node operator.",
    type: "website",
    url: "https://satelink.network",
    siteName: "Satelink Network",
    locale: "en_US",
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Satelink Network",
  url: "https://satelink.network",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Decentralized RPC gateway for DeFi bots, AI agents, and machine networks. USDT settlement on Polygon.",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Basic", price: "10", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro", price: "50", priceCurrency: "USD" },
    { "@type": "Offer", name: "Enterprise", price: "200", priceCurrency: "USD" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="https://rpc.satelink.network" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="application-name" content="Satelink Network" />
        <meta name="theme-color" content="#080E1A" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="antialiased custom-scrollbar"
        style={{
          background: "var(--bg-page)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-body)",
        }}
      >
        {children}

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-GS4195MH7N"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GS4195MH7N');
          `}
        </Script>
      </body>
    </html>
  );
}
