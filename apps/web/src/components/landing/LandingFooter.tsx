import Link from "next/link";

export function LandingFooter() {
    return (
        <footer className="bg-black border-t border-white/10 py-12 md:py-24">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div>
                        <h3 className="font-bold text-white mb-4">Product</h3>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><Link href="/preview/landing/download" className="hover:text-white">Download Node</Link></li>
                            <li><Link href="#" className="hover:text-white">API Docs</Link></li>
                            <li><Link href="#" className="hover:text-white">Status</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4">Company</h3>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><Link href="/preview/landing/about" className="hover:text-white">About</Link></li>
                            <li><Link href="#" className="hover:text-white">Blog</Link></li>
                            <li><Link href="#" className="hover:text-white">Careers</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4">Legal</h3>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><Link href="/preview/landing/terms" className="hover:text-white">Terms of Service</Link></li>
                            <li><Link href="/preview/landing/privacy" className="hover:text-white">Privacy Policy</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4">Social</h3>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><Link href="#" className="hover:text-white">Twitter / X</Link></li>
                            <li><Link href="#" className="hover:text-white">Discord</Link></li>
                            <li><Link href="#" className="hover:text-white">GitHub</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-zinc-500 text-sm">© 2026 Satelink Network. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
