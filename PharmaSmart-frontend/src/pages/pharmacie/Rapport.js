import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Badge, Button, Form, Table, Spinner, Alert,
} from 'react-bootstrap';
import {
  FaFileAlt, FaFilePdf, FaFileExcel, FaChartBar,
  FaBoxes, FaShoppingCart, FaMoneyBillWave, FaExclamationTriangle,
  FaWarehouse,
} from 'react-icons/fa';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import NavbarPharmacie from '../../components/NavbarPharmacie';
import reportService from '../../services/reportService';

// ─── constants ────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'month',   label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'year',    label: 'Cette année' },
];

const TYPES = [
  { value: 'general',  label: 'Rapport général' },
  { value: 'sales',    label: 'Rapport des ventes' },
  { value: 'stock',    label: 'Rapport de stock' },
  { value: 'orders',   label: 'Rapport des commandes' },
];

const STOCK_PALETTE = ['#0B6E4F', '#14A76C', '#2DCB85', '#48E09B', '#72EDB3', '#9DF5C7'];

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtMAD = n => (n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD';
const fmtInt = n => (n ?? 0).toLocaleString('fr-FR');

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color }) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="d-flex align-items-center gap-3 py-3">
        <div className="rounded-circle p-2 flex-shrink-0"
          style={{ backgroundColor: color + '18', color }}>
          {icon}
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: 12 }}>{label}</div>
          <div className="fw-bold" style={{ fontSize: 15 }}>{value}</div>
        </div>
      </Card.Body>
    </Card>
  );
}

function StockStatusBadge({ statut }) {
  const map = { Normal: 'success', Bas: 'warning', Rupture: 'danger' };
  return <Badge bg={map[statut] ?? 'secondary'} style={{ fontSize: 10 }}>{statut}</Badge>;
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Rapport() {
  const [period,      setPeriod]      = useState('month');
  const [reportType,  setReportType]  = useState('general');
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [exporting,   setExporting]   = useState(null); // 'pdf' | 'excel' | null

  // ── load report data ───────────────────────────────────────────────────────
  const loadData = useCallback(async (p, t) => {
    setLoading(true);
    setError('');
    try {
      const res = await reportService.getData(p, t);
      setData(res.data);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      setError(`Erreur lors du chargement des données : ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(period, reportType); }, [period, reportType, loadData]);

  // ── exports ────────────────────────────────────────────────────────────────
  const handleExport = async (fmt) => {
    setExporting(fmt);
    try {
      const res = fmt === 'pdf'
        ? await reportService.exportPDF(period, reportType)
        : await reportService.exportExcel(period, reportType);
      const ext      = fmt === 'pdf' ? 'pdf' : 'xlsx';
      const filename = `rapport_${reportType}_${period}.${ext}`;
      downloadBlob(res.data, filename);
    } catch {
      setError('Erreur lors de la génération du fichier. Réessayez.');
    } finally {
      setExporting(null);
    }
  };

  // ── derived values ─────────────────────────────────────────────────────────
  const kpis         = data?.kpis ?? {};
  const revEvolution = data?.revenue_evolution ?? [];
  const topMeds      = data?.top_medicaments ?? [];
  const stockDetails = data?.stock_details ?? [];
  const stockSummary = data?.stock_summary ?? {};
  const maxRev       = topMeds.length ? Math.max(...topMeds.map(m => m.total_revenu)) : 1;

  const periodLabel = PERIODS.find(p => p.value === period)?.label ?? period;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarPharmacie />

      <Container className="py-4">

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="fw-bold mb-1">
              <FaFileAlt className="me-2" style={{ color: '#1B4965' }} />
              Rapports
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: 13 }}>
              {data?.pharmacie && <span className="fw-semibold">{data.pharmacie}</span>}
              {data?.period_start && (
                <span className="ms-2 text-muted">
                  · du {new Date(data.period_start).toLocaleDateString('fr-FR')}
                  {' '}au {new Date(data.period_end).toLocaleDateString('fr-FR')}
                </span>
              )}
            </p>
          </div>

          {/* Export buttons */}
          <div className="d-flex gap-2">
            <Button variant="outline-danger" size="sm" onClick={() => handleExport('pdf')}
              disabled={!!exporting || loading}>
              {exporting === 'pdf'
                ? <Spinner size="sm" className="me-1" />
                : <FaFilePdf className="me-1" />}
              PDF
            </Button>
            <Button variant="outline-success" size="sm" onClick={() => handleExport('excel')}
              disabled={!!exporting || loading}>
              {exporting === 'excel'
                ? <Spinner size="sm" className="me-1" />
                : <FaFileExcel className="me-1" />}
              Excel
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-4">
            <FaExclamationTriangle className="me-2" />{error}
          </Alert>
        )}

        <Row className="g-4">

          {/* ── Filters panel ── */}
          <Col md={3}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white fw-bold border-0 pt-3" style={{ fontSize: 14 }}>
                Filtres
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Période</Form.Label>
                  <Form.Select size="sm" value={period}
                    onChange={e => setPeriod(e.target.value)}
                    style={{ borderRadius: 8 }}>
                    {PERIODS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group>
                  <Form.Label style={{ fontSize: 13, fontWeight: 600 }}>Type de rapport</Form.Label>
                  <Form.Select size="sm" value={reportType}
                    onChange={e => setReportType(e.target.value)}
                    style={{ borderRadius: 8 }}>
                    {TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <hr className="my-3" />

                {/* Stock summary */}
                {!loading && stockSummary.nb_articles > 0 && (
                  <div>
                    <div className="fw-semibold mb-2" style={{ fontSize: 12, color: '#1B4965' }}>
                      <FaWarehouse className="me-1" />Résumé stock
                    </div>
                    <div className="d-flex flex-column gap-1" style={{ fontSize: 12 }}>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Articles</span>
                        <span className="fw-semibold">{stockSummary.nb_articles}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Valeur totale</span>
                        <span className="fw-semibold text-success" style={{ fontSize: 11 }}>
                          {fmtMAD(stockSummary.total_valeur)}
                        </span>
                      </div>
                      {stockSummary.nb_rupture > 0 && (
                        <div className="d-flex justify-content-between">
                          <span className="text-danger">Ruptures</span>
                          <Badge bg="danger" style={{ fontSize: 10 }}>{stockSummary.nb_rupture}</Badge>
                        </div>
                      )}
                      {stockSummary.nb_bas > 0 && (
                        <div className="d-flex justify-content-between">
                          <span className="text-warning">Stock bas</span>
                          <Badge bg="warning" text="dark" style={{ fontSize: 10 }}>{stockSummary.nb_bas}</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* ── Main content ── */}
          <Col md={9}>
            {loading ? (
              <div className="text-center py-5">
                <Spinner style={{ color: '#1B4965', width: 40, height: 40 }} />
                <div className="text-muted mt-3">Chargement des données…</div>
              </div>
            ) : (
              <>
                {/* KPI cards */}
                <Row className="g-3 mb-4">
                  <Col sm={6} lg={3}>
                    <KpiCard label={`CA — ${periodLabel}`}
                      value={fmtMAD(kpis.ca)}
                      icon={<FaMoneyBillWave size={16} />}
                      color="#0B6E4F" />
                  </Col>
                  <Col sm={6} lg={3}>
                    <KpiCard label="Commandes traitées"
                      value={fmtInt(kpis.commandes)}
                      icon={<FaShoppingCart size={16} />}
                      color="#1B4965" />
                  </Col>
                  <Col sm={6} lg={3}>
                    <KpiCard label="Médicaments vendus"
                      value={fmtInt(kpis.medicaments_vendus)}
                      icon={<FaBoxes size={16} />}
                      color="#F39C12" />
                  </Col>
                  <Col sm={6} lg={3}>
                    <KpiCard label="Valeur du stock"
                      value={fmtMAD(kpis.valeur_stock)}
                      icon={<FaChartBar size={16} />}
                      color="#9B59B6" />
                  </Col>
                </Row>

                {/* Revenue chart */}
                <Card className="border-0 shadow-sm mb-4">
                  <Card.Header className="bg-white border-0 pt-3 fw-bold" style={{ fontSize: 14 }}>
                    Évolution du chiffre d'affaires — 6 derniers mois
                  </Card.Header>
                  <Card.Body>
                    {revEvolution.every(m => m.ca === 0) ? (
                      <div className="text-center text-muted py-4" style={{ fontSize: 13 }}>
                        Aucune vente enregistrée sur les 6 derniers mois.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={revEvolution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                          <Tooltip formatter={v => [fmtMAD(v), 'CA']} />
                          <Area type="monotone" dataKey="ca"
                            stroke="#0B6E4F" fill="#0B6E4F20" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </Card.Body>
                </Card>

                {/* Top medicines */}
                <Card className="border-0 shadow-sm mb-4">
                  <Card.Header className="bg-white border-0 pt-3 fw-bold" style={{ fontSize: 14 }}>
                    🏆 Top médicaments — {periodLabel}
                  </Card.Header>
                  {topMeds.length === 0 ? (
                    <Card.Body className="text-center text-muted py-4" style={{ fontSize: 13 }}>
                      Aucune vente sur cette période.
                    </Card.Body>
                  ) : (
                    <>
                      <Table hover responsive className="mb-0" style={{ fontSize: 13 }}>
                        <thead style={{ backgroundColor: '#f8f9fa' }}>
                          <tr>
                            <th style={{ padding: '10px 16px', width: 50 }}>#</th>
                            <th>Médicament</th>
                            <th>Catégorie</th>
                            <th className="text-end">Qté vendue</th>
                            <th className="text-end">CA (MAD)</th>
                            <th style={{ width: 130 }}>Performance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topMeds.map((med, i) => (
                            <tr key={i}>
                              <td style={{ padding: '10px 16px' }}>
                                <Badge
                                  bg={i === 0 ? 'warning' : i === 1 ? 'secondary' : 'light'}
                                  text={i <= 1 ? undefined : 'dark'}>
                                  #{i + 1}
                                </Badge>
                              </td>
                              <td className="fw-semibold">{med['medicament__nom']}</td>
                              <td className="text-muted">{med['medicament__categorie__nom'] || '—'}</td>
                              <td className="text-end">{fmtInt(med.total_vendu)} u.</td>
                              <td className="text-end fw-bold" style={{ color: '#0B6E4F' }}>
                                {fmtMAD(med.total_revenu)}
                              </td>
                              <td>
                                <div className="progress" style={{ height: 6, borderRadius: 4 }}>
                                  <div className="progress-bar"
                                    style={{
                                      width: `${Math.round((med.total_revenu / maxRev) * 100)}%`,
                                      backgroundColor: '#0B6E4F',
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  )}
                </Card>

                {/* Stock analytics */}
                {(reportType === 'general' || reportType === 'stock') && stockDetails.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-white border-0 pt-3 fw-bold d-flex align-items-center gap-2"
                      style={{ fontSize: 14 }}>
                      <FaWarehouse style={{ color: '#1B4965' }} />
                      Analyse du stock
                      <Badge bg="light" text="dark" className="ms-auto" style={{ fontSize: 11 }}>
                        {stockDetails.length} articles
                      </Badge>
                    </Card.Header>

                    {/* Mini bar chart by value */}
                    <Card.Body className="pb-1">
                      <ResponsiveContainer width="100%" height={Math.min(180, stockDetails.length * 36 + 20)}>
                        <BarChart
                          layout="vertical"
                          data={stockDetails.slice(0, 8).map(s => ({
                            nom:    s.nom.length > 22 ? s.nom.slice(0, 21) + '…' : s.nom,
                            valeur: s.valeur,
                            full:   s.nom,
                          }))}
                          margin={{ top: 2, right: 24, left: 4, bottom: 2 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                          <XAxis type="number" tick={{ fontSize: 10 }}
                            tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                          <YAxis type="category" dataKey="nom" tick={{ fontSize: 10 }} width={130} />
                          <Tooltip
                            formatter={(v, _, p) => [fmtMAD(v), p.payload.full]}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
                          <Bar dataKey="valeur" radius={[0, 4, 4, 0]}>
                            {stockDetails.slice(0, 8).map((_, i) => (
                              <Cell key={i}
                                fill={STOCK_PALETTE[Math.min(i, STOCK_PALETTE.length - 1)]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Card.Body>

                    {/* Stock table */}
                    <Table hover responsive className="mb-0" style={{ fontSize: 12 }}>
                      <thead style={{ backgroundColor: '#f8f9fa' }}>
                        <tr>
                          <th style={{ padding: '8px 16px' }}>Médicament</th>
                          <th>Catégorie</th>
                          <th className="text-end">Stock</th>
                          <th className="text-end">Seuil</th>
                          <th className="text-end">Prix (MAD)</th>
                          <th className="text-end">Valeur (MAD)</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockDetails.map((s, i) => (
                          <tr key={i}>
                            <td className="fw-semibold" style={{ padding: '8px 16px' }}>{s.nom}</td>
                            <td className="text-muted">{s.categorie}</td>
                            <td className="text-end">{fmtInt(s.quantite)}</td>
                            <td className="text-end text-muted">{fmtInt(s.seuil_alerte)}</td>
                            <td className="text-end">{fmtMAD(s.prix_vente)}</td>
                            <td className="text-end fw-semibold" style={{ color: '#0B6E4F' }}>
                              {fmtMAD(s.valeur)}
                            </td>
                            <td><StockStatusBadge statut={s.statut} /></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot style={{ backgroundColor: '#f8f9fa' }}>
                        <tr>
                          <td colSpan={5} className="fw-bold" style={{ padding: '8px 16px', fontSize: 12 }}>
                            Total valeur stock
                          </td>
                          <td className="text-end fw-bold" style={{ color: '#0B6E4F' }}>
                            {fmtMAD(stockSummary.total_valeur)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </Table>
                  </Card>
                )}
              </>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
}
