import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Card, Badge, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { FaBox, FaCheck, FaTruck, FaSpinner, FaClock, FaTimes } from 'react-icons/fa';
import NavbarClient from '../../components/NavbarClient';
import Footer from '../../components/Footer';
import { getMedicineImage } from '../../utils/medicineVisuals';
import orderService from '../../services/orderService';
import authService from '../../services/authService';

function Commandes() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fetchCommandes = async () => {
      const auth = authService.isAuthenticated();
      setIsAuthenticated(auth);
      
      if (!auth) {
        setLoading(false);
        return;
      }
      
      try {
        const data = await orderService.getCommandes();
        
        // Formater les commandes
        const formattedCommandes = data.map(cmd => ({
          id: cmd.numero,
          date: new Date(cmd.created_at).toLocaleDateString('fr-FR'),
          statut: cmd.statut.toLowerCase(),
          statutDisplay: cmd.statut_display,
          total: parseFloat(cmd.total),
          livraison: cmd.mode_livraison === 'LIVRAISON' ? 'domicile' : 'pharmacie',
          pharmacie: cmd.pharmacie_nom,
          items: cmd.lignes ? cmd.lignes.map(ligne => ({
            nom: ligne.medicament_nom,
            categorie: 'Médicament',
            qte: ligne.quantite,
            prix: parseFloat(ligne.prix_unitaire)
          })) : []
        }));
        
        setCommandes(formattedCommandes);
      } catch (err) {
        console.error('Erreur chargement commandes:', err);
        setError('Impossible de charger vos commandes');
      } finally {
        setLoading(false);
      }
    };

    fetchCommandes();
  }, []);

  const statutConfig = {
    en_attente: { bg: "secondary", text: "En attente", icon: <FaClock className="me-1" />, color: '#6c757d' },
    confirmee: { bg: "primary", text: "Confirmée", icon: <FaCheck className="me-1" />, color: '#0d6efd' },
    en_preparation: { bg: "warning", text: "En préparation", icon: <FaSpinner className="me-1" />, color: '#F39C12' },
    prete: { bg: "info", text: "Prête", icon: <FaBox className="me-1" />, color: '#17a2b8' },
    en_livraison: { bg: "info", text: "En livraison", icon: <FaTruck className="me-1" />, color: '#3498DB' },
    livree: { bg: "success", text: "Livrée", icon: <FaCheck className="me-1" />, color: '#0B6E4F' },
    annulee: { bg: "danger", text: "Annulée", icon: <FaTimes className="me-1" />, color: '#dc3545' },
  };

  const getStatutBadge = (statut) => {
    const c = statutConfig[statut] || statutConfig.en_attente;
    return <Badge bg={c.bg}>{c.icon}{c.text}</Badge>;
  };

  const getProgressSteps = (statut) => {
    const steps = ['en_attente', 'confirmee', 'en_preparation', 'en_livraison', 'livree'];
    const currentIndex = steps.indexOf(statut);
    const labels = ['Confirmée', 'Préparation', 'Livraison', 'Livrée'];
    const displaySteps = ['confirmee', 'en_preparation', 'en_livraison', 'livree'];

    return (
      <div className="d-flex align-items-center mt-3 mb-2" style={{ gap: 0 }}>
        {labels.map((label, i) => {
          const stepIndex = steps.indexOf(displaySteps[i]);
          const isCompleted = currentIndex >= stepIndex;
          
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
              <div className="text-center" style={{ minWidth: '50px' }}>
                <div
                  className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-1"
                  style={{
                    width: '28px', height: '28px',
                    backgroundColor: isCompleted ? '#0B6E4F' : '#e0e0e0',
                    color: 'white', fontSize: '11px',
                    transition: 'all 0.3s ease',
                    boxShadow: isCompleted ? '0 2px 8px rgba(11,110,79,0.3)' : 'none',
                  }}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>
                <small className={isCompleted ? 'fw-bold' : 'text-muted'} style={{ fontSize: '10px' }}>
                  {label}
                </small>
              </div>
              {i < 3 && (
                <div style={{
                  flex: 1, height: '3px', borderRadius: '2px',
                  background: currentIndex > stepIndex
                    ? 'linear-gradient(90deg, #0B6E4F, #14A76C)'
                    : '#e0e0e0',
                  margin: '0 4px', marginBottom: '18px',
                  transition: 'all 0.3s ease',
                }} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div>
        <NavbarClient />
        <Container className="py-5 text-center">
          <Spinner animation="border" style={{ color: '#0B6E4F' }} />
          <p className="mt-3 text-muted">Chargement de vos commandes...</p>
        </Container>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div>
        <NavbarClient />
        <Container className="py-5 text-center">
          <FaBox size={50} style={{ color: '#ccc' }} />
          <h3 className="fw-bold mt-3">Connectez-vous pour voir vos commandes</h3>
          <p className="text-muted mb-4">Vous devez être connecté pour accéder à votre historique de commandes</p>
          <Link to="/connexion" className="btn btn-lg" style={{ backgroundColor: '#0B6E4F', color: 'white' }}>
            Se connecter
          </Link>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <NavbarClient />

      <Container className="py-4">
        <h2 className="fw-bold mb-1 gradient-text">
          <FaBox className="me-2" />
          Mes Commandes
        </h2>
        <p className="text-muted mb-4">Suivez l'état de vos commandes en temps réel</p>

        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        {commandes.length === 0 ? (
          <Card className="border-0 shadow-sm text-center py-5">
            <Card.Body>
              <FaBox size={50} style={{ color: '#ccc' }} />
              <h4 className="fw-bold mt-3">Aucune commande</h4>
              <p className="text-muted mb-4">Vous n'avez pas encore passé de commande</p>
              <Link to="/catalogue" className="btn" style={{ backgroundColor: '#0B6E4F', color: 'white' }}>
                Découvrir le catalogue
              </Link>
            </Card.Body>
          </Card>
        ) : (
          commandes.map((cmd) => {
            const statusColor = (statutConfig[cmd.statut] || statutConfig.en_attente).color;
            return (
              <Card key={cmd.id} className="border-0 shadow-sm mb-3 animate-fade-up" style={{ borderLeft: `3px solid ${statusColor}` }}>
                <Card.Body>
                  <Row className="align-items-center">
                    <Col md={8}>
                      <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
                        <h6 className="fw-bold mb-0">{cmd.id}</h6>
                        {getStatutBadge(cmd.statut)}
                        <Badge bg="light" text="dark">
                          {cmd.livraison === 'domicile' ? '🚚 Domicile' : '🏪 Pharmacie'}
                        </Badge>
                        {cmd.pharmacie && (
                          <Badge bg="light" text="dark">
                            {cmd.pharmacie}
                          </Badge>
                        )}
                      </div>
                      <small className="text-muted">Commandé le {cmd.date}</small>

                      {/* Progress bar */}
                      {cmd.statut !== 'livree' && cmd.statut !== 'annulee' && getProgressSteps(cmd.statut)}

                      {/* Items with thumbnails */}
                      {cmd.items.length > 0 && (
                        <div className="mt-3 d-flex flex-wrap gap-2">
                          {cmd.items.map((item, i) => (
                            <div key={i} className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill"
                              style={{ backgroundColor: '#f8f9fa', fontSize: '13px', border: '1px solid #e9ecef' }}>
                              <img
                                src={getMedicineImage(item.nom, item.categorie)}
                                alt={item.nom}
                                style={{ height: '32px', width: '32px', objectFit: 'contain' }}
                              />
                              <span>{item.nom} × {item.qte}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Col>
                    <Col md={4} className="text-end">
                      <h4 className="fw-bold" style={{ color: '#0B6E4F' }}>{cmd.total.toFixed(2)} MAD</h4>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            );
          })
        )}
      </Container>

      <Footer />
    </div>
  );
}

export default Commandes;