'use client';

interface Plan {
  name: string;
  price: string;
  requests: string;
  features: string[];
  badge?: string;
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    requests: '200 req/day',
    features: [
      'Public RPC access',
      '6 chains supported',
      'Rate limited',
      'Community support',
    ],
  },
  {
    name: 'Basic',
    price: '$9/mo',
    requests: '10K req/day',
    features: [
      'Dedicated API key',
      'All chains',
      'Higher rate limits',
      'Email support',
    ],
    badge: 'COMING SOON',
  },
  {
    name: 'Pro',
    price: '$49/mo',
    requests: '100K req/day',
    features: [
      'Priority routing',
      'All chains + archive',
      'No rate limits',
      '24/7 support',
      'Custom endpoints',
    ],
    badge: 'COMING SOON',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    requests: 'Unlimited',
    features: [
      'Dedicated nodes',
      'SLA guarantee',
      'Custom chains',
      'Direct integration',
      'Account manager',
    ],
    badge: 'CONTACT US',
  },
];

export default function PlansPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[15px] font-semibold text-[#B0E4CC]">Pricing Plans</h1>
        <p className="text-[11px] text-[#285A48] mt-0.5">
          Choose the right plan for your RPC needs
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`bg-[#0c1a17] border rounded-md p-5 relative ${
              plan.highlight
                ? 'border-[#408A71] shadow-[0_0_20px_rgba(64,138,113,0.15)]'
                : 'border-[#1a3028]'
            }`}
          >
            {plan.badge && (
              <span
                className={`absolute top-3 right-3 text-[8px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                  plan.badge === 'COMING SOON'
                    ? 'bg-[#1a1a0f] text-[#a0a030] border border-[#3a3e18]'
                    : 'bg-[#0f2e1a] text-[#408A71] border border-[#285A48]'
                }`}
              >
                {plan.badge}
              </span>
            )}

            <h2 className="text-[14px] font-semibold text-[#B0E4CC] mb-1">{plan.name}</h2>
            <p className="text-[24px] font-bold font-mono text-[#00D1FF] mb-1">{plan.price}</p>
            <p className="text-[11px] text-[#408A71] mb-4">{plan.requests}</p>

            <ul className="space-y-2">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-[11px] text-[#B0E4CC]">
                  <span className="w-1 h-1 rounded-full bg-[#408A71]" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              className={`w-full mt-5 py-2 rounded text-[11px] font-semibold transition-colors ${
                plan.name === 'Free'
                  ? 'bg-[#408A71] text-[#091413] hover:bg-[#4fa07f]'
                  : 'bg-[#091413] text-[#408A71] border border-[#285A48] hover:border-[#408A71] cursor-not-allowed opacity-60'
              }`}
              disabled={plan.name !== 'Free'}
            >
              {plan.name === 'Free' ? 'Current Plan' : 'Coming Soon'}
            </button>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-5">
        <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">Note</p>
        <p className="text-[11px] text-[#408A71] leading-relaxed">
          Paid plans are launching soon. Currently all users have free tier access with 200 requests/day.
          Node operators earn revenue from the free tier through the 50/30/20 split model.
        </p>
      </div>
    </div>
  );
}
