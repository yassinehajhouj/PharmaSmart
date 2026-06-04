import { Table, Badge, Spinner } from 'react-bootstrap';
import { FaTrophy } from 'react-icons/fa';

/**
 * Renders a two-row comparison table (Prophet vs XGBoost) for one medicine.
 *
 * Props:
 *   metrics    – ComparisonResponse.metrics filtered to the selected medicine
 *   loading    – boolean
 */
export default function ModelMetricsTable({ metrics, loading }) {
  if (loading) {
    return (
      <div className="text-center py-4 text-muted">
        <Spinner animation="border" size="sm" className="me-2" />
        Calcul des métriques en cours…
      </div>
    );
  }

  if (!metrics?.length) return null;

  // Find best model by RMSE
  const sorted = [...metrics].sort((a, b) => a.RMSE - b.RMSE);
  const bestModel = sorted[0]?.model;

  return (
    <Table borderless hover size="sm" className="mb-0" style={{ fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
          <th style={{ color: '#888', fontWeight: 500 }}>Modèle</th>
          <th className="text-center" style={{ color: '#888', fontWeight: 500 }}>MAE</th>
          <th className="text-center" style={{ color: '#888', fontWeight: 500 }}>RMSE</th>
          <th className="text-center" style={{ color: '#888', fontWeight: 500 }}>MAPE</th>
          <th className="text-center" style={{ color: '#888', fontWeight: 500 }}>Statut</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(row => {
          const isBest = row.model === bestModel;
          return (
            <tr
              key={row.model}
              style={{
                backgroundColor: isBest ? 'rgba(11,110,79,0.04)' : 'transparent',
              }}
            >
              <td>
                <span
                  className="fw-bold"
                  style={{ color: row.model === 'Prophet' ? '#0B6E4F' : '#E67E22' }}
                >
                  {row.model}
                </span>
              </td>
              <td className="text-center">{row.MAE.toFixed(2)}</td>
              <td className="text-center fw-bold">{row.RMSE.toFixed(2)}</td>
              <td className="text-center">{row.MAPE.toFixed(1)} %</td>
              <td className="text-center">
                {isBest ? (
                  <Badge
                    style={{ backgroundColor: '#0B6E4F', fontSize: 10 }}
                    className="d-inline-flex align-items-center gap-1"
                  >
                    <FaTrophy size={9} /> Meilleur
                  </Badge>
                ) : (
                  <Badge bg="light" text="secondary" style={{ fontSize: 10 }}>
                    —
                  </Badge>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={5} style={{ fontSize: 10, color: '#aaa', paddingTop: 6 }}>
            Évaluation sur les 30 derniers jours de données historiques (hold-out).
            MAE = erreur absolue moyenne · RMSE = racine de l'erreur quadratique · MAPE = erreur en %.
          </td>
        </tr>
      </tfoot>
    </Table>
  );
}
