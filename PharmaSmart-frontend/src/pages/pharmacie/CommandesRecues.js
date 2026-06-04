import { useState, useEffect } from 'react';
import { Container, Card, Badge, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { FaCheck, FaTruck, FaTimes } from 'react-icons/fa';
import NavbarPharmacie from '../../components/NavbarPharmacie';
import api from '../../services/api';
import authService from '../../services/authService';

function CommandesRecues() {
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCommandes = async () => {
      if (!authService.isAuthenticated()) {
        window.location.href = '/connexion';
        return;
      }

      try {
        const response = await api.get('/orders/commandes/');
        
        const formattedCommandes = response.data.map(cmd => ({
          id: cmd.numero,
          cmdId: cmd.id,
          client: cmd.patient_nom || 'Client',
          tel: '0600000000',
          date: new Date(cmd.created_at).toLocaleString('fr-FR'),
          statut: cmd.statut.toLowerCase(),
          livraison: cmd.mode_livraison === 'LIVRAISON' ? 'domicile' : 'pharmacie',
          adresse: cmd.adresse_livraison || null,
          total: parseFloat(cmd.total),
          items: cmd.lignes?.map(l => ({
            nom: l.medicament_nom,
            qte: l.quantite,
            prix: parseFloat(l.prix_unitaire)
          })) || [],
          ordonnance: false
        }));
        
        setCommandes(formattedCommandes);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur lors du chargement des commandes');
      } finally {
        setLoading(false);
      }
    };

    fetchCommandes();
  }, []);

  const changerStatut = async (id, cmdId, nouveauStatut) => {
    try {
      await api.post(`/orders/commandes/${cmdId}/changer_statut/`, {
        statut: nouveauStatut.toUpperCase()
      });
      
      setCommandes(commandes.map(cmd =>
        cmd.id === id ? { ...cmd, statut: nouveauStatut.toLowerCase() } : cmd
      ));
    } catch (err) {
      setError('Erreur lors du changement de statut');
    }
  };

  const getStatutBadge = (s) => {
    const map = {
      en_attente: { bg: "warning", text: "⏳ En attente" },
      confirmee: { bg: "primary", text: "✓ Confirmée" },
      en_preparation: { bg: "info", text: "🔧 En préparation" },
      prete: { bg: "info", text: "📦 Prête" },
      en_livraison: { bg: "primary", text: "🚚 En livraison" },
      livree: { bg: "success", text: "✅ Livrée" },
      annulee: { bg: "danger", text: "❌ Annulée" },
    };
    const c = map[s] || map.en_attente;
    return <Badge bg={c.bg}>{c.text}</Badge>;
  };

  const cmdFiltrees = commandes.filter(cmd =>
    filtreStatut === 'tous' || cmd.statut === filtreStatut
  );

  const statsCommandes = {
    en_attente: commandes.filter(c => c.statut === 'en_attente').length,
    en_preparation: commandes.filter(c => c.statut === 'en_preparation' || c.statut === 'confirmee').length,
    en_livraison: commandes.filter(c => c.statut === 'en_livraison' || c.statut === 'prete').length,
    livree: commandes.filter(c => c.statut === 'livree').length,
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <NavbarPharmacie />
        <Container className="py-5 text-center">
          <Spinner animation="border" style={{ color: '#0B6E4F' }} />
          <p className="mt-3">Chargement des commandes...</p>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarPharmacie />

      <Container className="py-4">
        <h2 className="fw-bold mb-1">Commandes Reçues</h2>
        <p className="text-muted mb-4">Gérez les commandes en ligne de vos clients</p>

        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        {/* Stats */}
        <Row className="g-3 mb-4">
          {[
            { label: "En attente", value: statsCommandes.en_attente, color: "#F39C12", filtre: "en_attente" },
            { label: "En préparation", value: statsCommandes.en_preparation, color: "#3498db", filtre: "en_preparation" },
            { label: "En livraison", value: statsCommandes.en_livraison, color: "#2980b9", filtre: "en_livraison" },
            { label: "Livrées", value: statsCommandes.livree, color: "#0B6E4F", filtre: "livree" },
          ].map((s, i) => (
            <Col md={3} key={i}>
              <Card className={`border-0 shadow-sm ${filtreStatut === s.filtre ? 'border border-2' : ''}`}
                style={{ cursor: 'pointer', borderColor: filtreStatut === s.filtre ? s.color : 'transparent' }}
                onClick={() => setFiltreStatut(filtreStatut === s.filtre ? 'tous' : s.filtre)}
              >
                <Card.Body className="text-center py-3">
                  <h3 className="fw-bold mb-0" style={{ color: s.color }}>{s.value}</h3>
                  <small className="text-muted">{s.label}</small>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Liste commandes */}
        {cmdFiltrees.length === 0 ? (
          <Card className="border-0 shadow-sm text-center py-5">
            <Card.Body>
              <p className="text-muted">Aucune commande pour le moment</p>
            </Card.Body>
          </Card>
        ) : (
          cmdFiltrees.map((cmd) => (
            <Card key={cmd.id} className="border-0 shadow-sm mb-3">
              <Card.Body>
                <Row className="align-items-center">
                  <Col md={6}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h6 className="fw-bold mb-0">{cmd.id}</h6>
                      {getStatutBadge(cmd.statut)}
                      <Badge bg="light" text="dark">{cmd.livraison === 'domicile' ? '🚚 Domicile' : '🏪 Retrait'}</Badge>
                      {cmd.ordonnance && <Badge bg="info">📋 Ordonnance</Badge>}
                    </div>
                    <p className="mb-1"><strong>{cmd.client}</strong> — {cmd.tel}</p>
                    <small className="text-muted">{cmd.date}</small>
                    {cmd.adresse && <small className="text-muted d-block">📍 {cmd.adresse}</small>}
                    <div className="mt-2">
                      {cmd.items.map((item, i) => (
                        <Badge key={i} bg="light" text="dark" className="me-1">{item.nom} ×{item.qte}</Badge>
                      ))}
                    </div>
                  </Col>
                  <Col md={3} className="text-center">
                    <h5 className="fw-bold" style={{ color: '#0B6E4F' }}>{cmd.total.toFixed(2)} MAD</h5>
                  </Col>
                  <Col md={3} className="text-end">
                    {cmd.statut === 'en_attente' && (
                      <div className="d-flex flex-column gap-1">
                        <Button size="sm" style={{ backgroundColor: '#0B6E4F', border: 'none' }}
                          onClick={() => changerStatut(cmd.id, cmd.cmdId, 'CONFIRMEE')}>
                          <FaCheck className="me-1" /> Accepter
                        </Button>
                        <Button size="sm" variant="outline-danger"
                          onClick={() => changerStatut(cmd.id, cmd.cmdId, 'ANNULEE')}>
                          <FaTimes className="me-1" /> Refuser
                        </Button>
                      </div>
                    )}
                    {(cmd.statut === 'confirmee' || cmd.statut === 'en_preparation') && (
                      <Button size="sm" style={{ backgroundColor: '#1B4965', border: 'none' }}
                        onClick={() => changerStatut(cmd.id, cmd.cmdId, 'EN_LIVRAISON')}>
                        <FaTruck className="me-1" /> En livraison
                      </Button>
                    )}
                    {(cmd.statut === 'en_livraison' || cmd.statut === 'prete') && (
                      <Button size="sm" variant="success"
                        onClick={() => changerStatut(cmd.id, cmd.cmdId, 'LIVREE')}>
                        <FaCheck className="me-1" /> Livrée
                      </Button>
                    )}
                    {cmd.statut === 'livree' && (
                      <Badge bg="success" className="p-2">Terminée</Badge>
                    )}
                    {cmd.statut === 'annulee' && (
                      <Badge bg="danger" className="p-2">Annulée</Badge>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ))
        )}
      </Container>
    </div>
  );
}

export default CommandesRecues;