"use client";

import { useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for development and testing",
    features: [
      { text: "100 requests/day", included: true },
      { text: "All 5 chains", included: true },
      { text: "Community support", included: true },
      { text: "WebSocket", included: false },
      { text: "Priority routing", included: false },
      { text: "SLA guarantee", included: false },
    ],
    cta: "Get Started",
    href: "/developers#api-key",
    popular: false,
  },
  {
    name: "Basic",
    price: "$10",
    period: "/month",
    description: "For indie developers and small projects",
    features: [
      { text: "10,000 requests/day", included: true },
      { text: "All 5 chains", included: true },
      { text: "Email support", included: true },
      { text: "WebSocket subscriptions", included: true },
      { text: "Priority routing", included: false },
      { text: "99% SLA", included: true },
    ],
    cta: "Start Basic",
    href: "/dashboard/billing",
    popular: false,
  },
  {
    name: "Pro",
    price: "$50",
    period: "/month",
    description: "For production applications and bots",
    features: [
      { text: "100,000 requests/day", included: true },
      { text: "All 5 chains", included: true },
      { text: "Priority support", included: true },
      { text: "WebSocket subscriptions", included: true },
      { text: "Priority routing", included: true },
      { text: "99.5% SLA", included: true },
    ],
    cta: "Start Pro",
    href: "/dashboard/billing",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$200",
    period: "/month",
    description: "For high-volume production workloads",
    features: [
      { text: "1,000,000 requests/day", included: true },
      { text: "All 5 chains", included: true },
      { text: "Dedicated support", included: true },
      { text: "WebSocket subscriptions", included: true },
      { text: "Priority routing", included: true },
      { text: "99.9% SLA", included: true },
    ],
    cta: "Contact Sales",
    href: "mailto:satelinknetwork@gmail.com",
    popular: false,
  },
];

const FAQ_ITEMS = [
  {
    question: "Can I change plans anytime?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.",
  },
  {
    question: "What happens if I exceed my daily limit?",
    answer: "Requests beyond your daily limit return a 429 rate limit error. You can upgrade your plan or wait for the limit to reset at midnight UTC.",
  },
  {
    question: "Do you offer annual billing?",
    answer: "Yes, annual billing is available for Basic and above with a 20% discount. Contact us for details.",
  },
  {
    question: "Is there a free trial for paid plans?",
    answer: "The Free tier lets you test all functionality. Paid plans have a 7-day money-back guarantee.",
  },
];

export default function PricingPage() {
  const [dailyRequests, setDailyRequests] = useState(50000);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const alchemyPrice = dailyRequests <= 300 ? 0 : 49; // Alchemy Growth is $49 for >300/day
  const satelinkPrice =
    dailyRequests <= 100 ? 0 : dailyRequests <= 10000 ? 10 : dailyRequests <= 100000 ? 50 : 200;
  const savings = alchemyPrice - satelinkPrice;

  return (
    <>
      <Navigation />
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="container-marketing">
            <h1 className="heading-xl mb-6">
              Simple, transparent{" "}
              <span className="text-gradient">pricing</span>
            </h1>
            <p className="text-body-lg max-w-2xl mx-auto">
              Start free, upgrade when you need more. No hidden fees, no surprises.
            </p>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="py-16">
          <div className="container-marketing">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PRICING_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`glass-card p-6 relative ${
                    tier.popular ? "border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]" : ""
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full bg-[var(--brand-primary)] text-[var(--bg-deep)] text-xs font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                      {tier.name}
                    </h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span
                        className="text-4xl font-bold text-[var(--text-primary)]"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {tier.price}
                      </span>
                      <span className="text-[var(--text-muted)]">{tier.period}</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                      {tier.description}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        {feature.included ? (
                          <CheckIcon />
                        ) : (
                          <XIcon />
                        )}
                        <span
                          className={`text-sm ${
                            feature.included ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"
                          }`}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={tier.href}
                    className={`block text-center py-3 rounded-lg font-medium transition-colors ${
                      tier.popular
                        ? "btn-glow"
                        : "bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/30"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cost Calculator */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Cost Calculator</h2>

            <div className="max-w-2xl mx-auto glass-card p-8">
              <div className="mb-8">
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  Expected Daily Requests
                </label>
                <input
                  type="range"
                  min="100"
                  max="500000"
                  step="1000"
                  value={dailyRequests}
                  onChange={(e) => setDailyRequests(Number(e.target.value))}
                  className="w-full h-2 bg-[var(--bg-surface)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-primary)]"
                />
                <div className="flex justify-between mt-2 text-sm text-[var(--text-muted)]">
                  <span>100</span>
                  <span className="text-[var(--brand-primary)] font-semibold">
                    {dailyRequests.toLocaleString()} requests/day
                  </span>
                  <span>500K</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-[var(--bg-surface)]/50 rounded-xl border border-[var(--border-subtle)]">
                  <div className="text-sm text-[var(--text-muted)] mb-1">Satelink</div>
                  <div
                    className="text-2xl font-bold text-[var(--brand-primary)]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    ${satelinkPrice}/mo
                  </div>
                </div>
                <div className="text-center p-4 bg-[var(--bg-surface)]/50 rounded-xl border border-[var(--border-subtle)]">
                  <div className="text-sm text-[var(--text-muted)] mb-1">Alchemy</div>
                  <div
                    className="text-2xl font-bold text-[var(--text-secondary)]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    ${alchemyPrice}/mo
                  </div>
                </div>
                <div className="text-center p-4 bg-[var(--brand-accent)]/10 rounded-xl border border-[var(--brand-accent)]/20">
                  <div className="text-sm text-[var(--text-muted)] mb-1">You Save</div>
                  <div
                    className="text-2xl font-bold text-[var(--brand-accent)]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    ${Math.max(0, savings)}/mo
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-[var(--text-muted)]">
                Comparison based on publicly available pricing. Alchemy Growth tier starts at $49/month.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Frequently Asked Questions</h2>

            <div className="max-w-3xl mx-auto space-y-3">
              {FAQ_ITEMS.map((faq, index) => (
                <div key={index} className="glass-card overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="font-medium text-[var(--text-primary)]">{faq.question}</span>
                    <ChevronIcon expanded={expandedFaq === index} />
                  </button>
                  {expandedFaq === index && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-[var(--text-secondary)]">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing text-center">
            <h2 className="heading-lg mb-4">Start free, upgrade anytime</h2>
            <p className="text-body mb-8 max-w-xl mx-auto">
              No credit card required. Get 100 free requests per day and upgrade when you&apos;re ready.
            </p>
            <Link href="/developers#api-key" className="btn-glow inline-flex">
              Get Your Free API Key
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-[var(--brand-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
