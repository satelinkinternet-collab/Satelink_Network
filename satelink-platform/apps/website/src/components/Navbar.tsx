'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();

    const links = [
        { name: 'Products', href: '/products' },
        { name: 'Developers', href: '/developers' },
        { name: 'Node Operators', href: '/node-operators' },
        { name: 'Network', href: '/network' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'Docs', href: '/docs' }
    ];

    return (
        <header className="fixed top-0 w-full z-50 bg-[#0F172A]/90 backdrop-blur-sm border-b border-[#1F2937]">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#2563EB] flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <span className="font-semibold text-[#E5E7EB] tracking-tight">Satelink</span>
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-6">
                    {links.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`text-sm font-medium transition-colors ${pathname === link.href
                                    ? 'text-[#2563EB]'
                                    : 'text-[#9CA3AF] hover:text-[#E5E7EB]'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/node-operators"
                        className="hidden md:block text-sm font-medium text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors"
                    >
                        Run Node
                    </Link>
                    <Link
                        href="/developers"
                        className="px-4 py-2 text-sm font-medium bg-[#2563EB] text-white rounded-md hover:bg-[#1d4ed8] transition-colors"
                    >
                        Start Building
                    </Link>
                </div>
            </div>
        </header>
    );
}
