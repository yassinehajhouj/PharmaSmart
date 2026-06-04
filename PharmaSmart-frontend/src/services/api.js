import axios from 'axios';

// Configuration de base
const API_URL = 'http://127.0.0.1:8000/api';

// Créer une instance Axios
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // When sending FormData, remove the hardcoded JSON Content-Type so
        // axios can set multipart/form-data with the correct boundary itself.
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Intercepteur pour gérer les erreurs et rafraîchir le token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isAuthEndpoint =
            originalRequest.url.includes('/auth/login/') ||
            originalRequest.url.includes('/auth/refresh/');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) throw new Error('No refresh token');

                const response = await axios.post(`${API_URL}/auth/refresh/`, {
                    refresh: refreshToken,
                });

                const newAccessToken = response.data.access;
                localStorage.setItem('access_token', newAccessToken);

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);

            } catch {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                window.location.href = '/connexion';
            }
        }

        return Promise.reject(error);
    }
);

export default api;