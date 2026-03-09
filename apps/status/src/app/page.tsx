export default function StatusPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-12 pb-20">
      <section className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">All Systems Operational</h1>
          <p className="text-green-400">The Satelink network is running normally across all 14 global regions.</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400 mb-1">Network Uptime (90 Days)</div>
          <div className="text-4xl font-mono font-bold text-white">99.998%</div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Active RPC Nodes</div>
          <div className="text-2xl font-bold text-white">1,842</div>
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Compute Nodes</div>
          <div className="text-2xl font-bold text-white">215</div>
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Global Avg Latency</div>
          <div className="text-2xl font-bold text-green-400 font-mono">42ms</div>
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Operations (24h)</div>
          <div className="text-2xl font-bold text-white font-mono">52.4M</div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6 bg-[#111827] p-4 rounded-xl border border-[#1F2937]">Core Services</h2>
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden divide-y divide-[#1F2937]">
            {[
              { name: "Global RPC Gateway", status: "Operational", uptime: "100%" },
              { name: "Event Webhooks Delivery", status: "Operational", uptime: "99.98%" },
              { name: "Automation Engine", status: "Operational", uptime: "100%" },
              { name: "Compute Marketplace", status: "Operational", uptime: "100%" },
              { name: "Protocol Routing", status: "Operational", uptime: "99.99%" },
            ].map((service, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <span className="font-medium text-gray-200">{service.name}</span>
                <div className="flex items-center gap-6">
                  <span className="text-gray-500 text-sm hidden sm:inline">{service.uptime}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-green-500 text-sm font-medium">{service.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6 bg-[#111827] p-4 rounded-xl border border-[#1F2937]">Regional Hubs</h2>
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden divide-y divide-[#1F2937]">
            {[
              { name: "US East (N. Virginia)", ping: "12ms", nodes: 420 },
              { name: "US West (Oregon)", ping: "28ms", nodes: 315 },
              { name: "Europe (Frankfurt)", ping: "15ms", nodes: 512 },
              { name: "Asia Pacific (Tokyo)", ping: "45ms", nodes: 280 },
              { name: "South America (São Paulo)", ping: "85ms", nodes: 120 },
            ].map((region, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <span className="font-medium text-gray-200">{region.name}</span>
                <div className="flex items-center gap-6">
                  <span className="text-gray-500 text-sm">{region.nodes} nodes</span>
                  <span className="text-green-500 font-mono text-sm w-12 text-right">{region.ping}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-12 bg-[#111827] border border-[#1F2937] rounded-xl p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-4">Past Incidents</h3>
        <p className="text-gray-400">No incidents reported in the last 30 days.</p>
      </section>
    </main>
  );
}

