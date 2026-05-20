export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";

const COLORS = [
  { name: "Primary", var: "--brand-primary", hex: "#00D4FF", description: "Main brand color, CTAs, highlights" },
  { name: "Secondary", var: "--brand-secondary", hex: "#7B2FFF", description: "Supporting accents, gradients" },
  { name: "Accent", var: "--brand-accent", hex: "#00FF94", description: "Success states, node earnings" },
  { name: "Background Deep", var: "--bg-deep", hex: "#020814", description: "Main background" },
  { name: "Background Card", var: "--bg-card", hex: "#0A1628", description: "Card backgrounds" },
  { name: "Text Primary", var: "--text-primary", hex: "#F8FAFC", description: "Main text" },
  { name: "Text Secondary", var: "--text-secondary", hex: "#94A3B8", description: "Supporting text" },
];

const FONTS = [
  { name: "Space Grotesk", usage: "Headings", weights: "400-700", sample: "Satelink Network" },
  { name: "Inter", usage: "Body text", weights: "300-700", sample: "Decentralized RPC infrastructure" },
  { name: "JetBrains Mono", usage: "Code, addresses", weights: "400-600", sample: "0x1234...5678" },
];

export default function BrandPage() {
  return (
    <>
      <Navigation />
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="container-marketing">
            <h1 className="heading-xl mb-6">
              Brand <span className="text-gradient">Guidelines</span>
            </h1>
            <p className="text-body-lg max-w-2xl mx-auto">
              Resources and guidelines for using the Satelink brand.
            </p>
          </div>
        </section>

        {/* Logo */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Logo</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Light on dark */}
              <div className="glass-card p-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 bg-[var(--brand-primary)] rounded-xl opacity-50" />
                    <div className="absolute inset-1.5 bg-[var(--bg-deep)] rounded-lg flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="var(--brand-primary)" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                    <span className="text-[var(--text-primary)]">Sate</span>
                    <span className="text-[var(--brand-primary)]">link</span>
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)]">Primary logo on dark background</p>
              </div>

              {/* Icon only */}
              <div className="glass-card p-8 text-center">
                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 bg-[var(--brand-primary)] rounded-2xl opacity-50" />
                    <div className="absolute inset-2 bg-[var(--bg-deep)] rounded-xl flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="var(--brand-primary)" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                  </div>
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 bg-[var(--brand-primary)] rounded-xl opacity-50" />
                    <div className="absolute inset-1.5 bg-[var(--bg-deep)] rounded-lg flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="var(--brand-primary)" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                  </div>
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 bg-[var(--brand-primary)] rounded-lg opacity-50" />
                    <div className="absolute inset-1 bg-[var(--bg-deep)] rounded-md flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="var(--brand-primary)" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-muted)]">Icon variations</p>
              </div>
            </div>
          </div>
        </section>

        {/* Colors */}
        <section className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Color Palette</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 max-w-6xl mx-auto">
              {COLORS.map((color) => (
                <div key={color.var} className="glass-card p-4">
                  <div
                    className="w-full h-20 rounded-lg mb-3"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{color.name}</div>
                  <div className="text-xs font-mono text-[var(--brand-primary)]">{color.hex}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">{color.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Typography</h2>
            <div className="max-w-4xl mx-auto space-y-6">
              {FONTS.map((font) => (
                <div key={font.name} className="glass-card p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">{font.name}</div>
                      <div className="text-sm text-[var(--text-muted)]">
                        {font.usage} • Weights: {font.weights}
                      </div>
                    </div>
                    <div
                      className="text-2xl text-[var(--text-primary)]"
                      style={{
                        fontFamily:
                          font.name === "Space Grotesk"
                            ? "var(--font-heading)"
                            : font.name === "JetBrains Mono"
                            ? "var(--font-mono)"
                            : "var(--font-body)",
                      }}
                    >
                      {font.sample}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Usage Guidelines */}
        <section className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Usage Guidelines</h2>
            <div className="max-w-3xl mx-auto glass-card p-8">
              <ul className="space-y-4 text-[var(--text-secondary)]">
                <li className="flex items-start gap-3">
                  <CheckIcon />
                  <span>Always maintain minimum clear space around the logo equal to the height of the &quot;S&quot;</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon />
                  <span>Use the primary logo on dark backgrounds</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon />
                  <span>The icon can be used alone for favicons and app icons</span>
                </li>
                <li className="flex items-start gap-3">
                  <XIcon />
                  <span>Don&apos;t stretch, skew, or rotate the logo</span>
                </li>
                <li className="flex items-start gap-3">
                  <XIcon />
                  <span>Don&apos;t change the logo colors outside the brand palette</span>
                </li>
                <li className="flex items-start gap-3">
                  <XIcon />
                  <span>Don&apos;t add effects like shadows or gradients to the logo</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Download */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing text-center">
            <h2 className="heading-lg mb-4">Download Brand Assets</h2>
            <p className="text-body mb-8">
              Get logos, icons, and brand guidelines in various formats.
            </p>
            <a
              href="https://github.com/satelinkinternet-collab"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow inline-flex"
            >
              View on GitHub
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-[var(--brand-accent)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
