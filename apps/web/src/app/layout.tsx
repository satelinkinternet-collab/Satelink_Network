import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/satelink.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

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
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Satelink Network",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description: "Decentralized RPC infrastructure for blockchain applications",
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
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="dns-prefetch" href="https://rpc.satelink.network" />
        <meta name="application-name" content="Satelink Network" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="antialiased custom-scrollbar"
        style={{
          background: "var(--bg-deep)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-body)",
        }}
      >
        {children}
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
