import axios from 'axios';

const getBaseUrl = () => {
    // In production or via proxy, we want relative paths so Next.js rewrites handle it.
    // If NEXT_PUBLIC_API_BASE_URL is set, use it. Otherwise, default to '' (truly relative).
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
};

const api = axios.create({
    baseURL: getBaseUrl(),
});

// Request interceptor to add JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('satelink_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
