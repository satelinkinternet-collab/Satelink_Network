import axios, { AxiosInstance, AxiosError } from 'axios';
import { getActiveAddress, signMessage } from './embeddedWallet';

/**
 * Phase H1 — Session Continuity (Auto-Reauth)
 * A custom axios instance that handles 401 errors by silently re-authenticating.
 */

const apiClient: AxiosInstance = axios.create({
    baseURL: '/api', // Proxied via next.config.ts
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Required for httpOnly cookies
});

// Flag to prevent re-auth loops
let isReauthenticating = false;

/**
 * Silently re-authenticate using the embedded wallet
 */
async function silentReauth(): Promise<boolean> {
    if (isReauthenticating) return false;
    isReauthenticating = true;

    try {
        const address = await getActiveAddress();
        if (!address) return false;

        // 1. Get Nonce
        const startRes = await axios.post('/auth/embedded/start', { address });
        if (!startRes.data.ok) return false;

        const { nonce, message_template, created_at } = startRes.data;
        const message = message_template
            .replace('${nonce}', nonce)
            .replace('${address}', address)
            .replace('${timestamp}', created_at || Date.now());

        // 2. Sign
        const signature = await signMessage(message);

        // 3. Finish (Sets new httpOnly cookie)
        const finishRes = await axios.post('/auth/embedded/finish', { address, signature });

        return !!finishRes.data.ok;
    } catch (e) {
        console.error('[API] Silent re-auth failed:', e);
        return false;
    } finally {
        isReauthenticating = false;
    }
}

// Response interceptor for 401 handling
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config;

        // If 401 and not already retried
        if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
            (originalRequest as any)._retry = true;

            const success = await silentReauth();
            if (success) {
                // Retry the original request
                return apiClient(originalRequest);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
