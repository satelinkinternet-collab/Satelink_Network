import axios from "axios";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const API_BASE_URL = (() => {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
    if (configured && configured.trim()) return trimTrailingSlash(configured.trim());

    if (typeof window !== "undefined") {
        return `${window.location.protocol}//${window.location.hostname}:8080`;
    }

    return "http://localhost:8080";
})();

export function buildApiUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
}

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
        "X-API-Call": "1",
    },
});

// ✅ Request interceptor — FIXED TOKEN KEY
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = window.localStorage.getItem("satelink_token");

        if (token) {
            config.headers = config.headers || {};
            config.headers["Authorization"] = `Bearer ${token}`;
            // Debug: verify token attachment for protected endpoints
            if (config.url && (config.url.includes('/admin') || config.url.includes('/node') || config.url.includes('/builder') || config.url.includes('/dist') || config.url.includes('/ent'))) {
                console.log(`[AUTH] Token attached to ${config.method?.toUpperCase()} ${config.url} | token=${token.substring(0, 20)}...`);
            }
        } else {
            if (config.url && !config.url.includes('/auth/') && !config.url.includes('/health') && !config.url.includes('/api/network')) {
                console.warn(`[AUTH] No token for ${config.method?.toUpperCase()} ${config.url} — request may get 401`);
            }
        }

        // Admin endpoints (optional)
        if (config.url?.includes("/api/demand/metrics")) {
            const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY;
            if (adminKey) {
                config.headers = config.headers || {};
                config.headers["X-Admin-Key"] = adminKey;
            }
        }
    }

    return config;
});

// ✅ Response interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;

        // 🔥 Handle auth failure
        if (response?.status === 401) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("satelink_token");
                if (window.location.pathname !== "/login") {
                    window.location.href = "/login";
                }
            }
            return Promise.reject(error);
        }

        // 🔁 Retry logic (GET only)
        if (
            config &&
            config.method === "get" &&
            (!config._retryCount || config._retryCount < 2)
        ) {
            const isRetryable =
                !response || (response.status >= 500 && response.status <= 599);

            if (isRetryable) {
                config._retryCount = (config._retryCount || 0) + 1;

                const backoff = config._retryCount * 500;
                await new Promise((resolve) => setTimeout(resolve, backoff));

                return api(config);
            }
        }

        return Promise.reject({
            message:
                error.response?.data?.error ||
                error.message ||
                "Unexpected error",
            status: error.response?.status || 0,
            ok: false,
        });
    }
);

export default api;
