const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:8080' });

api.interceptors.request.use((config) => {
    // emulate browser
    const token = "mock_token";
    if (token) {
        if (config.headers && typeof config.headers.set === 'function') {
            config.headers.set('Authorization', `Bearer ${token}`);
        } else {
            config.headers = config.headers || {};
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    console.log("Interceptor headers:", config.headers);
    return config;
});

api.get('/me/settings').catch(e => console.error("Error status:", e.response?.status));
