import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";

export default function CookiesPage() {
  return (
    <>
      <Navigation />
      <main className="pt-24 pb-16">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto">
            <h1 className="heading-xl mb-4">Cookie Policy</h1>
            <p className="text-[var(--text-muted)] mb-12">Last updated: April 2026</p>

            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="heading-md mb-4">What Are Cookies</h2>
                <p className="text-body">
                  Cookies are small text files stored on your device when you visit a website. They
                  help websites remember your preferences and understand how you use the site.
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">Cookies We Use</h2>
                <div className="space-y-6">
                  <div className="glass-card p-4">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-2">Essential Cookies</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">
                      Required for the Service to function. Cannot be disabled.
                    </p>
                    <ul className="text-sm text-[var(--text-muted)] space-y-1">
                      <li>• Session cookies (authentication state)</li>
                      <li>• Security cookies (CSRF protection)</li>
                    </ul>
                  </div>

                  <div className="glass-card p-4">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-2">Analytics Cookies</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">
                      Help us understand how visitors use our site.
                    </p>
                    <ul className="text-sm text-[var(--text-muted)] space-y-1">
                      <li>• Google Analytics (_ga, _gid) — Page views, traffic sources</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="heading-md mb-4">Cookies We Do NOT Use</h2>
                <ul className="list-disc pl-6 space-y-2 text-body">
                  <li>
                    <strong>Advertising/Tracking cookies:</strong> We do not use cookies for ad
                    targeting or cross-site tracking
                  </li>
                  <li>
                    <strong>Third-party social cookies:</strong> No Facebook, Twitter, or social
                    media tracking pixels
                  </li>
                  <li>
                    <strong>Fingerprinting:</strong> We do not use browser fingerprinting techniques
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="heading-md mb-4">Managing Cookies</h2>
                <p className="text-body mb-4">
                  You can control cookies through your browser settings:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-body">
                  <li>
                    <a
                      href="https://support.google.com/chrome/answer/95647"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--brand-primary)] hover:underline"
                    >
                      Chrome
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--brand-primary)] hover:underline"
                    >
                      Firefox
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--brand-primary)] hover:underline"
                    >
                      Safari
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--brand-primary)] hover:underline"
                    >
                      Edge
                    </a>
                  </li>
                </ul>
                <p className="text-body mt-4">
                  Note: Blocking essential cookies may prevent the Service from working correctly.
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">Google Analytics Opt-Out</h2>
                <p className="text-body">
                  To opt out of Google Analytics tracking across all websites, install the{" "}
                  <a
                    href="https://tools.google.com/dlpage/gaoptout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--brand-primary)] hover:underline"
                  >
                    Google Analytics Opt-out Browser Add-on
                  </a>
                  .
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">Changes to This Policy</h2>
                <p className="text-body">
                  We may update this Cookie Policy from time to time. Changes will be posted on this
                  page with an updated revision date.
                </p>
              </section>

              <section>
                <h2 className="heading-md mb-4">Contact</h2>
                <p className="text-body">
                  Questions about cookies? Contact{" "}
                  <a
                    href="mailto:satelinknetwork@gmail.com"
                    className="text-[var(--brand-primary)] hover:underline"
                  >
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
