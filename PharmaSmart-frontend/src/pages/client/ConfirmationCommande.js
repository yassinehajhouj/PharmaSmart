import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert, Table } from 'react-bootstrap';
import { 
  FaCheckCircle, 
  FaBox, 
  FaTruck, 
  FaStore, 
  FaMapMarkerAlt, 
  FaPhone, 
  FaClock,
  FaReceipt,
  FaHome,
  FaShoppingBag
} from 'react-icons/fa';
import NavbarClient from '../../components/NavbarClient';
import Footer from '../../components/Footer';
import { getMedicineImage } from '../../utils/medicineVisuals';
import orderService from '../../services/orderService';

function ConfirmationCommande() {
  const { id } = useParams();
  const [commande, setCommande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCommande = async () => {
      try {
        const data = await orderService.getCommandeById(id);
        setCommande(data);
      } catch (err) {
        console.error('Erreur chargement commande:', err);
        setError('Impossible de charger les détails de la commande.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCommande();
    } else {
      setLoading(false);
      setError('Numéro de commande manquant.');
    }
  }, [id]);

  const getStatutBadge = (statut) => {
    const statuts = {
      'EN_ATTENTE': { bg: 'warning', text: 'En attente', icon: <FaClock /> },
      'CONFIRMEE': { bg: 'info', text: 'Confirmée', icon: <FaCheckCircle /> },
      'EN_PREPARATION': { bg: 'primary', text: 'En préparation', icon: <FaBox /> },
      'EN_LIVRAISON': { bg: 'info', text: 'En livraison', icon: <FaTruck /> },
      'LIVREE': { bg: 'success', text: 'Livrée', icon: <FaCheckCircle /> },
      'ANNULEE': { bg: 'danger', text: 'Annulée', icon: <FaCheckCircle /> },
    };
    const s = statuts[statut] || statuts['EN_ATTENTE'];
    return (
      <Badge bg={s.bg} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
        {s.icon} {s.text}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div>
        <NavbarClient />
        <Container className="py-5 text-center">
          <Spinner animation="border" style={{ color: '#0B6E4F' }} />
          <p className="mt-3 text-muted">Chargement de votre commande...</p>
        </Container>
        <Footer />
      </div>
    );
  }

  if (error || !commande) {
    return (
      <div>
        <NavbarClient />
        <Container className="py-5">
          <Alert variant="danger">{error || 'Commande non trouvée'}</Alert>
          <Link to="/mes-commandes">
            <Button variant="outline-primary">Voir mes commandes</Button>
          </Link>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <NavbarClient />

      {/* Header de confirmation */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0B6E4F 0%, #1B4965 100%)',
        padding: '60px 0',
        color: 'white',
        textAlign: 'center'
      }}>
        <Container>
          <div className="mb-4">
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              animation: 'pulse 2s infinite'
            }}>
              <FaCheckCircle size={50} />
            </div>
          </div>
          <h1 className="fw-bold mb-2">Commande confirmée !</h1>
          <p className="mb-3 opacity-75">
            Merci pour votre commande. Votre pharmacie a été notifiée.
          </p>
          <div className="d-inline-block px-4 py-2 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <small>Numéro de commande</small>
            <h3 className="mb-0 fw-bold">#{commande.numero || commande.id}</h3>
          </div>
        </Container>
      </div>

      <Container className="py-5">
        <Row className="g-4">
          {/* Détails de la commande */}
          <Col lg={8}>
            {/* Statut et timeline */}
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white border-0 pt-4 pb-0">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0">
                    <FaBox className="me-2" style={{ color: '#0B6E4F' }} />
                    Statut de la commande
                  </h5>
                  {getStatutBadge(commande.statut)}
                </div>
              </Card.Header>
              <Card.Body>
                {/* Timeline */}
                <div className="d-flex justify-content-between align-items-center py-3">
                  {['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EN_LIVRAISON', 'LIVREE'].map((step, index) => {
                    const steps = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EN_LIVRAISON', 'LIVREE'];
                    const currentIndex = steps.indexOf(commande.statut);
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;
                    
                    const icons = [FaClock, FaCheckCircle, FaBox, FaTruck, FaCheckCircle];
                    const labels = ['En attente', 'Confirmée', 'Préparation', 'Livraison', 'Livrée'];
                    const Icon = icons[index];
                    
                    return (
                      <div key={step} className="text-center flex-fill">
                        <div 
                          className="mx-auto mb-2 d-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: '45px',
                            height: '45px',
                            backgroundColor: isCompleted ? '#0B6E4F' : '#e9ecef',
                            color: isCompleted ? 'white' : '#6c757d',
                            border: isCurrent ? '3px solid #1B4965' : 'none',
                            transition: 'all 0.3s'
                          }}
                        >
                          <Icon size={18} />
                        </div>
                        <small className={isCompleted ? 'fw-bold' : 'text-muted'}>
                          {labels[index]}
                        </small>
                      </div>
                    );
                  })}
                </div>

                {/* Estimation */}
                <div className="text-center mt-3 p-3 rounded" style={{ backgroundColor: '#e8f5e9' }}>
                  <FaClock className="me-2" style={{ color: '#0B6E4F' }} />
                  {commande.mode_livraison === 'LIVRAISON' ? (
                    <span>Livraison estimée : <strong>Sous 2 heures</strong></span>
                  ) : (
                    <span>Prêt pour retrait : <strong>Sous 30 minutes</strong></span>
                  )}
                </div>
              </Card.Body>
            </Card>

            {/* Articles commandés */}
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white border-0 pt-4">
                <h5 className="fw-bold mb-0">
                  <FaShoppingBag className="me-2" style={{ color: '#0B6E4F' }} />
                  Articles commandés ({commande.lignes?.length || 0})
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive className="mb-0">
                  <thead style={{ backgroundColor: '#f8f9fa' }}>
                    <tr>
                      <th style={{ padding: '15px' }}>Produit</th>
                      <th className="text-center">Prix</th>
                      <th className="text-center">Qté</th>
                      <th className="text-end" style={{ paddingRight: '15px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(commande.lignes || []).map((ligne, index) => (
                      <tr key={index}>
                        <td style={{ padding: '15px' }}>
                          <div className="d-flex align-items-center gap-3">
                            <img
                              src={getMedicineImage(ligne.medicament_nom || 'Médicament', 'Douleur')}
                              alt={ligne.medicament_nom}
                              style={{ 
                                height: '50px', 
                                width: '50px', 
                                objectFit: 'contain', 
                                borderRadius: '8px', 
                                backgroundColor: '#f8f9fa',
                                padding: '4px'
                              }}
                            />
                            <div>
                              <span className="fw-bold">{ligne.medicament_nom || 'Médicament'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="text-center align-middle">
                          {parseFloat(ligne.prix_unitaire).toFixed(2)} MAD
                        </td>
                        <td className="text-center align-middle">
                          <Badge bg="secondary">{ligne.quantite}</Badge>
                        </td>
                        <td className="text-end align-middle fw-bold" style={{ paddingRight: '15px', color: '#0B6E4F' }}>
                          {(parseFloat(ligne.prix_unitaire) * ligne.quantite).toFixed(2)} MAD
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>

          {/* Sidebar - Résumé */}
          <Col lg={4}>
            {/* Informations de livraison */}
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white border-0 pt-4">
                <h5 className="fw-bold mb-0">
                  {commande.mode_livraison === 'LIVRAISON' ? (
                    <>
                      <FaTruck className="me-2" style={{ color: '#0B6E4F' }} />
                      Livraison à domicile
                    </>
                  ) : (
                    <>
                      <FaStore className="me-2" style={{ color: '#1B4965' }} />
                      Retrait en pharmacie
                    </>
                  )}
                </h5>
              </Card.Header>
              <Card.Body>
                {commande.mode_livraison === 'LIVRAISON' && commande.adresse_livraison && (
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">Adresse de livraison</small>
                    <div className="d-flex align-items-start gap-2">
                      <FaMapMarkerAlt className="mt-1" style={{ color: '#0B6E4F' }} />
                      <span>{commande.adresse_livraison}</span>
                    </div>
                  </div>
                )}

                {commande.pharmacie_nom && (
                  <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                    <strong className="d-block mb-2">
                      <FaStore className="me-2" style={{ color: '#1B4965' }} />
                      {commande.pharmacie_nom}
                    </strong>
                    {commande.pharmacie_adresse && (
                      <small className="text-muted d-block">
                        <FaMapMarkerAlt className="me-1" />
                        {commande.pharmacie_adresse}
                      </small>
                    )}
                    {commande.pharmacie_telephone && (
                      <small className="text-muted d-block mt-1">
                        <FaPhone className="me-1" />
                        {commande.pharmacie_telephone}
                      </small>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Récapitulatif financier */}
            <Card className="border-0 shadow-sm" style={{ borderTop: '4px solid #0B6E4F' }}>
              <Card.Header className="bg-white border-0 pt-4">
                <h5 className="fw-bold mb-0">
                  <FaReceipt className="me-2" style={{ color: '#0B6E4F' }} />
                  Récapitulatif
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Sous-total</span>
                  <span>{parseFloat(commande.sous_total || 0).toFixed(2)} MAD</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Frais de livraison</span>
                  <span className={Number(commande.frais_livraison) === 0 ? 'text-success' : ''}>
                    {Number(commande.frais_livraison) === 0 ? 'Gratuit' : `${parseFloat(commande.frais_livraison).toFixed(2)} MAD`}
                  </span>
                </div>
                <hr />
                <div className="d-flex justify-content-between">
                  <span className="fw-bold fs-5">Total TTC</span>
                  <span className="fw-bold fs-4" style={{ color: '#0B6E4F' }}>
                    {parseFloat(commande.total || 0).toFixed(2)} MAD
                  </span>
                </div>

                <div className="mt-3 p-3 rounded text-center" style={{ backgroundColor: '#fff3cd' }}>
                  <small>
                    💳 Paiement à la {commande.mode_livraison === 'LIVRAISON' ? 'livraison' : 'réception'}
                  </small>
                </div>

                {/* Date de commande */}
                <div className="mt-3 text-center text-muted">
                  <small>
                    <FaClock className="me-1" />
                    Commandé le {formatDate(commande.created_at)}
                  </small>
                </div>
              </Card.Body>
            </Card>

            {/* Actions */}
            <div className="d-grid gap-2 mt-4">
              <Link to="/mes-commandes">
                <Button 
                  className="w-100 fw-bold" 
                  style={{ backgroundColor: '#0B6E4F', border: 'none' }}
                >
                  <FaShoppingBag className="me-2" />
                  Voir mes commandes
                </Button>
              </Link>
              <Link to="/catalogue">
                <Button variant="outline-secondary" className="w-100">
                  <FaHome className="me-2" />
                  Continuer mes achats
                </Button>
              </Link>
            </div>
          </Col>
        </Row>
      </Container>

      <Footer />

      {/* Animation CSS */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}

export default ConfirmationCommande;
