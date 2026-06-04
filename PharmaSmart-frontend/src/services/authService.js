import api from './api';

// ─── helpers privés ───────────────────────────────────────────────────────────

const _save = (access, refresh, user) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(user));
};

const _clear = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
};

// Extrait un message lisible depuis n'importe quelle erreur DRF/réseau
const _extractError = (error) => {
    // No response at all → server unreachable or CORS blocked
    if (!error.response) {
        if (error.code === 'ERR_NETWORK' || error.message?.toLowerCase().includes('network')) {
            return 'Impossible de joindre le serveur. Vérifiez que le backend Django est démarré sur le port 8000.';
        }
        return `Erreur de connexion : ${error.message || 'aucune réponse du serveur'}.`;
    }

    const { status, data } = error.response;

    // Server-side errors
    if (status === 500) return 'Erreur interne du serveur (500). Consultez les logs Django.';
    if (status === 404) return 'Endpoint introuvable (404). Vérifiez la configuration des URLs.';
    if (status === 403) {
        return (typeof data === 'object' && data?.detail)
            ? data.detail
            : 'Accès refusé. Votre compte n\'est pas autorisé pour ce rôle.';
    }

    // DRF validation errors
    if (!data) return `Erreur HTTP ${status}.`;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.non_field_errors?.[0]) return data.non_field_errors[0];

    // Field-level errors: { username: ['Ce champ est requis.'] }
    const firstKey = Object.keys(data)[0];
    if (!firstKey) return `Erreur HTTP ${status}.`;
    const firstVal = data[firstKey];
    return Array.isArray(firstVal) ? `${firstKey} : ${firstVal[0]}` : String(firstVal);
};

// ─── service ──────────────────────────────────────────────────────────────────

const authService = {

    login: async (username, password, userType = null) => {
        try {
            const payload = { username, password };
            if (userType) payload.user_type = userType;
            const { data } = await api.post('/auth/login/', payload);
            _save(data.access, data.refresh, data.user);
            return data.user;
        } catch (error) {
            throw new Error(_extractError(error));
        }
    },

    register: async (userData) => {
        try {
            const { data } = await api.post('/auth/register/', userData);
            return data;
        } catch (error) {
            throw new Error(_extractError(error));
        }
    },

    logout: () => {
        _clear();
    },

    getProfile: async () => {
        try {
            const { data } = await api.get('/auth/profile/');
            localStorage.setItem('user', JSON.stringify(data));
            return data;
        } catch (error) {
            throw new Error(_extractError(error));
        }
    },

    updateProfile: async (userData) => {
        try {
            const { data } = await api.put('/auth/profile/', userData);
            localStorage.setItem('user', JSON.stringify(data));
            return data;
        } catch (error) {
            throw new Error(_extractError(error));
        }
    },

    changePassword: async (oldPassword, newPassword) => {
        try {
            const { data } = await api.post('/auth/change-password/', {
                old_password: oldPassword,
                new_password: newPassword,
            });
            return data;
        } catch (error) {
            throw new Error(_extractError(error));
        }
    },

    isAuthenticated: () => !!localStorage.getItem('access_token'),

    getCurrentUser: () => {
        try {
            const raw = localStorage.getItem('user');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },
};

export default authService;
