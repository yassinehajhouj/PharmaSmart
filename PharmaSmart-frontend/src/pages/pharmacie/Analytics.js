import { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Badge, Alert, Spinner } from 'react-bootstrap';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { FaChartLine, FaChartBar, FaChartPie, FaBoxOpen, FaTrophy } from 'react-icons/fa';
import NavbarPharmacie from '../../components/NavbarPharmacie';
import reportService from '../../services/reportService';

const emptyAnalytics = {
  kpis: { ca: 0, medicaments_vendus: 0, panier_moyen: 0, valeur_stock: 0 },
  changes: { ca: 0, medicaments_vendus: 0, panier_moyen: 0, valeur_stock: 0 },
  revenue_evolution: [],
  sales_by_category: [],
  daily_sales: [],
  stock_by_category: [],
  top_medicaments: [],
};

function formatMad(value) {
  return `${Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD`;
}

function formatChange(value) {
  const number = Number(value || 0);
  return `${number > 0 ? '+' : ''}${number}% vs période précédente`;
}

function EmptyState({ message }) {
  return (
    <div className="text-center text-muted py-4">
      <FaBoxOpen size={28} className="mb-2 opacity-75" />
      <div>{message}</div>
    </div>
  );
}

function Analytics() {
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await reportService.getData('month', 'analytics');
        setAnalytics({ ...emptyAnalytics, ...response.data });
      } catch (err) {
        setError(err.response?.data?.error || "Impossible de charger les statistiques réelles.");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const kpis = analytics.kpis || emptyAnalytics.kpis;
  const changes = analytics.changes || emptyAnalytics.changes;
  const topMedicaments = analytics.top_medicaments || [];
  const maxTopSales = Math.max(...topMedicaments.map((med) => med.total_vendu || 0), 1);

  const kpiCards = useMemo(() => ([
    { label: 'CA ce mois', value: formatMad(kpis.ca), change: changes.ca, color: '#0B6E4F' },
    { label: 'Médicaments vendus', value: Number(kpis.medicaments_vendus || 0).toLocaleString('fr-FR'), change: changes.medicaments_vendus, color: '#1B4965' },
    { label: 'Panier moyen', value: formatMad(kpis.panier_moyen), change: changes.panier_moyen, color: '#14A76C' },
    { label: 'Valeur du stock', value: formatMad(kpis.valeur_stock), change: changes.valeur_stock, color: '#F39C12' },
  ]), [kpis, changes]);

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarPharmacie />

      <Container className="py-4">
        <div className="mb-4">
          <h2 className="fw-bold mb-1">Analytics & Statistiques</h2>
          <p className="text-muted mb-0">Analyse détaillée de l'activité de votre pharmacie</p>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color: '#0B6E4F' }} />
            <p className="text-muted mt-3">Chargement des statistiques réelles...</p>
          </div>
        ) : (
          <>
            <Row className="g-3 mb-4">
              {kpiCards.map((kpi, i) => (
                <Col md={3} key={i}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body className="py-3">
                      <small className="text-muted">{kpi.label}</small>
                      <h4 className="fw-bold mb-0">{kpi.value}</h4>
                      <small style={{ color: Number(kpi.change) >= 0 ? '#0B6E4F' : '#E74C3C' }}>
                        {formatChange(kpi.change)}
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            <Row className="g-3 mb-4">
              <Col md={8}>
                <Card className="border-0 shadow-sm">
                  <Card.Header className="bg-white fw-bold border-0 pt-3">
                    <FaChartLine className="me-2" style={{ color: '#0B6E4F' }} />
                    Évolution du chiffre d'affaires (6 derniers mois)
                  </Card.Header>
                  <Card.Body>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analytics.revenue_evolution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mois" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatMad(value)} />
                        <Area type="monotone" dataKey="ca" stroke="#0B6E4F" fill="#0B6E4F" fillOpacity={0.15} strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={4}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className="bg-white fw-bold border-0 pt-3">
                    <FaChartPie className="me-2" style={{ color: '#1B4965' }} />
                    Ventes par catégorie
                  </Card.Header>
                  <Card.Body className="d-flex flex-column align-items-center">
                    {analytics.sales_by_category.length === 0 ? (
                      <EmptyState message="Aucune vente enregistrée ce mois." />
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={analytics.sales_by_category}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                            style={{ fontSize: '11px' }}
                          >
                            {analytics.sales_by_category.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value} unités`} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="g-3 mb-4">
              <Col md={6}>
                <Card className="border-0 shadow-sm">
                  <Card.Header className="bg-white fw-bold border-0 pt-3">
                    <FaChartBar className="me-2" style={{ color: '#14A76C' }} />
                    Ventes par jour de la semaine
                  </Card.Header>
                  <Card.Body>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analytics.daily_sales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="jour" />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={(value) => `${value} unités`} />
                        <Bar dataKey="ventes" fill="#14A76C" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="border-0 shadow-sm">
                  <Card.Header className="bg-white fw-bold border-0 pt-3">
                    <FaBoxOpen className="me-2" style={{ color: '#1B4965' }} />
                    Valeur du stock par catégorie
                  </Card.Header>
                  <Card.Body>
                    {analytics.stock_by_category.length === 0 ? (
                      <EmptyState message="Aucun stock enregistré pour cette pharmacie." />
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={analytics.stock_by_category}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="categorie" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatMad(value)} />
                          <Bar dataKey="valeur" fill="#1B4965" radius={[5, 5, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white fw-bold border-0 pt-3">
                <FaTrophy className="me-2" style={{ color: '#F39C12' }} />
                Top médicaments vendus ce mois
              </Card.Header>
              <Card.Body>
                {topMedicaments.length === 0 ? (
                  <EmptyState message="Aucun médicament vendu ce mois." />
                ) : (
                  topMedicaments.slice(0, 5).map((med, i) => (
                    <div key={med.medicament__nom} className="d-flex align-items-center mb-3">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold"
                        style={{ width: '35px', height: '35px', backgroundColor: i < 3 ? '#0B6E4F' : '#e0e0e0', color: i < 3 ? 'white' : '#666', fontSize: '14px' }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-bold">{med.medicament__nom}</span>
                          <div>
                            <Badge bg="light" text="dark" className="me-2">{med.total_vendu} ventes</Badge>
                            <Badge style={{ backgroundColor: '#0B6E4F' }}>{formatMad(med.total_revenu)}</Badge>
                          </div>
                        </div>
                        <div className="progress mt-1" style={{ height: '6px' }}>
                          <div className="progress-bar" style={{ width: `${((med.total_vendu || 0) / maxTopSales) * 100}%`, backgroundColor: '#0B6E4F' }} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </Card.Body>
            </Card>
          </>
        )}
      </Container>
    </div>
  );
}

export default Analytics;
