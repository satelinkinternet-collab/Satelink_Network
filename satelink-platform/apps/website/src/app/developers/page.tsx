import { Terminal, Key, Cpu } from 'lucide-react';
import Link from 'next/link';
import SystemPanel from '@/components/SystemPanel';

export default function DevelopersPage() {
    return (
        <div className="max-w-5xl mx-auto px-6 space-y-20 pb-20 pt-20">

            <header className="text-center pt-20">
                <div className="inline-block px-3 py-1 border border-[#00d9ff] text-[#00d9ff] font-mono text-[10px] tracking-widest bg-[#00d9ff]/10 glow-blue mb-8">
                    SYS_MODULE: DEVELOPER_INTEGRATION
                </div>
                <h1 className="text-4xl md:text-5xl font-['Orbitron'] font-bold text-white mb-6 tracking-widest text-glow-cyan uppercase">
                    Developer Integration
                </h1>
                <p className="text-xl font-mono text-[#94a3b8] max-w-2xl mx-auto leading-relaxed uppercase tracking-widest">
                    Initialize your environment and establish a secure connection to the network.
                </p>
            </header>

            <section className="grid md:grid-cols-2 gap-8">
                {/* Authentication Panel */}
                <SystemPanel title="AUTHENTICATION" glowColor="cyan" className="flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                        <Key className="w-6 h-6 text-[#22d3ee]" />
                        <h2 className="text-xl font-['Orbitron'] font-bold text-white tracking-widest">ACCESS_KEY</h2>
                    </div>
                    <p className="font-mono text-[12px] text-[#94a3b8] mb-8 leading-relaxed uppercase tracking-wider flex-grow">
                        Generate an encrypted API key to authenticate requests against the core infrastructure routing layer.
                    </p>
                    <button className="w-full px-6 py-3 bg-[#22d3ee]/10 border border-[#22d3ee] text-[#22d3ee] font-mono text-[12px] tracking-widest rounded-none hover:bg-[#22d3ee] hover:text-[#020617] transition-all uppercase glow-cyan">
                        Generate Key
                    </button>
                </SystemPanel>

                {/* cURL Example Panel */}
                <SystemPanel title="DIRECT_CONNECTION" glowColor="blue" className="flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                        <Terminal className="w-6 h-6 text-[#00d9ff]" />
                        <h2 className="text-xl font-['Orbitron'] font-bold text-white tracking-widest">CURL_TEST</h2>
                    </div>
                    <p className="font-mono text-[12px] text-[#94a3b8] mb-6 uppercase tracking-wider">Execute a secure transmission to verify routing capability:</p>

                    <div className="bg-[#020617] border border-[#1e3a8a] rounded-none p-6 font-mono text-sm relative flex-grow overflow-x-auto shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-[#1e3a8a] text-[10px] text-[#94a3b8] uppercase font-bold tracking-wider">
                            BASH
                        </div>
                        <div className="text-[#E5E7EB] space-y-2 pt-2 text-[12px]">
                            <div><span className="text-[#ff2d55]">curl</span> <span className="text-[#00d9ff]">https://rpc.satelink.network/ethereum</span> \</div>
                            <div className="pl-4">-H <span className="text-[#ff7a00]">&quot;Authorization: Bearer YOUR_API_KEY&quot;</span> \</div>
                            <div className="pl-4">-H <span className="text-[#ff7a00]">&quot;Content-Type: application/json&quot;</span> \</div>
                            <div className="pl-4">-d <span className="text-[#ff7a00]">&apos;&#123;&quot;jsonrpc&quot;:&quot;2.0&quot;,&quot;method&quot;:&quot;eth_blockNumber&quot;,&quot;params&quot;:[],&quot;id&quot;:1&#125;&apos;</span></div>
                        </div>
                    </div>
                </SystemPanel>
            </section>

            {/* SDK Integration */}
            <SystemPanel title="SDK_INITIALIZATION" glowColor="orange" className="p-8 md:p-12">
                <div className="flex items-center gap-3 mb-8">
                    <Cpu className="w-8 h-8 text-[#ff7a00]" />
                    <h2 className="text-2xl font-['Orbitron'] font-bold text-white tracking-widest">CORE_SDK</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-12 items-start">
                    <div>
                        <p className="font-mono text-[#94a3b8] text-[12px] leading-relaxed mb-6 uppercase tracking-wider">
                            For production environments, initialize the Satelink Core SDK to ensure resilient routing, automatic failovers, and cryptographic response validation.
                        </p>
                        <div className="bg-[#020617] border border-[#1e3a8a] p-4 font-mono text-sm mb-8 flex items-center justify-between shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                            <span className="text-[#E5E7EB]">npm <span className="text-[#94a3b8]">install</span> @satelink/core-sdk</span>
                            <button className="text-[#00d9ff] hover:text-white text-[10px] tracking-widest font-semibold px-3 py-1 bg-[#00d9ff]/10 border border-[#0ea5e9] transition-colors">COPY</button>
                        </div>
                        <Link
                            href="/docs"
                            className="inline-block w-full text-center px-8 py-3 bg-[#1e3a8a]/30 border border-[#1e3a8a] text-[#94a3b8] font-mono tracking-widest hover:border-[#00d9ff] hover:text-[#00d9ff] transition-all uppercase text-[12px]"
                        >
                            Read Full Documentation
                        </Link>
                    </div>

                    <div className="bg-[#020617] border border-[#ff7a00]/30 p-6 font-mono text-sm relative overflow-x-auto h-full flex flex-col justify-center shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] text-[12px]">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-[#ff7a00]/20 border-b border-l border-[#ff7a00]/30 text-[10px] text-[#ff7a00] uppercase font-bold tracking-wider">
                            TYPESCRIPT
                        </div>
                        <div className="text-[#E5E7EB] space-y-1 pt-4">
                            <div><span className="text-[#ff2d55]">import</span> &#123; SatelinkSystem &#125; <span className="text-[#ff2d55]">from</span> <span className="text-[#00d9ff]">&apos;@satelink/core-sdk&apos;</span>;</div>
                            <br />
                            <div><span className="text-[#22d3ee]">const</span> terminal = <span className="text-[#ff7a00]">new</span> SatelinkSystem(&#123;</div>
                            <div className="pl-4"><span className="text-[#94a3b8]">apiKey:</span> process.env.SATELINK_KEY,</div>
                            <div className="pl-4"><span className="text-[#94a3b8]">network:</span> <span className="text-[#00d9ff]">&apos;mainnet&apos;</span>,</div>
                            <div className="pl-4"><span className="text-[#94a3b8]">requireProofs:</span> <span className="text-[#ff7a00]">true</span></div>
                            <div>&#125;);</div>
                            <br />
                            <div className="text-[#64748b]">&#123;/* Initialize telemetry tracking */&#125;</div>
                            <div><span className="text-[#22d3ee]">await</span> terminal.<span className="text-[#00d9ff]">connect</span>();</div>
                        </div>
                    </div>
                </div>
            </SystemPanel>

        </div>
    );
}
