import { useUserMode } from '../../hooks/useUserMode';

interface PublicIdentityProps {
    wallet: string; // The raw 0x wallet address
    publicId?: string; // The SLK- ID (optional, fetch if missing or rely on parent)
    className?: string;
}

export function PublicIdentity({ wallet, publicId, className = '' }: PublicIdentityProps) {
    const { mode } = useUserMode();

    // If in SIMPLE mode, show Public ID (SLK-...)
    // If in ADVANCED mode, show 0x...

    // If we don't have publicId passed in, we might need to derive it or show wallet as fallback
    // For now, assume it's passed or available in localStorage from the hook sync
    const storedPublicId = typeof window !== 'undefined' ? localStorage.getItem('satelink_public_id') : null;
    const effectivePublicId = publicId || storedPublicId || 'SLK-????';

    if (mode === 'SIMPLE') {
        return (
            <span className={`font-mono text-emerald-400 ${className}`} title={wallet}>
                {effectivePublicId}
            </span>
        );
    }

    return (
        <span className={`font-mono text-zinc-400 ${className}`} title={effectivePublicId}>
            {wallet.substring(0, 6)}...{wallet.substring(wallet.length - 4)}
        </span>
    );
}
