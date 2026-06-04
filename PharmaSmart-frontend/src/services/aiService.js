import api from './api';

const aiService = {
    // Chat
    sendMessage: async (messageOrPayload, conversationId = null) => { // dans cette etape on peut soit envoyer 
    // un message simple ou un payload 
    // plus complexe qui peut inclure des informations supplémentaires comme le medicament ou l'intent
        const data = typeof messageOrPayload === 'string'
            ? { message: messageOrPayload }
            : { ...messageOrPayload };

        if (conversationId && !data.conversation_id) {
            data.conversation_id = conversationId;
        }

        const response = await api.post('/ai/chat/', data); // on envoie le message ou le payload à 
        // l'endpoint de chat de notre backend
        return response.data;
    },

    // Conversations
    getConversations: async () => {
        const response = await api.get('/ai/conversations/');
        return response.data;
    },

    getConversationById: async (id) => {
        const response = await api.get(`/ai/conversations/${id}/`);
        return response.data;
    },

    // Prédictions
    getPredictions: async () => {
        const response = await api.get('/ai/predictions/');
        return response.data;
    },

    genererPrediction: async (medicamentId, typePrediction = 'DEMANDE') => {
        const response = await api.post('/ai/predictions/generer/', {
            medicament_id: medicamentId,
            type_prediction: typePrediction,
        });
        return response.data;
    },
};

export default aiService;