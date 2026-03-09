import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
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
