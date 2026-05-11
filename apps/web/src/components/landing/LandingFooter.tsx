import Link from "next/link";

export function LandingFooter() {
    return (
        <footer className="bg-black border-t border-white/10 py-12 md:py-24">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div>
                        <h3 className="font-bold text-white mb-4">Product</h3>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><Link href="/nodes" className="hover:text-white">Run a Node</Link></li>
                            <li><Link href="/developers" className="hover:text-white">API Docs</Link></li>
                            <li><Link href="/status" className="hover:text-white">Status</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4">Company</h3>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><Link href="/about" className="hover:text-white">About</Link></li>
                            <li><Link href="/brand" className="hover:text-white">Brand</Link></li>
                            <li><Link href="/enterprise" className="hover:text-white">Enterprise</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4">Legal</h3>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><Link href="/legal/terms" className="hover:text-white">Terms of Service</Link></li>
                            <li><Link href="/legal/privacy" className="hover:text-white">Privacy Policy</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4">Social</h3>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><Link href="https://twitter.com/satelinknetwork" className="hover:text-white">Twitter / X</Link></li>
                            <li><Link href="https://discord.gg/satelink" className="hover:text-white">Discord</Link></li>
                            <li><Link href="https://github.com/satelinkinternet-collab" className="hover:text-white">GitHub</Link></li>
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
