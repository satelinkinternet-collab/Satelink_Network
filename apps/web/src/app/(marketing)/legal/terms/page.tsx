export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";

export default function TermsPage() {
  return (
    <>
      <Navigation />
      <main className="pt-24 pb-16">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto">
            <h1 className="heading-xl mb-4">Terms of Service</h1>
            <p className="text-[var(--text-muted)] mb-12">Last updated: April 2026</p>

            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="heading-md mb-4">1. Acceptance of Terms</h2>
                <p className="text-body">
                  By accessing or using Satelink Network (&quot;Service&quot;), you agree to be bound by these
                  Terms of Service. If you do not agree, do not use the Service.
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">2. Description of Service</h2>
                <p className="text-body">
                  Satelink provides decentralized RPC infrastructure for blockchain networks. The Service
                  includes API access, WebSocket connections, and related developer tools.
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">3. API Usage</h2>
                <ul className="list-disc pl-6 space-y-2 text-body">
                  <li>You must not exceed your tier&apos;s rate limits</li>
                  <li>API keys are non-transferable and for your use only</li>
                  <li>You must not use the Service for illegal activities</li>
                  <li>You must not attempt to circumvent rate limiting or security measures</li>
                  <li>Excessive abuse may result in immediate termination</li>
                </ul>
              </section>

              <section>
                <h2 className="heading-md mb-4">4. Node Operator Agreement</h2>
                <p className="text-body mb-4">
                  If you operate a node on the Satelink network:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-body">
                  <li>You must maintain minimum uptime requirements (95%)</li>
                  <li>Your node must serve accurate blockchain data</li>
                  <li>Earnings are calculated based on requests processed and quality metrics</li>
                  <li>Minimum claim threshold is 1 USDT</li>
                  <li>Claims are settled on Polygon Network</li>
                  <li>Fraudulent behavior results in permanent ban and forfeiture of earnings</li>
                </ul>
              </section>

              <section>
                <h2 className="heading-md mb-4">5. Settlement Terms</h2>
                <p className="text-body">
                  All payments are made in USDT on Polygon Network. Revenue is split: 50% to node
                  operators, 30% to platform operations, 20% to distribution pool. Settlement occurs
                  at the end of each epoch. Gas fees for claims are paid by the claimant.
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">6. Disclaimer of Warranties</h2>
                <p className="text-body">
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE
                  100% UPTIME, SPECIFIC LATENCY, OR UNINTERRUPTED ACCESS. USE AT YOUR OWN RISK.
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">7. Limitation of Liability</h2>
                <p className="text-body">
                  Satelink shall not be liable for any indirect, incidental, special, or consequential
                  damages, including lost profits or data, arising from your use of the Service.
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">8. Termination</h2>
                <p className="text-body">
                  We may terminate or suspend access to the Service immediately, without notice, for
                  conduct that we believe violates these Terms or is harmful to other users or us.
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">9. Changes to Terms</h2>
                <p className="text-body">
                  We reserve the right to modify these Terms at any time. Continued use of the Service
                  after changes constitutes acceptance of the new Terms.
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">10. Contact</h2>
                <p className="text-body">
                  For questions about these Terms, contact us at{" "}
                  <a href="mailto:satelinknetwork@gmail.com" className="text-[var(--brand-primary)] hover:underline">
                    satelinknetwork@gmail.com
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
