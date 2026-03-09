import Link from 'next/link';
import NetworkStats from '@/components/NetworkStats';
import ProductCards from '@/components/ProductCards';
import { ArrowRight, Terminal } from 'lucide-react';
import TelemetryCircle from '@/components/TelemetryCircle';

export default function Home() {
  return (
    <div className="flex flex-col gap-32">
      {/* Hero Section */}
      <section className="relative text-center pt-32 pb-20 overflow-hidden">
        {/* Animated Telemetry Graphics in Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl flex justify-between opacity-20 pointer-events-none blur-[2px] -z-10">
          <TelemetryCircle label="SYS_LOAD" value="42%" percentage={42} color="cyan" />
          <div className="mt-32">
            <TelemetryCircle label="NET_TRAFFIC" value="89%" percentage={89} color="blue" />
          </div>
        </div>

        <div className="inline-block px-3 py-1 border border-[#00d9ff] text-[#00d9ff] font-mono text-[10px] tracking-widest bg-[#00d9ff]/10 glow-blue mb-8">
          SYS_STATUS: ONLINE
        </div>
        <h1 className="text-5xl md:text-7xl font-['Orbitron'] font-bold text-white mb-6 tracking-widest text-glow-cyan">
          SATELINK INFRASTRUCTURE <br />
          <span className="text-[#00d9ff]">NETWORK</span>
        </h1>
        <p className="text-xl font-mono text-[#94a3b8] max-w-2xl mx-auto mb-10 leading-relaxed uppercase tracking-widest">
          Autonomous infrastructure for RPC, compute, automation, and machine APIs.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link
            href="/developers"
            className="px-8 py-3 bg-[#0ea5e9]/20 border border-[#00d9ff] text-[#00d9ff] font-mono tracking-widest hover:bg-[#00d9ff] hover:text-[#020617] transition-all flex items-center gap-2 glow-blue uppercase"
          >
            Start Building <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/docs"
            className="px-8 py-3 bg-[#06122e] border border-[#1e3a8a] text-[#94a3b8] font-mono tracking-widest hover:bg-[#1e3a8a] transition-all uppercase"
          >
            Acess Terminal
          </Link>
        </div>
      </section>

      {/* Network Stats */}
      <section className="panel-hud p-8 md:p-12 border-[#1e3a8a]">
        <div className="text-center mb-10 border-b border-[#1e3a8a] pb-6">
          <h2 className="text-2xl font-['Orbitron'] font-bold text-white mb-2 tracking-widest">GLOBAL NETWORK STATUS</h2>
          <p className="font-mono text-[10px] text-[#00d9ff] uppercase tracking-widest">Real-time telemetry from the edge infrastructure</p>
        </div>
        <NetworkStats />
      </section>

      {/* Developer Quick Start */}
      <section className="panel-hud border-[#0ea5e9] rounded-2xl p-8 md:p-12 overflow-hidden relative">
        <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[#ff7a00] bg-[#ff7a00]/10 text-[#ff7a00] text-[10px] font-mono tracking-widest mb-6 uppercase glow-orange">
              <Terminal className="w-4 h-4" /> Terminal Access
            </div>
            <h2 className="text-3xl font-['Orbitron'] font-bold text-white mb-4 tracking-widest">INTEGRATE INSTANTLY</h2>
            <p className="font-mono text-[#94a3b8] text-sm leading-relaxed mb-8 uppercase tracking-widest">
              Swap out your existing RPC endpoint and instantly gain access to globally distributed, load-balanced infrastructure. No vendor lock-in, just pure performance.
            </p>
            <Link
              href="/developers"
              className="text-[#00d9ff] font-mono tracking-widest hover:text-white transition-colors flex items-center gap-2 uppercase text-glow-blue"
            >
              Init Dev Flow <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-[#020617] border border-[#1e3a8a] p-6 font-mono text-sm relative">
            <div className="absolute top-0 right-0 w-4 h-4 border-l border-b border-[#00d9ff]"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-r border-t border-[#00d9ff]"></div>

            <div className="flex items-center gap-2 mb-4 border-b border-[#1e3a8a] pb-4">
              <span className="text-[#94a3b8] text-[10px] tracking-widest uppercase">sys_terminal_instance_01</span>
            </div>
            <div className="text-[#E5E7EB] space-y-2">
              <div><span className="text-[#ff2d55]">curl</span> <span className="text-[#00d9ff]">https://rpc.satelink.network/ethereum</span> \</div>
              <div className="pl-4">-H <span className="text-[#ff7a00]">&quot;Content-Type: application/json&quot;</span> \</div>
              <div className="pl-4">-d <span className="text-[#ff7a00]">&apos;{`{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}`}&apos;</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Products */}
      <section>
        <div className="mb-10 text-center border-b border-[#1e3a8a] pb-6">
          <h2 className="text-3xl font-['Orbitron'] font-bold text-white mb-4 tracking-widest">CORE PROTOCOLS</h2>
          <p className="font-mono text-[10px] text-[#94a3b8] max-w-2xl mx-auto uppercase tracking-widest">
            DECENTRALIZED WORKLOAD MODULES
          </p>
        </div>
        <ProductCards />
      </section>

      {/* Node Operator CTA */}
      <section className="text-center panel-hud border-[#22d3ee] p-12 relative overflow-hidden group hover:glow-cyan transition-all">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-[#22d3ee] opacity-10 blur-[120px] rounded-full pointer-events-none group-hover:opacity-20 transition-opacity"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-['Orbitron'] font-bold text-white mb-4 tracking-widest">SYS_PROVIDER_NETWORK</h2>
          <p className="font-mono text-[#94a3b8] text-sm max-w-2xl mx-auto mb-8 uppercase tracking-widest">
            Deploy an edge node in your data center and earn protocol rewards for routing traffic and executing workloads.
          </p>
          <Link
            href="/node-operators"
            className="px-8 py-3 bg-[#00d9ff]/20 border border-[#00d9ff] text-[#00d9ff] font-mono tracking-widest hover:bg-[#00d9ff] hover:text-[#020617] inline-flex items-center gap-2 transition-all uppercase glow-blue"
          >
            Deploy Node Agent <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

    </div>
  );
}
