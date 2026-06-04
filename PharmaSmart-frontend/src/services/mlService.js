/**
 * ML Module API service.
 * All requests are authenticated via the main api.js axios instance
 * (JWT token injected automatically).
 */
import api from './api';

const mlService = {
    /** Summary stats + last training info for the pharmacy dashboard. */
    getDashboard: () =>
        api.get('/ml/dashboard/'),

    /**
     * Trigger model training for the current pharmacy.
     * May take 30–120 seconds – uses a 5-minute timeout.
     */
    train: () =>
        api.post('/ml/train/', {}, { timeout: 300_000 }),

    /**
     * Get demand predictions for a medicine.
     * @param {number} medicamentId
     * @param {number} horizon  - number of future days (7 / 14 / 30 / 60 / 90)
     */
    predict: (medicamentId, horizon = 30) =>
        api.get('/ml/predictions/', { params: { medicament_id: medicamentId, horizon } }),

    /**
     * Get low-selling medicines analysis.
     * @param {number} period - look-back period in days (30 / 90 / 180)
     * @param {number} limit  - max rows returned
     */
    getLowSellers: (period = 90, limit = 20) =>
        api.get('/ml/low-sellers/', { params: { period, limit } }),

    /** List medicines in stock with model availability flag. */
    getMedicines: () =>
        api.get('/ml/medicines/'),

    /**
     * Auto-rank ALL stocked medicines by predicted future sales.
     * Returns top_performers, low_performers, saison_info.
     * @param {number} horizon - days to forecast (7 / 14 / 30 / 60 / 90)
     */
    getOverview: (horizon = 30) =>
        api.get('/ml/overview/', { params: { horizon } }),

    /** Stored model metrics (MAE / RMSE / MAPE) for the pharmacy. */
    getMetrics: () =>
        api.get('/ml/metrics/'),

    /** Training run history. */
    getTrainingRuns: () =>
        api.get('/ml/training-runs/'),

    /**
     * Feature importances from a trained model.
     * @param {number} medicamentId
     * @param {'xgboost'|'random_forest'} model
     */
    getFeatureImportance: (medicamentId, model = 'xgboost') =>
        api.get('/ml/feature-importance/', { params: { medicament_id: medicamentId, model } }),
};

export default mlService;
