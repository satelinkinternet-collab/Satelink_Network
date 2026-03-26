import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
});

// Request interceptor to add JWT token
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = window.localStorage.getItem("satelink_token");
        if (token) {
            if (config.headers && typeof config.headers.set === 'function') {
                config.headers.set('Authorization', `Bearer ${token}`);
            } else {
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        }

        // Admin endpoints require the admin key from environment, never hardcoded
        if (config.url?.includes('/api/demand/metrics')) {
            const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY;
            if (adminKey) {
                config.headers = config.headers || {};
                config.headers['X-Admin-Key'] = adminKey;
            }
        }
    }
    return config;
});

// Response interceptor to handle 401s and retries
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;

        // 1. Handle session expiry (401)
        if (response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('satelink_token');
                // Avoid infinite redirect loop if already on login
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
            return Promise.reject(error);
        }

        // 2. Implement Retry Logic (max 2 retries) for 5xx or Network Errors
        // Only retry GET requests (idempotent)
        if (config && config.method === 'get' && (!config._retryCount || config._retryCount < 2)) {
            const isRetryable = !response || (response.status >= 500 && response.status <= 599);
            
            if (isRetryable) {
                config._retryCount = (config._retryCount || 0) + 1;
                console.warn(`[API] Retrying request (${config._retryCount}/2): ${config.url}`);
                
                // Exponential backoff: 500ms, 1000ms
                const backoff = config._retryCount * 500;
                await new Promise(resolve => setTimeout(resolve, backoff));
                
                return api(config);
            }
        }

        // 3. Fallback: Provide a structured error object to prevent UI crashes
        const enhancedError = {
            message: error.response?.data?.error || error.message || 'An unexpected error occurred',
            status: error.response?.status || 0,
            ok: false,
            originalError: error
        };

        return Promise.reject(enhancedError);
    }
);

export default api;
