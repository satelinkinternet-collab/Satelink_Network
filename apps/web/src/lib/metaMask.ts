import { toast } from 'sonner';

/**
 * Interface for the Ethereum provider API (EIP-1193)
 */
interface EthereumProvider {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    isMetaMask?: boolean;
}

/**
 * Check if MetaMask (or compatible wallet) is installed
 */
export function isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && !!(window as any).ethereum;
}

/**
 * Connect to MetaMask and get the active account
 */
export async function connectMetaMask(): Promise<string | null> {
    if (!isMetaMaskInstalled()) {
        toast.error('MetaMask not found. Please install the extension.');
        window.open('https://metamask.io/download/', '_blank');
        return null;
    }

    try {
        const provider = (window as any).ethereum as EthereumProvider;
        const accounts = await provider.request({ method: 'eth_requestAccounts' });

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts authorized');
        }

        return accounts[0];
    } catch (error: any) {
        if (error.code === 4001) {
            toast.info('Connection rejected by user');
        } else {
            console.error('MetaMask connection error:', error);
            toast.error('Failed to connect wallet');
        }
        return null;
    }
}

/**
 * Request a personal signature from MetaMask
 */
export async function signMessageMetaMask(address: string, message: string): Promise<string | null> {
    if (!isMetaMaskInstalled()) return null;

    try {
        const provider = (window as any).ethereum as EthereumProvider;
        const signature = await provider.request({
            method: 'personal_sign',
            params: [message, address],
        });
        return signature;
    } catch (error: any) {
        if (error.code === 4001) {
            toast.info('Signature rejected');
        } else {
            console.error('MetaMask signature error:', error);
            toast.error('Failed to sign message');
        }
        return null;
    }
}
