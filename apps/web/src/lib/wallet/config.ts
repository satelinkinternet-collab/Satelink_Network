import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon } from 'wagmi/chains';

export const CLAIMS_CONTRACT = '0xE475c53B88190FD2130dB1E37504991EFe283fb0';
export const POLYGON_CHAIN_ID = 137;

// WalletConnect Project ID — get your own at cloud.walletconnect.com
// Fallback is a community test ID, works but may have rate limits
const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_ID ||
  'b56e18d47c72ab683b10814fe9495694';

export const wagmiConfig = getDefaultConfig({
  appName: 'Satelink Network',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [polygon],
  ssr: false, // Disable SSR to prevent hydration mismatches
});
