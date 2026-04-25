import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/satelink.css";
import "../globals.css";

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
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body
        className="antialiased custom-scrollbar"
        style={{
          background: "var(--bg-deep)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-body)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
