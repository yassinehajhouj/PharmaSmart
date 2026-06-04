import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Badge, Button, Spinner, Table, Alert,
} from 'react-bootstrap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  FaArrowDown, FaArrowUp, FaMinus, FaExclamationTriangle,
  FaBoxes, FaCalendarTimes, FaChartBar, FaSync,
} from 'react-icons/fa';
import NavbarPharmacie from '../../components/NavbarPharmacie';
import mlService from '../../services/mlService';

// ─── constants ───────────────────────────────────────────────────────────────

const PERIODS = [
  { label: '30 jours',  value: 30 },
  { label: '90 jours',  value: 90 },
  { label: '180 jours', value: 180 },
];

function riskColor(score) {
  if (score >= 70) return '#E74C3C';
  if (score >= 40) return '#F39C12';
  return '#27AE60';
}

function riskLabel(score) {
  if (score >= 70) return { text: 'Critique', bg: 'danger' };
  if (score >= 40) return { text: 'Modéré',   bg: 'warning' };
  return              { text: 'Faible',    bg: 'success' };
}

function TrendBadge({ tendance }) {
  if (tendance === 'BAISSE')
    return <Badge bg="danger"   className="d-inline-flex align-items-center gap-1"><FaArrowDown size={9} />Baisse</Badge>;
  if (tendance === 'HAUSSE')
    return <Badge bg="success"  className="d-inline-flex align-items-center gap-1"><FaArrowUp size={9} />Hausse</Badge>;
  return   <Badge bg="secondary" className="d-inline-flex align-items-center gap-1"><FaMinus size={9} />Stable</Badge>;
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function LowSellers() {
  const [period,   setPeriod]   = useState(90);
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = useCallback(async p => {
    setLoading(true);
    setError('');
    try {
      const res = await mlService.getLowSellers(p, 20);
      setData(res.data);
    } catch {
      setError('Impossible de charger l\'analyse des faibles ventes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  // ─── summary stats ───────────────────────────────────────────────────────

  const critical  = data.filter(d => d.score_risque >= 70).length;
  const moderate  = data.filter(d => d.score_risque >= 40 && d.score_risque < 70).length;
  const declining = data.filter(d => d.tendance === 'BAISSE').length;
  const maxNoSale = data.reduce((m, d) => Math.max(m, d.jours_depuis_derniere_vente ?? 0), 0);

  // Top 10 for bar chart
  const chartData = data.slice(0, 10).map(d => ({
    nom:   d.medicament_nom.length > 18 ? d.medicament_nom.slice(0, 17) + '…' : d.medicament_nom,
    total: d.quantite_totale,
    score: d.score_risque,
  }));

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarPharmacie />

      <Container className="py-4">
        {/* ── Header ── */}
        <div className="d-flex align-items-start justify-content-between mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
              <FaExclamationTriangle style={{ color: '#E74C3C' }} />
              Médicaments à faibles ventes
            </h2>
            <p className="text-muted mb-0">
              Détection des médicaments peu vendus avec score de risque et tendance
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            {PERIODS.map(p => (
              <Button
                key={p.value}
                size="sm"
                variant={period === p.value ? 'dark' : 'outline-secondary'}
                onClick={() => setPeriod(p.value)}
                style={{ borderRadius: 8 }}
              >
                {p.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => load(period)}
              disabled={loading}
              style={{ borderRadius: 8 }}
              title="Actualiser"
            >
              <FaSync />
            </Button>
          </div>
        </div>

        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

        {/* ── KPI cards ── */}
        <Row className="g-3 mb-4">
          {[
            { label: 'Médicaments analysés', value: data.length, icon: <FaBoxes size={20} />, color: '#1B4965' },
            { label: 'Risque critique',       value: critical,    icon: <FaExclamationTriangle size={20} />, color: '#E74C3C' },
            { label: 'Risque modéré',         value: moderate,    icon: <FaChartBar size={20} />, color: '#F39C12' },
            { label: 'En baisse',             value: declining,   icon: <FaArrowDown size={20} />, color: '#9B59B6' },
            { label: 'Max jours sans vente',  value: `${maxNoSale} j`, icon: <FaCalendarTimes size={20} />, color: '#E67E22' },
          ].map((k, i) => (
            <Col key={i} xs={6} md={4} lg={2} style={{ flex: '1 1 160px' }}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="py-3 text-center">
                  <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-2"
                    style={{ width: 40, height: 40, backgroundColor: k.color + '18', color: k.color }}>
                    {k.icon}
                  </div>
                  <div className="fw-bold fs-5">{k.value}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{k.label}</div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {loading ? (
          <div className="text-center py-5">
            <Spinner style={{ color: '#0B6E4F' }} />
            <div className="text-muted mt-3">Analyse des ventes en cours…</div>
          </div>
        ) : data.length === 0 ? (
          <Card className="border-0 shadow-sm text-center py-5">
            <Card.Body>
              <FaBoxes size={48} className="mb-3" style={{ color: '#dee2e6' }} />
              <h5 className="text-muted">Aucun médicament à faible vente détecté</h5>
              <p className="text-muted" style={{ fontSize: 13 }}>
                Toutes les références présentent un volume de ventes satisfaisant sur les {period} derniers jours.
              </p>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-4">
            {/* ── Bar chart ── */}
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white fw-bold border-0 pt-3" style={{ fontSize: 14 }}>
                  <FaChartBar className="me-2" style={{ color: '#1B4965' }} />
                  Volume des ventes (top 10)
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      layout="vertical"
                      data={chartData}
                      margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="nom" tick={{ fontSize: 10 }} width={120} />
                      <RTooltip
                        formatter={(v, n) => [v, n === 'total' ? 'Unités vendues' : 'Score risque']}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="total" name="total" radius={[0, 4, 4, 0]}>
                        {chartData.map((d, i) => (
                          <Cell key={i} fill={riskColor(d.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            {/* ── Table ── */}
            <Col lg={7}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white fw-bold border-0 pt-3" style={{ fontSize: 14 }}>
                  <FaExclamationTriangle className="me-2" style={{ color: '#E74C3C' }} />
                  Détail — {period} derniers jours
                </Card.Header>
                <div style={{ overflowX: 'auto' }}>
                  <Table hover className="mb-0" style={{ fontSize: 13 }}>
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">Médicament</th>
                        <th>Total vendu</th>
                        <th>Moy/jour</th>
                        <th>Sans vente</th>
                        <th>Tendance</th>
                        <th>Risque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, i) => {
                        const risk = riskLabel(row.score_risque);
                        return (
                          <tr key={i} style={{ verticalAlign: 'middle' }}>
                            <td className="ps-3">
                              <div className="fw-semibold">{row.medicament_nom}</div>
                            </td>
                            <td>{row.quantite_totale}</td>
                            <td>{row.quantite_moy_jour?.toFixed(2)}</td>
                            <td>
                              {row.jours_depuis_derniere_vente != null
                                ? `${row.jours_depuis_derniere_vente} j`
                                : '—'}
                            </td>
                            <td><TrendBadge tendance={row.tendance} /></td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    backgroundColor: riskColor(row.score_risque),
                                    flexShrink: 0,
                                  }}
                                />
                                <Badge bg={risk.bg}>{risk.text}</Badge>
                                <span className="text-muted" style={{ fontSize: 11 }}>
                                  {row.score_risque.toFixed(0)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
                <Card.Footer className="bg-white border-0 text-muted" style={{ fontSize: 11 }}>
                  Score de risque 0–100 : Critique ≥ 70 · Modéré ≥ 40 · Faible &lt; 40
                </Card.Footer>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
}
