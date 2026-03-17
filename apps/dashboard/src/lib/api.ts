import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

// Request interceptor to add JWT token and remap API paths
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

    // Remap frontend paths to backend API routes.
    // Frontend pages live at /admin/* which conflicts with Next.js routing,
    // so API calls must use the /api/admin/* prefix to reach the backend.
    if (config.url) {
        if (config.url.startsWith('/admin-api/')) {
            config.url = config.url.replace('/admin-api/', '/api/admin/');
        } else if (config.url.startsWith('/admin/')) {
            config.url = '/api' + config.url;
        } else if (config.url === '/treasury/status') {
            config.url = '/api/admin/services/treasury/status';
        } else if (config.url === '/network-stats') {
            config.url = '/api/network/stats';
        } else if (config.url.startsWith('/api/proxy')) {
            // Inline proxy: resolve the target path directly
            const match = config.url.match(/[?&]path=([^&]+)/);
            if (match) {
                let target = decodeURIComponent(match[1]);
                if (target.startsWith('/admin-api/')) {
                    target = target.replace('/admin-api/', '/api/admin/');
                } else if (target.startsWith('/admin/')) {
                    target = '/api' + target;
                }
                config.url = target;
            }
        }
    }

    return config;
});

// Response interceptor to handle 401s
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('satelink_token');
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
