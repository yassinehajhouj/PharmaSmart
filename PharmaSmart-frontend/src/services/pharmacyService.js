import api from './api';

const pharmacyService = {
    // Profil pharmacie
    getMyPharmacy: async () => {
        const response = await api.get('/pharmacies/profiles/my_pharmacy/');
        return response.data;
    },

    updatePharmacy: async (data) => {
        const response = await api.put('/pharmacies/profiles/my_pharmacy/', data);
        return response.data;
    },

    // Personnel
    getPersonnel: async () => {
        const response = await api.get('/pharmacies/personnel/');
        return response.data;
    },

    addPersonnel: async (data) => {
        const response = await api.post('/pharmacies/personnel/', data);
        return response.data;
    },

    // Fournisseurs
    getFournisseurs: async () => {
        const response = await api.get('/inventory/fournisseurs/');
        return response.data;
    },

    // Promotions
    getPromotions: async () => {
        const response = await api.get('/inventory/promotions/');
        return response.data;
    },

    getPromotionsActives: async () => {
        const response = await api.get('/inventory/promotions/actives/');
        return response.data;
    },
};

export default pharmacyService;
