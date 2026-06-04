/**
 * Client for the standalone FastAPI ML forecasting service (port 8001).
 * This service has no auth requirement — it is an internal microservice.
 * Kept intentionally separate from api.js (Django / port 8000) so the two
 * backends never share interceptors or credentials.
 */

import axios from 'axios';

const ML_BASE = 'http://127.0.0.1:8001/api/v1';

const mlApi = axios.create({
  baseURL: ML_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000, // inference can take a moment on first cold hit
});

const forecastingService = {
  /** Check whether the ML service is up and models are loaded. */
  getHealth: () => mlApi.get('/health').then(r => r.data),

  /** List medicines that have trained models. */
  getMedicines: () => mlApi.get('/medicines').then(r => r.data),

  /**
   * Fetch demand forecasts.
   * @param {string}  medicine  - medicine name (must match training data)
   * @param {number}  horizon   - days to forecast (1–365)
   * @param {string}  model     - "prophet" | "xgboost" | "both"
   */
  getForecast: (medicine, horizon = 30, model = 'both') =>
    mlApi
      .post('/forecast', { medicine, horizon, model })
      .then(r => r.data),

  /**
   * Get MAE / RMSE / MAPE comparison for all medicines.
   * May take 30–60 s on first call (runs evaluation internally).
   */
  getComparison: () => mlApi.get('/compare').then(r => r.data),

  /** XGBoost feature importances for one medicine. */
  getFeatureImportance: medicine =>
    mlApi.get(`/feature-importance/${encodeURIComponent(medicine)}`).then(r => r.data),

  /**
   * Trigger a full re-training of all models.
   * This is a long-running operation (~2–5 min).
   */
  triggerTraining: (evaluate = false) =>
    mlApi
      .post('/train', { evaluate, test_days: 30 }, { timeout: 600000 })
      .then(r => r.data),
};

export default forecastingService;
