"use client";
// Deploy trigger: 2026-05-20T04:40
import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";

interface CalculatorState {
  nodeType: "residential" | "vps" | "datacenter" | "gpu";
  cpuCores: number;
  ram: number;
  storage: number;
  bandwidth: number;
  rpcPercent: number;
  aiPercent: number;
  webhookPercent: number;
  uptime: number;
  latency: number;
  successRate: number;
  reputationScore: number;
  earlyAdopter: boolean;
  uptimeStreak: boolean;
  geoDiversity: boolean;
  nodeCount: number;
}

interface EarningsResult {
  grossRevenue: number;
  nodeShare: number;
  bonuses: number;
  penalties: number;
  netEarnings: number;
  estimatedCosts: number;
  netProfit: number;
  paybackMonths: number;
  requestsHandled: number;
}

const NODE_TYPE_CONFIG = {
  residential: { multiplier: 1.0, baseCost: 15, label: "Residential (Home server)" },
  vps: { multiplier: 1.5, baseCost: 20, label: "VPS (Cloud server)" },
  datacenter: { multiplier: 2.0, baseCost: 75, label: "Data Center (Enterprise)" },
  gpu: { multiplier: 3.0, baseCost: 150, label: "GPU Node (AI workloads)" },
};

const WORKLOAD_MULTIPLIERS = {
  rpc: 1.0,
  ai: 2.5,
  webhook: 1.2,
};

function calculateEarnings(state: CalculatorState): EarningsResult {
  const nodeConfig = NODE_TYPE_CONFIG[state.nodeType];

  const hardwareScore = (
    (state.cpuCores / 32) * 0.3 +
    (state.ram / 64) * 0.3 +
    (state.bandwidth / 10000) * 0.4
  );

  const baseRequestsPerMonth = 2_500_000;
  const scaledRequests = baseRequestsPerMonth * (0.4 + hardwareScore * 1.2) * nodeConfig.multiplier;

  let perfMultiplier = 1.0;
  if (state.uptime >= 99.5) perfMultiplier *= 1.2;
  else if (state.uptime >= 99) perfMultiplier *= 1.1;
  else if (state.uptime < 95) perfMultiplier *= 0.6;
  else if (state.uptime < 98) perfMultiplier *= 0.8;

  if (state.latency <= 50) perfMultiplier *= 1.15;
  else if (state.latency <= 100) perfMultiplier *= 1.05;
  else if (state.latency > 200) perfMultiplier *= 0.75;
  else if (state.latency > 150) perfMultiplier *= 0.85;

  if (state.successRate >= 99.9) perfMultiplier *= 1.1;
  else if (state.successRate < 98) perfMultiplier *= 0.7;
  else if (state.successRate < 99) perfMultiplier *= 0.85;

  const reputationMultiplier = 0.6 + (state.reputationScore / 1000) * 0.8;

  const workloadMultiplier = (
    (state.rpcPercent / 100) * WORKLOAD_MULTIPLIERS.rpc +
    (state.aiPercent / 100) * WORKLOAD_MULTIPLIERS.ai +
    (state.webhookPercent / 100) * WORKLOAD_MULTIPLIERS.webhook
  );

  const requestsHandled = scaledRequests * perfMultiplier * reputationMultiplier;

  const pricePerRequest = 0.00004;
  const grossRevenue = requestsHandled * pricePerRequest * workloadMultiplier;

  const nodeSharePercent = 0.50;
  const nodeShare = grossRevenue * nodeSharePercent;

  let bonusPercent = 0;
  if (state.earlyAdopter) bonusPercent += 10;
  if (state.uptimeStreak) bonusPercent += 5;
  if (state.geoDiversity) bonusPercent += 5;
  const bonuses = nodeShare * (bonusPercent / 100);

  let penaltyPercent = 0;
  if (state.reputationScore < 300) penaltyPercent = 25;
  else if (state.reputationScore < 500) penaltyPercent = 10;
  const penalties = nodeShare * (penaltyPercent / 100);

  const singleNodeEarnings = nodeShare + bonuses - penalties;
  const netEarnings = singleNodeEarnings * state.nodeCount;

  const estimatedCosts = nodeConfig.baseCost * state.nodeCount;
  const netProfit = netEarnings - estimatedCosts;

  const initialInvestment = estimatedCosts * 2;
  const paybackMonths = netProfit > 0 ? Math.ceil(initialInvestment / netProfit) : 0;

  return {
    grossRevenue: grossRevenue * state.nodeCount,
    nodeShare: nodeShare * state.nodeCount,
    bonuses: bonuses * state.nodeCount,
    penalties: penalties * state.nodeCount,
    netEarnings,
    estimatedCosts,
    netProfit,
    paybackMonths,
    requestsHandled: requestsHandled * state.nodeCount,
  };
}

export default function CalculatorPage() {
  const [state, setState] = useState<CalculatorState>({
    nodeType: "vps",
    cpuCores: 4,
    ram: 8,
    storage: 100,
    bandwidth: 1000,
    rpcPercent: 70,
    aiPercent: 20,
    webhookPercent: 10,
    uptime: 99.5,
    latency: 50,
    successRate: 99.8,
    reputationScore: 600,
    earlyAdopter: true,
    uptimeStreak: false,
    geoDiversity: false,
    nodeCount: 1,
  });

  const [results, setResults] = useState<EarningsResult>(() => calculateEarnings(state));

  useEffect(() => {
    setResults(calculateEarnings(state));
  }, [state]);

  const updateField = <K extends keyof CalculatorState>(
    field: K,
    value: CalculatorState[K]
  ) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  return (
    <>
      <Navigation />
      <main className="pt-14 min-h-screen" style={{ background: "var(--bg-page)" }}>
        <section className="py-16 border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Node Earnings Calculator
            </h1>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
              Estimate your monthly USDT earnings based on hardware, workload, and performance
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-[1fr_400px] gap-8">
            <div className="space-y-8">
              <Section title="Node Type">
                <select
                  value={state.nodeType}
                  onChange={(e) => updateField("nodeType", e.target.value as CalculatorState["nodeType"])}
                  className="calc-select"
                >
                  {Object.entries(NODE_TYPE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </Section>

              <Section title="Hardware Specs">
                <SliderInput
                  label="CPU Cores"
                  value={state.cpuCores}
                  min={2}
                  max={32}
                  onChange={(v) => updateField("cpuCores", v)}
                />
                <SliderInput
                  label="RAM (GB)"
                  value={state.ram}
                  min={2}
                  max={64}
                  onChange={(v) => updateField("ram", v)}
                />
                <SliderInput
                  label="Storage (GB)"
                  value={state.storage}
                  min={50}
                  max={2000}
                  step={50}
                  onChange={(v) => updateField("storage", v)}
                />
                <SliderInput
                  label="Bandwidth (Mbps)"
                  value={state.bandwidth}
                  min={100}
                  max={10000}
                  step={100}
                  onChange={(v) => updateField("bandwidth", v)}
                />
              </Section>

              <Section title="Workload Mix">
                <SliderInput
                  label="RPC Requests"
                  value={state.rpcPercent}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(v) => updateField("rpcPercent", v)}
                />
                <SliderInput
                  label="AI Inference"
                  value={state.aiPercent}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(v) => updateField("aiPercent", v)}
                />
                <SliderInput
                  label="Webhooks"
                  value={state.webhookPercent}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(v) => updateField("webhookPercent", v)}
                />
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  AI inference pays 2.5x more per request than RPC
                </p>
              </Section>

              <Section title="Performance Factors">
                <SliderInput
                  label="Uptime %"
                  value={state.uptime}
                  min={90}
                  max={100}
                  step={0.1}
                  suffix="%"
                  onChange={(v) => updateField("uptime", v)}
                />
                <SliderInput
                  label="Avg Latency (ms)"
                  value={state.latency}
                  min={20}
                  max={500}
                  onChange={(v) => updateField("latency", v)}
                />
                <SliderInput
                  label="Success Rate %"
                  value={state.successRate}
                  min={95}
                  max={100}
                  step={0.1}
                  suffix="%"
                  onChange={(v) => updateField("successRate", v)}
                />
              </Section>

              <Section title="Reputation & Bonuses">
                <SliderInput
                  label="Reputation Score"
                  value={state.reputationScore}
                  min={0}
                  max={1000}
                  onChange={(v) => updateField("reputationScore", v)}
                />
                <div className="space-y-3 mt-4">
                  <CheckboxInput
                    label="Early Adopter Bonus"
                    bonus="+10%"
                    checked={state.earlyAdopter}
                    onChange={(v) => updateField("earlyAdopter", v)}
                  />
                  <CheckboxInput
                    label="High Uptime Streak (30+ days)"
                    bonus="+5%"
                    checked={state.uptimeStreak}
                    onChange={(v) => updateField("uptimeStreak", v)}
                  />
                  <CheckboxInput
                    label="Geographic Diversity Bonus"
                    bonus="+5%"
                    checked={state.geoDiversity}
                    onChange={(v) => updateField("geoDiversity", v)}
                  />
                </div>
              </Section>

              <Section title="Scale">
                <SliderInput
                  label="Number of Nodes"
                  value={state.nodeCount}
                  min={1}
                  max={100}
                  onChange={(v) => updateField("nodeCount", v)}
                />
              </Section>
            </div>

            <div className="lg:sticky lg:top-20 h-fit space-y-6">
              <div className="calc-card">
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-6" style={{ color: "var(--text-muted)" }}>
                  Earnings Breakdown
                </h3>

                <div className="calc-highlight mb-6">
                  <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                    Net Monthly Earnings
                  </div>
                  <div className="text-4xl font-bold font-mono" style={{ color: "var(--brand-primary)" }}>
                    {formatCurrency(results.netEarnings)}
                  </div>
                  <div className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                    {formatNumber(results.requestsHandled)} requests/month
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <BreakdownRow label="Gross Revenue" value={formatCurrency(results.grossRevenue)} />
                  <BreakdownRow label="Your Share (50%)" value={formatCurrency(results.nodeShare)} />
                  <BreakdownRow label="Bonuses" value={`+${formatCurrency(results.bonuses)}`} positive />
                  <BreakdownRow label="Penalties" value={`-${formatCurrency(results.penalties)}`} negative />
                </div>

                <div className="calc-currency">
                  <div className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                    Currency Converter
                  </div>
                  <CurrencyRow code="USD" value={formatCurrency(results.netEarnings)} />
                  <CurrencyRow code="EUR" value={`€${(results.netEarnings * 0.92).toFixed(2)}`} />
                  <CurrencyRow code="INR" value={`₹${(results.netEarnings * 83).toLocaleString()}`} />
                  <CurrencyRow code="CNY" value={`¥${(results.netEarnings * 7.2).toFixed(2)}`} />
                </div>
              </div>

              <div className="calc-card">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  ROI Analysis
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <RoiItem label="Monthly Revenue" value={formatCurrency(results.netEarnings)} />
                  <RoiItem label="Est. Costs" value={formatCurrency(results.estimatedCosts)} />
                  <RoiItem label="Net Profit" value={formatCurrency(results.netProfit)} highlight={results.netProfit > 0} />
                  <RoiItem label="Payback (months)" value={results.paybackMonths > 0 ? results.paybackMonths.toString() : "N/A"} />
                </div>
              </div>

              <div className="calc-assumptions">
                <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                  Assumptions
                </h4>
                <ul className="text-xs space-y-1" style={{ color: "var(--text-secondary)" }}>
                  <li>• Base request price: $0.000040 per call</li>
                  <li>• 2.5M requests/month baseline per node</li>
                  <li>• Node operator share: 50%</li>
                  <li>• Platform fee: 30%</li>
                  <li>• Distribution pool: 20%</li>
                  <li>• Costs include VPS/electricity estimates</li>
                </ul>
              </div>
            </div>
          </div>

          <section className="text-center py-16 mt-12 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <Link
              href="https://docs.satelink.network/#node-operators"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, var(--brand-primary), var(--brand-sec))",
                color: "white",
              }}
            >
              Start Earning
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </section>
        </div>
      </main>
      <Footer />

      <style jsx>{`
        .calc-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 24px;
        }
        .calc-highlight {
          background: linear-gradient(135deg, rgba(64, 138, 113, 0.15), rgba(40, 90, 72, 0.1));
          border: 1px solid rgba(64, 138, 113, 0.3);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }
        .calc-select {
          width: 100%;
          padding: 14px 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
        }
        .calc-select:focus {
          outline: none;
          border-color: var(--brand-primary);
        }
        .calc-currency {
          background: var(--bg-elevated);
          border-radius: 12px;
          padding: 16px;
        }
        .calc-assumptions {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 20px;
        }
      `}</style>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="calc-section">
      <h3 className="text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b" style={{ color: "var(--brand-primary)", borderColor: "var(--border-subtle)" }}>
        {title}
      </h3>
      <div className="space-y-5">{children}</div>
      <style jsx>{`
        .calc-section {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 24px;
        }
      `}</style>
    </div>
  );
}

function SliderInput({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="calc-slider"
      />
      <style jsx>{`
        .calc-slider {
          width: 100%;
          height: 8px;
          -webkit-appearance: none;
          background: var(--bg-elevated);
          border-radius: 4px;
          outline: none;
        }
        .calc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: var(--brand-primary);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(64, 138, 113, 0.4);
        }
      `}</style>
    </div>
  );
}

function CheckboxInput({
  label,
  bonus,
  checked,
  onChange,
}: {
  label: string;
  bonus: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[var(--brand-primary)]"
      />
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="ml-auto text-xs font-mono" style={{ color: "var(--earn)" }}>{bonus}</span>
    </label>
  );
}

function BreakdownRow({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  let valueColor = "var(--text-primary)";
  if (positive) valueColor = "var(--earn)";
  if (negative) valueColor = "var(--error)";

  return (
    <div className="flex justify-between py-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="font-mono font-semibold" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}

function CurrencyRow({ code, value }: { code: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm">
      <span style={{ color: "var(--text-secondary)" }}>{code}</span>
      <span className="font-mono" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function RoiItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center p-4 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
      <div className="text-xl font-bold font-mono mb-1" style={{ color: highlight ? "var(--earn)" : "var(--brand-primary)" }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
