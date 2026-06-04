import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Table, Spinner, Alert } from 'react-bootstrap';
import { FaPills, FaExclamationTriangle, FaShoppingCart, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaClock } from 'react-icons/fa';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import NavbarPharmacie from '../../components/NavbarPharmacie';
import api from '../../services/api';
import authService from '../../services/authService';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState([
    { titre: "Total Médicaments", valeur: "0", icon: <FaPills size={28} />, couleur: "#0B6E4F", change: "Chargement...", up: true },
    { titre: "Ruptures de Stock", valeur: "0", icon: <FaExclamationTriangle size={28} />, couleur: "#E74C3C", change: "Chargement...", up: false },
    { titre: "Commandes en attente", valeur: "0", icon: <FaShoppingCart size={28} />, couleur: "#F39C12", change: "Chargement...", up: true },
    { titre: "CA du mois (MAD)", valeur: "0", icon: <FaMoneyBillWave size={28} />, couleur: "#1B4965", change: "Chargement...", up: true },
  ]);
  const [dernieresCommandes, setDernieresCommandes] = useState([]);

  // Données pour les graphiques
  const [ventesHebdo] = useState([
    { jour: 'Lun', ventes: 3200 },
    { jour: 'Mar', ventes: 4100 },
    { jour: 'Mer', ventes: 3800 },
    { jour: 'Jeu', ventes: 5200 },
    { jour: 'Ven', ventes: 6100 },
    { jour: 'Sam', ventes: 7800 },
    { jour: 'Dim', ventes: 2900 },
  ]);

  const [categorieData] = useState([
    { name: 'Douleur', value: 35, color: '#EE5A24' },
    { name: 'Antibiotique', value: 20, color: '#0B6E4F' },
    { name: 'Vitamines', value: 18, color: '#F39C12' },
    { name: 'Gastro', value: 12, color: '#3498DB' },
    { name: 'Allergie', value: 8, color: '#9B59B6' },
    { name: 'Autres', value: 7, color: '#95A5A6' },
  ]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!authService.isAuthenticated()) {
        window.location.href = '/connexion';
        return;
      }

      try {
        // Charger les médicaments
        const medsResponse = await api.get('/catalog/medicaments/');
        const medicaments = medsResponse.data;

        // Charger les commandes
        let commandes = [];
        try {
          const cmdResponse = await api.get('/orders/commandes/');
          commandes = cmdResponse.data;
        } catch (e) {
          console.log('Pas de commandes');
        }

        // Charger le stock
        let stockData = [];
        try {
          const stockResponse = await api.get('/inventory/stock/');
          stockData = stockResponse.data;
        } catch (e) {
          console.log('Pas de stock');
        }

        // Calculer les stats
        const ruptures = stockData.filter(s => s.quantite === 0).length;
        const commandesEnAttente = commandes.filter(c => c.statut === 'EN_ATTENTE').length;
        const caTotal = commandes
          .filter(c => c.statut === 'LIVREE')
          .reduce((sum, c) => sum + parseFloat(c.total || 0), 0);

        setStats([
          { titre: "Total Médicaments", valeur: medicaments.length.toString(), icon: <FaPills size={28} />, couleur: "#0B6E4F", change: "+12 ce mois", up: true },
          { titre: "Ruptures de Stock", valeur: ruptures.toString(), icon: <FaExclamationTriangle size={28} />, couleur: "#E74C3C", change: "À surveiller", up: false },
          { titre: "Commandes en attente", valeur: commandesEnAttente.toString(), icon: <FaShoppingCart size={28} />, couleur: "#F39C12", change: "Nouvelles aujourd'hui", up: true },
          { titre: "CA du mois (MAD)", valeur: caTotal.toLocaleString(), icon: <FaMoneyBillWave size={28} />, couleur: "#1B4965", change: "+15% vs mois dernier", up: true },
        ]);

        // Formater les dernières commandes
        const recentCommandes = commandes.slice(0, 4).map(cmd => ({
          id: cmd.numero,
          client: cmd.patient_nom || 'Client',
          total: parseFloat(cmd.total).toFixed(2),
          statut: cmd.statut.toLowerCase(),
          date: formatDate(cmd.created_at)
        }));
        setDernieresCommandes(recentCommandes);

      } catch (err) {
        console.error('Erreur dashboard:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return date.toLocaleDateString('fr-FR');
  };

  const getStatutBadge = (s) => {
    const map = {
      en_attente: { bg: "warning", text: "En attente" },
      en_preparation: { bg: "info", text: "Préparation" },
      en_livraison: { bg: "primary", text: "Livraison" },
      livree: { bg: "success", text: "Livrée" },
      confirmee: { bg: "primary", text: "Confirmée" },
      prete: { bg: "info", text: "Prête" },
      annulee: { bg: "danger", text: "Annulée" },
    };
    const c = map[s] || map.en_attente;
    return <Badge bg={c.bg}>{c.text}</Badge>;
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <NavbarPharmacie />
        <Container className="py-5 text-center">
          <Spinner animation="border" style={{ color: '#0B6E4F' }} />
          <p className="mt-3">Chargement du tableau de bord...</p>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarPharmacie />

      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1 gradient-text">Tableau de Bord</h2>
            <p className="text-muted mb-0">Bienvenue — Vue d'ensemble de votre pharmacie</p>
          </div>
          <Badge bg="light" text="dark" className="p-2">
            <FaClock className="me-1" /> Dernière mise à jour : maintenant
          </Badge>
        </div>

        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        {/* KPI Cards */}
        <Row className="g-3 mb-4">
          {stats.map((stat, index) => (
            <Col md={3} key={index} className="animate-fade-up">
              <Card className="border-0 shadow-sm h-100" style={{ borderTop: `3px solid ${stat.couleur}` }}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-muted mb-1" style={{ fontSize: '13px' }}>{stat.titre}</p>
                      <h3 className="fw-bold mb-1 stat-number">{stat.valeur}</h3>
                      <small className={stat.up ? 'text-success' : 'text-danger'}>
                        {stat.up ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                        {' '}{stat.change}
                      </small>
                    </div>
                    <div className="rounded-circle p-3" style={{ backgroundColor: stat.couleur + '12' }}>
                      <div style={{ color: stat.couleur }}>{stat.icon}</div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Charts Row */}
        <Row className="g-3 mb-4">
          <Col md={7}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white fw-bold border-0 pt-3">
                Ventes de la semaine (MAD)
              </Card.Header>
              <Card.Body style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ventesHebdo} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0B6E4F" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0B6E4F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="jour" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [`${value} MAD`, 'Ventes']}
                    />
                    <Area
                      type="monotone"
                      dataKey="ventes"
                      stroke="#0B6E4F"
                      strokeWidth={2}
                      fill="url(#colorVentes)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>

          <Col md={5}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white fw-bold border-0 pt-3">
                Répartition par catégorie
              </Card.Header>
              <Card.Body style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categorieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [`${value}%`, 'Part']}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span style={{ fontSize: '12px', color: '#666' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-3 mb-4">
          <Col md={7}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white fw-bold border-0 pt-3 d-flex justify-content-between">
                <span>Dernières commandes</span>
                <a href="/pharmacie/commandes" className="text-decoration-none" style={{ color: '#0B6E4F', fontSize: '13px' }}>Voir tout →</a>
              </Card.Header>
              <Card.Body className="p-0">
                {dernieresCommandes.length === 0 ? (
                  <p className="text-muted text-center py-4">Aucune commande pour le moment</p>
                ) : (
                  <Table hover responsive className="mb-0">
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                      <tr>
                        <th style={{ padding: '12px 15px', fontSize: '13px' }}>N° Commande</th>
                        <th style={{ fontSize: '13px' }}>Client</th>
                        <th style={{ fontSize: '13px' }}>Total</th>
                        <th style={{ fontSize: '13px' }}>Statut</th>
                        <th style={{ fontSize: '13px' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dernieresCommandes.map((cmd) => (
                        <tr key={cmd.id}>
                          <td className="fw-bold" style={{ padding: '12px 15px' }}>{cmd.id}</td>
                          <td>{cmd.client}</td>
                          <td>{cmd.total} MAD</td>
                          <td>{getStatutBadge(cmd.statut)}</td>
                          <td className="text-muted" style={{ fontSize: '13px' }}>{cmd.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col md={5}>
            <Card className="border-0 shadow-sm mb-3" style={{ borderLeft: '3px solid #E74C3C' }}>
              <Card.Header className="bg-white fw-bold border-0 pt-3">
                Alertes stock
              </Card.Header>
              <Card.Body>
                <p className="text-muted text-center py-3">
                  Consultez l'onglet Stock pour voir les alertes
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Dashboard;