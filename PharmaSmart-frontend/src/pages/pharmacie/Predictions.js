import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Badge, Spinner, Alert, Table, Button,
} from 'react-bootstrap';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts';
import {
  FaBrain, FaExclamationTriangle, FaArrowUp, FaArrowDown, FaMinus,
  FaChartLine, FaBoxes, FaTrophy, FaThermometerHalf, FaRobot,
} from 'react-icons/fa';
import NavbarPharmacie from '../../components/NavbarPharmacie';
import mlService from '../../services/mlService';

// ─── constants ────────────────────────────────────────────────────────────────

const HORIZONS = [
  { label: '7 j',  value: 7 },
  { label: '14 j', value: 14 },
  { label: '30 j', value: 30 },
  { label: '60 j', value: 60 },
  { label: '90 j', value: 90 },
];

const COLORS = {
  top:     '#0B6E4F',
  low:     '#E74C3C',
  neutral: '#6c757d',
};

const TOP_PALETTE = ['#0B6E4F','#14A76C','#1B9F6B','#2DCB85','#48E09B','#72EDB3','#9DF5C7','#B8F7D5','#D3FAE5','#E8FDF2'];
const LOW_PALETTE = ['#E74C3C','#F05248','#F3604F','#F57059','#F78065','#F99073','#FAA082','#FBB092','#FCC0A3','#FDD0B5'];

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt1 = n => (typeof n === 'number' ? n.toFixed(1) : '—');

// ─── sub-components ───────────────────────────────────────────────────────────

function TrendBadge({ tendance, pct }) {
  if (tendance === 'HAUSSE') return (
    <Badge bg="success" className="d-inline-flex align-items-center gap-1">
      <FaArrowUp size={9} />{pct != null ? `+${pct}%` : 'Hausse'}
    </Badge>
  );
  if (tendance === 'BAISSE') return (
    <Badge bg="danger" className="d-inline-flex align-items-center gap-1">
      <FaArrowDown size={9} />{pct != null ? `${pct}%` : 'Baisse'}
    </Badge>
  );
  return (
    <Badge bg="secondary" className="d-inline-flex align-items-center gap-1">
      <FaMinus size={9} />Stable
    </Badge>
  );
}

function ModelBadge({ model }) {
  if (model === 'xgboost')       return <Badge style={{ backgroundColor: '#E67E22', fontSize: 10 }}>XGBoost</Badge>;
  if (model === 'random_forest') return <Badge style={{ backgroundColor: '#9B59B6', fontSize: 10 }}>Random Forest</Badge>;
  return <Badge bg="secondary" style={{ fontSize: 10 }}>Baseline</Badge>;
}

function KpiCard({ label, value, icon, color, sub }) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="py-3 d-flex align-items-center gap-3">
        <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 48, height: 48, backgroundColor: color + '18', color }}>
          {icon}
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: 12 }}>{label}</div>
          <div className="fw-bold fs-5">{value}</div>
          {sub && <div className="text-muted" style={{ fontSize: 11 }}>{sub}</div>}
        </div>
      </Card.Body>
    </Card>
  );
}

function SeasonCard({ info }) {
  if (!info) return null;
  return (
    <Card className="border-0 shadow-sm mb-4"
      style={{ background: 'linear-gradient(135deg,#0B6E4F,#14A76C)', color: 'white' }}>
      <Card.Body className="py-3">
        <div className="d-flex align-items-start gap-3 flex-wrap">
          <div style={{ fontSize: 40, lineHeight: 1 }}>{info.emoji}</div>
          <div className="flex-grow-1">
            <div className="fw-bold fs-5 mb-1">
              Saison : {info.saison}
              <Badge bg="light" text="dark" className="ms-2" style={{ fontSize: 11 }}>
                Analyse saisonnière
              </Badge>
            </div>
            <p className="mb-2 opacity-90" style={{ fontSize: 13 }}>{info.conseil}</p>
            <div className="d-flex gap-3 flex-wrap">
              <div>
                <span className="opacity-75" style={{ fontSize: 11 }}>Forte demande : </span>
                {(info.high_demand || []).slice(0, 5).map((k, i) => (
                  <Badge key={i} bg="light" text="dark" className="me-1" style={{ fontSize: 10 }}>{k}</Badge>
                ))}
              </div>
              <div>
                <span className="opacity-75" style={{ fontSize: 11 }}>Faible demande : </span>
                {(info.low_demand || []).slice(0, 4).map((k, i) => (
                  <Badge key={i} bg="dark" className="me-1" style={{ fontSize: 10, opacity: 0.7 }}>{k}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

function RankedBarChart({ data, palette, label }) {
  const chartData = data.map(d => ({
    nom:   d.medicament_nom.length > 20 ? d.medicament_nom.slice(0, 19) + '…' : d.medicament_nom,
    value: d.quantite_predite_totale,
    full:  d.medicament_nom,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 36)}>
      <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 30, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="nom" tick={{ fontSize: 11 }} width={140} />
        <RTooltip
          formatter={(v, _, p) => [fmt1(v) + ' unités', p.payload.full]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="value" name={label} radius={[0, 5, 5, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={palette[Math.min(i, palette.length - 1)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RankingTable({ data }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <Table hover className="mb-0" style={{ fontSize: 13 }}>
        <thead className="table-light">
          <tr>
            <th className="ps-3">#</th>
            <th>Médicament</th>
            <th>Catégorie</th>
            <th>Prédit</th>
            <th>Moy/jour</th>
            <th>Tendance</th>
            <th>Stock</th>
            <th>Modèle</th>
            <th>Saison</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.medicament_id} style={{ verticalAlign: 'middle' }}>
              <td className="ps-3 text-muted" style={{ fontSize: 12 }}>{i + 1}</td>
              <td className="fw-semibold">{row.medicament_nom}</td>
              <td>
                <Badge bg="light" text="dark" style={{ fontSize: 11 }}>{row.categorie || '—'}</Badge>
              </td>
              <td className="fw-bold" style={{ color: COLORS.top }}>{fmt1(row.quantite_predite_totale)}</td>
              <td className="text-muted">{fmt1(row.quantite_moy_jour)}</td>
              <td><TrendBadge tendance={row.tendance} pct={row.tendance_pct} /></td>
              <td>{row.stock_actuel}</td>
              <td><ModelBadge model={row.model_used} /></td>
              <td>
                {row.is_seasonal
                  ? <Badge bg="warning" text="dark" style={{ fontSize: 10 }}>🌟 Saisonnier</Badge>
                  : <span className="text-muted" style={{ fontSize: 11 }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function Predictions() {
  const [horizon,   setHorizon]   = useState(30);
  const [overview,  setOverview]  = useState(null);
  const [loadingOv, setLoadingOv] = useState(true);
  const [errorOv,   setErrorOv]   = useState('');

  const loadOverview = useCallback(async h => {
    setLoadingOv(true);
    setErrorOv('');
    try {
      const res = await mlService.getOverview(h);
      setOverview(res.data);
    } catch (err) {
      const httpStatus = err?.response?.status;
      const serverMsg  = err?.response?.data?.error || '';
      if (httpStatus === 401 || httpStatus === 403) {
        setErrorOv('Accès refusé. Assurez-vous d\'être connecté en tant que pharmacien.');
      } else if (httpStatus === 500) {
        setErrorOv(`Erreur serveur : ${serverMsg || 'consultez les logs Django pour plus de détails.'}`);
      } else if (!err?.response) {
        setErrorOv('Impossible de contacter le serveur. Vérifiez que Django tourne sur le port 8000.');
      } else {
        setErrorOv(`Erreur (${httpStatus ?? '?'}) : ${serverMsg || err.message}`);
      }
    } finally {
      setLoadingOv(false);
    }
  }, []);

  useEffect(() => { loadOverview(horizon); }, [horizon, loadOverview]);

  const saison    = overview?.saison_info;
  const topList   = overview?.top_performers  ?? [];
  const lowList   = overview?.low_performers  ?? [];
  const allList   = overview?.all_medicines   ?? [];
  const totalPred = overview?.total_predicted ?? 0;
  const nbMeds    = overview?.nb_medicaments  ?? 0;

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarPharmacie />

      <Container className="py-4">

        {/* ── Header ── */}
        <div className="mb-4">
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <FaBrain style={{ color: '#0B6E4F' }} />
            Prédictions IA
          </h2>
        </div>

        {/* ── Horizon selector ── */}
        <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
          <span className="fw-semibold text-muted" style={{ fontSize: 13 }}>Horizon de prévision :</span>
          {HORIZONS.map(h => (
            <Button key={h.value} size="sm"
              variant={horizon === h.value ? 'dark' : 'outline-secondary'}
              onClick={() => setHorizon(h.value)}
              style={{ borderRadius: 8 }}>
              {h.label}
            </Button>
          ))}
        </div>

        {/* ── States ── */}
        {loadingOv ? (
          <div className="text-center py-5">
            <Spinner style={{ color: '#0B6E4F', width: 48, height: 48 }} />
            <div className="text-muted mt-3">Calcul des prévisions en cours…</div>
          </div>

        ) : errorOv ? (
          <Alert variant="danger" className="d-flex align-items-start gap-3 p-4">
            <FaExclamationTriangle size={24} className="flex-shrink-0 mt-1" />
            <div className="flex-grow-1">
              <div className="fw-bold mb-1">Erreur de chargement</div>
              <div style={{ fontSize: 14 }}>{errorOv}</div>
            </div>
            <Button size="sm" variant="outline-danger" onClick={() => loadOverview(horizon)}>
              Réessayer
            </Button>
          </Alert>

        ) : nbMeds === 0 ? (
          <Card className="border-0 shadow-sm text-center py-5">
            <Card.Body>
              <FaBoxes size={48} className="mb-3 text-muted opacity-50" />
              <h5 className="fw-bold text-muted">Aucun médicament en stock</h5>
              <p className="text-muted" style={{ fontSize: 14 }}>
                Ajoutez des médicaments à votre stock pour démarrer les prédictions IA.
              </p>
            </Card.Body>
          </Card>

        ) : (
          <>
            <SeasonCard info={saison} />

            {/* KPI row */}
            <Row className="g-3 mb-4">
              <Col md={3}>
                <KpiCard label="Médicaments analysés" value={nbMeds}
                  icon={<FaBoxes size={20} />} color="#1B4965" />
              </Col>
              <Col md={3}>
                <KpiCard label={`Total prédit (${horizon} j)`}
                  value={Math.round(totalPred).toLocaleString('fr-FR') + ' unités'}
                  icon={<FaChartLine size={20} />} color="#0B6E4F" />
              </Col>
              <Col md={3}>
                <KpiCard label="Plus rentable prévu"
                  value={topList[0]?.medicament_nom ?? '—'}
                  icon={<FaTrophy size={20} />} color="#F39C12"
                  sub={topList[0] ? `${fmt1(topList[0].quantite_predite_totale)} unités` : undefined} />
              </Col>
              <Col md={3}>
                <KpiCard label="Moins rentable prévu"
                  value={lowList[0]?.medicament_nom ?? '—'}
                  icon={<FaThermometerHalf size={20} />} color="#E74C3C"
                  sub={lowList[0] ? `${fmt1(lowList[0].quantite_predite_totale)} unités` : undefined} />
              </Col>
            </Row>

            {/* Top / Low charts */}
            <Row className="g-4 mb-4">
              <Col lg={6}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className="bg-white border-0 pt-3 fw-bold d-flex align-items-center gap-2">
                    <FaTrophy style={{ color: '#F39C12' }} />
                    Top {topList.length} — Médicaments les plus rentables
                    <Badge bg="success" className="ms-auto" style={{ fontSize: 11 }}>{horizon} jours</Badge>
                  </Card.Header>
                  <Card.Body className="pb-3">
                    {topList.length === 0
                      ? <p className="text-muted text-center py-3">Aucune donnée disponible.</p>
                      : <RankedBarChart data={topList} palette={TOP_PALETTE} label="Unités prévues" />}
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={6}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className="bg-white border-0 pt-3 fw-bold d-flex align-items-center gap-2">
                    <FaExclamationTriangle style={{ color: '#E74C3C' }} />
                    Top {lowList.length} — Médicaments les moins rentables
                    <Badge bg="danger" className="ms-auto" style={{ fontSize: 11 }}>{horizon} jours</Badge>
                  </Card.Header>
                  <Card.Body className="pb-3">
                    {lowList.length === 0
                      ? <p className="text-muted text-center py-3">Aucune donnée disponible.</p>
                      : <RankedBarChart data={lowList} palette={LOW_PALETTE} label="Unités prévues" />}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Full ranking table */}
            {allList.length > 0 && (
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-0 pt-3 fw-bold">
                  <FaRobot className="me-2" style={{ color: '#0B6E4F' }} />
                  Classement complet — tous les médicaments par rentabilité prévue
                </Card.Header>
                <RankingTable data={allList} />
                <Card.Footer className="bg-white border-0 text-muted" style={{ fontSize: 11 }}>
                  XGBoost / Random Forest = modèle IA entraîné · Baseline = moyenne mobile statistique
                </Card.Footer>
              </Card>
            )}
          </>
        )}

      </Container>
    </div>
  );
}
