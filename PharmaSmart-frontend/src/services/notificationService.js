import api from './api';

const notificationService = {
    // Récupérer toutes les notifications
    getNotifications: async () => {
        const response = await api.get('/notifications/');
        return response.data;
    },

    // Notifications non lues
    getNonLues: async () => {
        const response = await api.get('/notifications/non_lues/');
        return response.data;
    },

    // Compter les non lues
    getCount: async () => {
        const response = await api.get('/notifications/count/');
        return response.data;
    },

    // Marquer comme lu
    marquerLu: async (id) => {
        const response = await api.post(`/notifications/${id}/marquer_lu/`);
        return response.data;
    },

    // Tout marquer comme lu
    toutMarquerLu: async () => {
        const response = await api.post('/notifications/tout_marquer_lu/');
        return response.data;
    },

    // Envoyer un ping temps réel (test WebSocket)
    ping: async () => {
        const response = await api.post('/notifications/ping/');
        return response.data;
    },
};

export default notificationService;