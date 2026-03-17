import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { CTAButton } from "@/components/ui/CTAButton";

export default function NotFoundPage() {
    return (
        <MarketingLayout>
            <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-6">
                <div className="text-9xl font-bold text-zinc-900 border border-zinc-800 bg-zinc-950 p-12 rounded-3xl mb-8 relative overflow-hidden">
                    404
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(59,130,246,0.1)_50%,transparent_75%)] bg-[length:200%_200%] animate-shimmer" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Node Not Found</h1>
                <p className="text-muted text-center max-w-md mb-8">
                    The routing endpoint you are looking for has been disconnected or does not exist on the current network topology.
                </p>
                <CTAButton href="/" variant="primary" className="px-8">
                    Return to Gateway
                </CTAButton>
            </div>
        </MarketingLayout>
    );
}
