import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Badge, Button, Card, Spinner, Alert, Toast, ToastContainer } from 'react-bootstrap';
import { FaShoppingCart, FaArrowLeft, FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import NavbarClient from '../../components/NavbarClient';
import Footer from '../../components/Footer';
import { MedicineRealImage, getCategoryColor, getMedicineImage } from '../../utils/medicineVisuals';
import catalogService from '../../services/catalogService';
import orderService from '../../services/orderService';

function Produit() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [med, setMed] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // États pour le panier
  const [addingToCart, setAddingToCart] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  // Vérifier si l'utilisateur est connecté
  const isAuthenticated = () => {
    return localStorage.getItem('access_token') !== null;
  };

  useEffect(() => {
    const fetchProduit = async () => {
      setLoading(true);
      setError('');
      
      try {
        const data = await catalogService.getMedicamentById(id);
        
        const medFormatted = {
          id: data.id,
          nom: data.nom,
          categorie: data.categorie_nom,
          categorieId: data.categorie,
          prix: parseFloat(data.prix),
          stock: 100,
          description: data.description || 'Aucune description disponible.',
          posologie: data.posologie || 'Consultez votre médecin ou pharmacien.',
          effetsSecondaires: data.effets_secondaires || 'Consultez la notice du médicament.',
          contreIndications: data.contre_indications || 'Consultez la notice du médicament.',
          composition: data.principe_actif ? `${data.principe_actif} ${data.dosage || ''}` : 'Voir notice',
          fabricant: 'PharmaSmart',
          ordonnance: data.ordonnance_requise,
          image: data.image,
          dosage: data.dosage,
          forme: data.forme
        };

        setMed(medFormatted);

        // Charger les alternatives
        if (data.categorie) {
          try {
            const altData = await catalogService.getMedicamentsByCategorie(data.categorie);
            const altFormatted = altData
              .filter(m => m.id !== data.id)
              .slice(0, 3)
              .map(m => ({
                id: m.id,
                nom: m.nom,
                prix: parseFloat(m.prix),
                categorie: m.categorie_nom
              }));
            setAlternatives(altFormatted);
          } catch (altErr) {
            console.log('Pas d\'alternatives trouvées');
          }
        }

      } catch (err) {
        console.error('Erreur lors du chargement:', err);
        setError('Impossible de charger ce médicament.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduit();
  }, [id]);

  // Ajouter au panier
  const handleAddToCart = async () => {
    if (!med) return;
    
    // Vérifier si connecté
    if (!isAuthenticated()) {
      // Sauvegarder dans localStorage
      const cart = JSON.parse(localStorage.getItem('panier') || '[]');
      const existingItem = cart.find(item => item.id === med.id);
      
      if (existingItem) {
        existingItem.quantite += 1;
      } else {
        cart.push({
          id: med.id,
          nom: med.nom,
          prix: med.prix,
          quantite: 1,
          image: med.image,
          categorie: med.categorie
        });
      }
      
      localStorage.setItem('panier', JSON.stringify(cart));
      
      setToastMessage(`${med.nom} ajouté au panier !`);
      setToastVariant('success');
      setShowToast(true);
      return;
    }

    // Utilisateur connecté - utiliser l'API
    setAddingToCart(true);
    
    try {
      await orderService.ajouterAuPanier(med.id, 1);
      
      setToastMessage(`${med.nom} ajouté au panier !`);
      setToastVariant('success');
      setShowToast(true);
      
    } catch (err) {
      console.error('Erreur ajout panier:', err);
      
      if (err.response?.status === 401) {
        // Token expiré - sauvegarder localement
        const cart = JSON.parse(localStorage.getItem('panier') || '[]');
        const existingItem = cart.find(item => item.id === med.id);
        
        if (existingItem) {
          existingItem.quantite += 1;
        } else {
          cart.push({
            id: med.id,
            nom: med.nom,
            prix: med.prix,
            quantite: 1,
            image: med.image,
            categorie: med.categorie
          });
        }
        
        localStorage.setItem('panier', JSON.stringify(cart));
        
        setToastMessage(`${med.nom} ajouté au panier !`);
        setToastVariant('warning');
        setShowToast(true);
      } else {
        setToastMessage('Erreur lors de l\'ajout au panier');
        setToastVariant('danger');
        setShowToast(true);
      }
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div>
        <NavbarClient />
        <Container className="py-5 text-center">
          <Spinner animation="border" style={{ color: '#0B6E4F' }} />
          <p className="mt-3 text-muted">Chargement du produit...</p>
        </Container>
        <Footer />
      </div>
    );
  }

  if (error || !med) {
    return (
      <div>
        <NavbarClient />
        <Container className="py-5">
          <Alert variant="danger">
            {error || 'Produit non trouvé'}
          </Alert>
          <Link to="/catalogue" className="btn btn-outline-secondary">
            <FaArrowLeft className="me-2" /> Retour au catalogue
          </Link>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <NavbarClient />

      {/* Toast notification */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)} 
          delay={3000} 
          autohide
          bg={toastVariant}
        >
          <Toast.Header>
            <FaCheckCircle className="me-2" />
            <strong className="me-auto">Panier</strong>
          </Toast.Header>
          <Toast.Body className={toastVariant === 'success' || toastVariant === 'danger' ? 'text-white' : ''}>
            {toastMessage}
            {toastVariant === 'success' && (
              <div className="mt-2">
                <Button 
                  size="sm" 
                  variant="light"
                  onClick={() => navigate('/panier')}
                >
                  Voir le panier
                </Button>
              </div>
            )}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Hero banner */}
      <div style={{
        background: `linear-gradient(135deg, ${getCategoryColor(med.categorie)}18 0%, #f8f9fa 100%)`,
        padding: '30px 0 10px',
      }}>
        <Container>
          <Link to="/catalogue" className="text-decoration-none d-inline-flex align-items-center mb-3" style={{ color: '#0B6E4F' }}>
            <FaArrowLeft className="me-2" /> Retour au catalogue
          </Link>

          <Row className="align-items-center g-4">
            <Col md={4} className="text-center">
              <MedicineRealImage nom={med.nom} categorie={med.categorie} size="lg" />
            </Col>
            <Col md={8}>
              <div className="d-flex gap-2 mb-3 flex-wrap">
                <Badge style={{ backgroundColor: getCategoryColor(med.categorie) }}>{med.categorie}</Badge>
                {med.stock === 0 ? (
                  <Badge bg="danger">Rupture de stock</Badge>
                ) : med.stock < 50 ? (
                  <Badge bg="warning" text="dark">Stock faible — {med.stock} unités</Badge>
                ) : (
                  <Badge bg="success">En stock — {med.stock} unités</Badge>
                )}
                {med.ordonnance && <Badge bg="info">Ordonnance requise</Badge>}
              </div>

              <h1 className="fw-bold mb-2 gradient-text">{med.nom}</h1>
              <p className="text-muted mb-1" style={{ fontSize: '14px' }}>
                {med.forme && <span className="me-2">Forme: <strong>{med.forme}</strong></span>}
                {med.dosage && <span>Dosage: <strong>{med.dosage}</strong></span>}
              </p>
              <p className="fs-5 mt-2 mb-0">{med.description}</p>
            </Col>
          </Row>
        </Container>
      </div>

      <Container className="py-4">
        <Row className="g-4">
          {/* Info détaillées */}
          <Col md={8}>
            <Card className="border-0 shadow-sm mb-3 card-left-green">
              <Card.Header className="bg-white fw-bold border-0 pt-3">
                <FaInfoCircle className="me-2" style={{ color: '#0B6E4F' }} />
                Posologie
              </Card.Header>
              <Card.Body><p className="mb-0">{med.posologie}</p></Card.Body>
            </Card>

            <Card className="border-0 shadow-sm mb-3" style={{ borderLeft: '3px solid #F39C12' }}>
              <Card.Header className="bg-white fw-bold border-0 pt-3">
                <FaExclamationTriangle className="me-2 text-warning" />
                Effets secondaires
              </Card.Header>
              <Card.Body><p className="mb-0">{med.effetsSecondaires}</p></Card.Body>
            </Card>

            <Card className="border-0 shadow-sm mb-3" style={{ borderLeft: '3px solid #E74C3C' }}>
              <Card.Header className="bg-white fw-bold border-0 pt-3">
                <FaExclamationTriangle className="me-2 text-danger" />
                Contre-indications
              </Card.Header>
              <Card.Body><p className="mb-0">{med.contreIndications}</p></Card.Body>
            </Card>

            <Card className="border-0 shadow-sm" style={{ borderLeft: '3px solid #3498DB' }}>
              <Card.Header className="bg-white fw-bold border-0 pt-3">
                Composition
              </Card.Header>
              <Card.Body><p className="mb-0">{med.composition}</p></Card.Body>
            </Card>
          </Col>

          {/* Sidebar achat */}
          <Col md={4}>
            <Card className="border-0 shadow-sm sticky-top card-accent-green" style={{ top: '80px' }}>
              <Card.Body>
                <div className="text-center mb-3">
                  <img
                    src={getMedicineImage(med.nom, med.categorie)}
                    alt={med.nom}
                    style={{ height: '60px', objectFit: 'contain' }}
                  />
                </div>
                <h2 className="fw-bold mb-1" style={{ color: '#0B6E4F' }}>
                  {med.prix.toFixed(2)} <small style={{ fontSize: '16px' }}>MAD</small>
                </h2>
                <p className="text-muted mb-4" style={{ fontSize: '13px' }}>Prix TTC</p>

                {med.stock > 0 ? (
                  <>
                    <div className="d-flex align-items-center gap-2 mb-3 text-success">
                      <FaCheckCircle /> <span>Disponible — livraison sous 2h</span>
                    </div>
                    <Button
                      className="w-100 fw-bold mb-2"
                      size="lg"
                      style={{ backgroundColor: '#0B6E4F', border: 'none' }}
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                    >
                      {addingToCart ? (
                        <>
                          <Spinner size="sm" animation="border" className="me-2" />
                          Ajout en cours...
                        </>
                      ) : (
                        <>
                          <FaShoppingCart className="me-2" />
                          Ajouter au panier
                        </>
                      )}
                    </Button>
                    <Button variant="outline-secondary" className="w-100">
                      Retrait en pharmacie
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="d-flex align-items-center gap-2 mb-3 text-danger">
                      <FaExclamationTriangle /> <span>Actuellement indisponible</span>
                    </div>
                    <Button variant="outline-primary" className="w-100">
                      M'alerter quand disponible
                    </Button>
                  </>
                )}

                {med.ordonnance && (
                  <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#e3f2fd', fontSize: '13px' }}>
                    <strong>Ordonnance requise</strong><br />
                    Ce médicament nécessite une ordonnance valide. Vous pourrez la télécharger lors de la commande.
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Alternatives */}
            {alternatives.length > 0 && (
              <Card className="border-0 shadow-sm mt-3">
                <Card.Header className="bg-white fw-bold border-0 pt-3">
                  Alternatives disponibles
                </Card.Header>
                <Card.Body>
                  {alternatives.map((alt, i) => (
                    <Link
                      to={`/produit/${alt.id}`}
                      key={i}
                      className="text-decoration-none text-dark"
                    >
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom hover-bg-light">
                        <div className="d-flex align-items-center gap-2">
                          <img
                            src={getMedicineImage(alt.nom, alt.categorie || med.categorie)}
                            alt={alt.nom}
                            style={{ height: '36px', width: '36px', objectFit: 'contain', borderRadius: '6px', backgroundColor: '#f8f9fa' }}
                          />
                          <span>{alt.nom}</span>
                        </div>
                        <span className="fw-bold" style={{ color: '#0B6E4F' }}>{alt.prix.toFixed(2)} MAD</span>
                      </div>
                    </Link>
                  ))}
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>

      <Footer />
    </div>
  );
}

export default Produit;