import api from './api';

const catalogService = {
    getCategories: async () => {
        const { data } = await api.get('/catalog/categories/');
        return data;
    },

    getMedicaments: async () => {
        const { data } = await api.get('/catalog/medicaments/');
        return data;
    },

    getMedicamentById: async (id) => {
        const { data } = await api.get(`/catalog/medicaments/${id}/`);
        return data;
    },

    getMedicamentsByCategorie: async (categorieId) => {
        const { data } = await api.get('/catalog/medicaments/par_categorie/', {
            params: { categorie_id: categorieId },
        });
        return data;
    },

    // GET /api/catalog/medicaments/?search=query
    // Recherche côté serveur (nom, description, principe_actif, dosage)
    searchMedicaments: async (query) => {
        const { data } = await api.get('/catalog/medicaments/', {
            params: { search: query },
        });
        return data;
    },

    // GET /api/inventory/global-stocks/?name=query
    // Stock global par médicament (toutes pharmacies approuvées)
    // Retourne : [{ medicament, total_stock, details: [{pharmacie, quantite}] }]
    getGlobalStock: async (name) => {
        const { data } = await api.get('/inventory/global-stocks/', {
            params: { name },
        });
        return data;
    },

    // GET /api/search/?q=query
    // Recherche centralisée : médicaments + stock total + détail par pharmacie
    // Retourne : [{ id, nom, categorie, total_stock, disponible_dans: [...] }]
    searchCentral: async (q, { lat, lng } = {}) => {
        const params = { q };
        if (lat != null) params.lat = lat;
        if (lng != null) params.lng = lng;
        const { data } = await api.get('/search/', { params });
        return data;
    },

    // GET /api/search/recommend/?q=query[&lat=lat&lng=lng]
    // Recommandation intelligente : pharmacies scorées pour un médicament donné
    // Retourne : { medicament: string, results: [{ pharmacie, ville, distance, prix, quantite, date_expiration, score, is_best_choice }] }
    searchRecommended: async (q, { lat, lng } = {}) => {
        const params = { q };
        if (lat != null) params.lat = lat;
        if (lng != null) params.lng = lng;
        const { data } = await api.get('/search/recommend/', { params });
        return data;
    },

    // GET /api/catalog/medicaments/pharmacies-proches/?q&lat&lng[&rayon]
    // Pharmacies triées par temps de trajet (Haversine + OSRM)
    // Retourne : { medicament, results: [{ nom_pharmacie, ville, distance_km, duree_minutes, stock, prix, horaires_ouverture, itineraire_url }] }
    getPharmaciesProches: async (q, lat, lng, rayon = 50) => {
        const { data } = await api.get('/catalog/medicaments/pharmacies-proches/', {
            params: { q, lat, lng, rayon },
        });
        return data;
    },
};

export default catalogService;
