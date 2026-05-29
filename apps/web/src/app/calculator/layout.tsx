import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Node Earnings Calculator | Satelink Network",
  description: "Estimate your monthly USDT earnings as a Satelink node operator. Advanced calculator with hardware specs, workload mix, and ROI analysis.",
  openGraph: {
    title: "Node Earnings Calculator | Satelink",
    description: "Estimate your monthly USDT earnings as a Satelink node operator",
    url: "https://satelink.network/calculator",
  },
};

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
