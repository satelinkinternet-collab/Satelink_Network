"use client";


import Link from "next/link";

export default function DashboardLanding() {
  return (
    <div className="min-h-screen bg-[#2C3333] text-[#CBE4DE] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Satelink Dashboard</h1>
          <p className="text-[#8FB5B0]">Select a dashboard to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardCard
            href="/dashboard/operator"
            title="Node Operator"
            description="View earnings, claim USDT rewards, check reputation score"
            icon="⚡"
            color="#0E8388"
          />
          <DashboardCard
            href="/dashboard/admin"
            title="Admin"
            description="Revenue overview, network health, settlement history"
            icon="🔐"
            color="#0E8388"
            badge="Protected"
          />
          <DashboardCard
            href="/dashboard/network"
            title="Network Status"
            description="Live provider status, chain health, uptime metrics"
            icon="🌐"
            color="#4ADE80"
            badge="Public"
          />
        </div>

        <div className="mt-12 text-center">
          <p className="text-[#8FB5B0] text-sm">
            Mainnet Contracts on Polygon
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-3">
            <ContractLink name="Registry" address="0x27D7320d5786D5B4B4dE8aAAC6cf62338ADeC037" />
            <ContractLink name="Distributor" address="0x8a9CefBD801574806a634aF179f538ABB5926F5a" />
            <ContractLink name="Claims" address="0x6987921e2453f360e314e4424F6c2789F10a1CC9" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  href,
  title,
  description,
  icon,
  color,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-[#1A3C3C] border border-[#0E838840] rounded-xl p-6 hover:border-[#0E8388] transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        {badge && (
          <span
            className="text-xs px-2 py-1 rounded"
            style={{ background: `${color}20`, color }}
          >
            {badge}
          </span>
        )}
      </div>
      <h2 className="text-xl font-semibold mb-2 group-hover:text-[#0E8388] transition-colors">
        {title}
      </h2>
      <p className="text-[#8FB5B0] text-sm">{description}</p>
      <div className="mt-4 text-sm" style={{ color }}>
        Open dashboard →
      </div>
    </Link>
  );
}

function ContractLink({ name, address }: { name: string; address: string }) {
  return (
    <a
      href={`https://polygonscan.com/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-mono text-[#8FB5B0] hover:text-[#0E8388] transition-colors"
    >
      {name}: {address.slice(0, 6)}...{address.slice(-4)}
    </a>
  );
}
