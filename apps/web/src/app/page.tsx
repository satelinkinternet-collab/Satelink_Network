import { Navigation } from "@/components/marketing/Navigation";
import { HeroSection } from "@/components/marketing/HeroSection";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { LiveNetworkStats } from "@/components/marketing/LiveNetworkStats";
import { SupportedChains } from "@/components/marketing/SupportedChains";
import { UseCases } from "@/components/marketing/UseCases";
import { DeveloperQuickStart } from "@/components/marketing/DeveloperQuickStart";
import { Footer } from "@/components/marketing/Footer";

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
