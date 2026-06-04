import api from './api';

const orderService = {
    // Panier
    getPanier: async () => {
        const response = await api.get('/orders/panier/mon_panier/');
        return response.data;
    },

    ajouterAuPanier: async (medicamentId, quantite = 1, stockId = null) => {
        const payload = { quantite };
        if (stockId) {
            payload.stock_id = stockId;
        } else {
            payload.medicament_id = medicamentId;
        }
        const response = await api.post('/orders/panier/ajouter/', payload);
        return response.data;
    },

    retirerDuPanier: async (itemId) => {
        const response = await api.post('/orders/panier/retirer/', {
            item_id: itemId,
        });
        return response.data;
    },

    viderPanier: async () => {
        const response = await api.post('/orders/panier/vider/');
        return response.data;
    },

    // Pharmacies disponibles pour le panier
    getPharmaciesDisponibles: async () => {
        const response = await api.get('/orders/panier/pharmacies_disponibles/');
        return response.data;
    },

    // Commandes
    getCommandes: async () => {
        const response = await api.get('/orders/commandes/');
        return response.data;
    },

    getCommandeById: async (id) => {
        const response = await api.get(`/orders/commandes/${id}/`);
        return response.data;
    },

    creerCommande: async (pharmacieId, modeLivraison, adresseLivraison = '') => {
        const response = await api.post('/orders/commandes/creer_depuis_panier/', {
            pharmacie_id: pharmacieId,
            mode_livraison: modeLivraison,
            adresse_livraison: adresseLivraison,
        });
        return response.data;
    },

    // Ordonnances
    getOrdonnances: async () => {
        const response = await api.get('/orders/ordonnances/');
        return response.data;
    },

    uploadOrdonnance: async (formData) => {
        const response = await api.post('/orders/ordonnances/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
};

export default orderService;