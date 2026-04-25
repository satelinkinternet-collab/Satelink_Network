import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";

export default function PrivacyPage() {
  return (
    <>
      <Navigation />
      <main className="pt-24 pb-16">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto">
            <h1 className="heading-xl mb-4">Privacy Policy</h1>
            <p className="text-[var(--text-muted)] mb-12">Last updated: April 2026</p>

            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="heading-md mb-4">Data We Collect</h2>
                <p className="text-body mb-4">
                  Satelink collects minimal data necessary to provide the Service:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-body">
                  <li>
                    <strong>Email address:</strong> Only when you create an API key. Used for
                    account recovery and critical service notifications.
                  </li>
                  <li>
                    <strong>Wallet addresses:</strong> For node operators to receive USDT payments.
                    Publicly visible on-chain.
                  </li>
                  <li>
                    <strong>API usage metrics:</strong> Request counts, methods called, response times.
                    Used for billing and service improvement.
                  </li>
                  <li>
                    <strong>IP addresses:</strong> Temporarily logged for rate limiting and security.
                    Not stored long-term.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="heading-md mb-4">Data We Do NOT Collect</h2>
                <ul className="list-disc pl-6 space-y-2 text-body">
                  <li>Transaction contents or payloads</li>
                  <li>Private keys or seed phrases</li>
                  <li>Personal identification documents</li>
                  <li>Location data beyond IP geolocation</li>
                  <li>Browsing history outside our Service</li>
                </ul>
              </section>

              <section>
                <h2 className="heading-md mb-4">How We Use Data</h2>
                <ul className="list-disc pl-6 space-y-2 text-body">
                  <li>To provide and maintain the Service</li>
                  <li>To calculate billing and node operator earnings</li>
                  <li>To prevent abuse and enforce rate limits</li>
                  <li>To improve service performance and reliability</li>
                  <li>To send critical service notifications (not marketing)</li>
                </ul>
              </section>

              <section>
                <h2 className="heading-md mb-4">Data Sharing</h2>
                <p className="text-body">
                  <strong>We do not sell your data.</strong> We share data only:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-body">
                  <li>With blockchain networks (transaction data you submit)</li>
                  <li>With analytics providers (aggregated, anonymized metrics)</li>
                  <li>When required by law</li>
                </ul>
              </section>

              <section>
                <h2 className="heading-md mb-4">Data Retention</h2>
                <ul className="list-disc pl-6 space-y-2 text-body">
                  <li>Email addresses: Until account deletion</li>
                  <li>Usage metrics: 90 days rolling</li>
                  <li>IP logs: 7 days</li>
                  <li>Settlement records: Permanent (on-chain)</li>
                </ul>
              </section>

              <section>
                <h2 className="heading-md mb-4">Your Rights</h2>
                <p className="text-body">You can:</p>
                <ul className="list-disc pl-6 space-y-2 text-body">
                  <li>Request a copy of your data</li>
                  <li>Request deletion of your account and associated data</li>
                  <li>Opt out of non-essential communications</li>
                </ul>
                <p className="text-body mt-4">
                  To exercise these rights, contact{" "}
                  <a href="mailto:satelinknetwork@gmail.com" className="text-[var(--brand-primary)] hover:underline">
                    satelinknetwork@gmail.com
                  </a>
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">Security</h2>
                <p className="text-body">
                  We implement industry-standard security measures including encryption in transit
                  (TLS), secure credential storage (hashed API keys), and access controls. However,
                  no system is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">Changes to This Policy</h2>
                <p className="text-body">
                  We may update this policy from time to time. We will notify registered users of
                  significant changes via email.
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">Contact</h2>
                <p className="text-body">
                  Questions about privacy? Contact{" "}
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
