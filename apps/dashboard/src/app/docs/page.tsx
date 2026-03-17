import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SectionContainer } from "@/components/ui/SectionContainer";
import Link from "next/link";
import { BookOpen, Terminal, Coins, Layers, Scale } from "lucide-react";

export default function DocsPage() {
    const categories = [
        {
            title: "Node Setup",
            description: "Requirements, deployment guides, and troubleshooting for node operators.",
            icon: <Terminal className="w-6 h-6 text-emerald-400" />,
            href: "/run-node"
        },
        {
            title: "API Reference",
            description: "Complete REST and gRPC API documentation for dApp developers and enterprise integrators.",
            icon: <BookOpen className="w-6 h-6 text-blue-400" />,
            href: "/developers"
        },
        {
            title: "Economics Spec",
            description: "Mathematical breakdown of the 50/50 revenue split, treasury distribution, and epoch logic.",
            icon: <Coins className="w-6 h-6 text-amber-400" />,
            href: "/economics"
        },
        {
            title: "Settlement Spec",
            description: "Detailed architecture of the Settlement Adapter Registry and ledger recording mechanisms.",
            icon: <Layers className="w-6 h-6 text-purple-400" />,
            href: "/settlement"
        },
        {
            title: "Governance Spec",
            description: "Slashing parameters, jailing logic, and administrative override controls.",
            icon: <Scale className="w-6 h-6 text-red-400" />,
            href: "/governance"
        }
    ];

    return (
        <MarketingLayout>
            <SectionContainer className="pt-32">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Documentation Hub</h1>
                <p className="text-xl text-muted mb-16 max-w-2xl">
                    Everything you need to utilize, build on, or operate the Satelink verifiable infrastructure network.
                </p>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
                    {categories.map((c, i) => (
                        <Link key={i} href={c.href} className="p-8 bg-surface border border-border rounded-2xl group hover:border-zinc-500 transition-colors block">
                            <div className="mb-6 p-4 rounded-xl bg-card inline-flex">
                                {c.icon}
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">{c.title}</h2>
                            <p className="text-zinc-400 text-sm leading-relaxed">{c.description}</p>
                        </Link>
                    ))}
                </div>

                <div className="p-8 bg-card border border-border rounded-2xl text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Need help?</h2>
                    <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
                        If you couldn't find what you're looking for, our engineering team is available on Discord to assist with deployments and enterprise integrations.
                    </p>
                    <a href="https://discord.gg/satelink" target="_blank" rel="noopener noreferrer" className="text-blue-400 font-medium hover:text-blue-300">
                        Join the Developer Discord →
                    </a>
                </div>
            </SectionContainer>
        </MarketingLayout>
    );
}
