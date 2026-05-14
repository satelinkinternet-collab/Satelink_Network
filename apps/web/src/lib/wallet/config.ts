import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon } from 'wagmi/chains';

export const CLAIMS_CONTRACT = '0xE475c53B88190FD2130dB1E37504991EFe283fb0';
export const POLYGON_CHAIN_ID = 137;

export const wagmiConfig = getDefaultConfig({
  appName: 'Satelink Network',
  projectId: 'satelink-depin-network',
  chains: [polygon],
  ssr: true,
});
