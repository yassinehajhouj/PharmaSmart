import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Table, Form, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import { FaTrash, FaMinus, FaPlus, FaShoppingCart, FaTruck, FaStore, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import NavbarClient from '../../components/NavbarClient';
import Footer from '../../components/Footer';
import { getMedicineImage } from '../../utils/medicineVisuals';
import orderService from '../../services/orderService';
import authService from '../../services/authService';
import api from '../../services/api';

const BACKEND_URL = 'http://127.0.0.1:8000';
const toAbsoluteUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
};

function Panier() {
  const navigate = useNavigate();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [livraison, setLivraison] = useState('domicile');
  const [validating, setValidating] = useState(false);
  const [updating, setUpdating] = useState(null);
  
  // Modal de confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [adresseLivraison, setAdresseLivraison] = useState('');
  
  // Pharmacies disponibles
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedPharmacie, setSelectedPharmacie] = useState(null);

  const fraisLivraison = livraison === 'domicile' ? 15.00 : 0;
  const sousTotal = items.reduce((sum, item) => sum + (parseFloat(item.prix) * item.quantite), 0);
  const total = sousTotal + fraisLivraison;

  // Charger le panier et les pharmacies
  useEffect(() => {
    const fetchData = async () => {
      const auth = authService.isAuthenticated();
      setIsAuthenticated(auth);

      // Les pharmacies seront chargées quand on ouvre le modal

      if (!auth) {
        // Charger depuis localStorage si non connecté
        const localCart = localStorage.getItem('panier');
        if (localCart) {
          try {
            const parsed = JSON.parse(localCart);
            setItems(parsed.map((item, index) => ({
              id: item.id || index,
              nom: item.nom,
              prix: parseFloat(item.prix),
              quantite: item.quantite || 1,
              categorie: item.categorie || 'Douleur',
              image: item.image
            })));
          } catch (e) {
            console.error('Erreur parsing localStorage:', e);
          }
        }
        setLoading(false);
        return;
      }

      try {
        const panier = await orderService.getPanier();

        // Formater les items depuis l'API
        const formattedItems = (panier.items || []).map(item => ({
          id: item.id,
          stockId: item.stock,
          nom: item.medicament_nom || 'Médicament',
          prix: parseFloat(item.prix_unitaire || 0),
          quantite: item.quantite,
          sousTotal: parseFloat(item.sous_total || 0),
          categorie: 'Douleur',
          image: item.medicament_image || null,
        }));

        setItems(formattedItems);
      } catch (err) {
        console.error('Erreur chargement panier:', err);
        // Fallback vers localStorage
        const localCart = localStorage.getItem('panier');
        if (localCart) {
          try {
            const parsed = JSON.parse(localCart);
            setItems(parsed.map((item, index) => ({
              id: item.id || index,
              nom: item.nom,
              prix: parseFloat(item.prix),
              quantite: item.quantite || 1,
              categorie: item.categorie || 'Douleur'
            })));
          } catch (e) {
            console.error('Erreur parsing localStorage:', e);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Modifier la quantité
  const modifierQuantite = async (id, delta) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const nouvelleQte = Math.max(1, item.quantite + delta);
    
    setUpdating(id);

    // Mise à jour locale immédiate
    setItems(items.map(i => 
      i.id === id ? { ...i, quantite: nouvelleQte } : i
    ));

    // Sauvegarder
    if (!isAuthenticated) {
      const updatedItems = items.map(i =>
        i.id === id ? { ...i, quantite: nouvelleQte } : i
      );
      localStorage.setItem('panier', JSON.stringify(updatedItems));
    }
    
    setUpdating(null);
  };

  // Supprimer un item
  const supprimerItem = async (id) => {
    setError('');
    setUpdating(id);

    if (isAuthenticated) {
      try {
        await orderService.retirerDuPanier(id);
        setItems(items.filter(item => item.id !== id));
        setSuccess('Article retiré du panier');
        setTimeout(() => setSuccess(''), 2000);
      } catch (err) {
        console.error('Erreur suppression:', err);
        setError('Erreur lors de la suppression');
      }
    } else {
      const updatedItems = items.filter(item => item.id !== id);
      setItems(updatedItems);
      localStorage.setItem('panier', JSON.stringify(updatedItems));
      setSuccess('Article retiré du panier');
      setTimeout(() => setSuccess(''), 2000);
    }
    
    setUpdating(null);
  };

  // Vider le panier
  const viderPanier = async () => {
    if (isAuthenticated) {
      try {
        await orderService.viderPanier();
        setItems([]);
        setSuccess('Panier vidé');
        setTimeout(() => setSuccess(''), 2000);
      } catch (err) {
        setError('Erreur lors du vidage du panier');
      }
    } else {
      setItems([]);
      localStorage.removeItem('panier');
      setSuccess('Panier vidé');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  // Ouvrir le modal de confirmation
  // Ouvrir le modal de confirmation
const ouvrirConfirmation = async () => {
  if (!isAuthenticated) {
    navigate('/connexion');
    return;
  }
  
  // Charger les pharmacies qui ont les produits en stock
  try {
    const pharmaciesData = await orderService.getPharmaciesDisponibles();
    setPharmacies(pharmaciesData);
    
    if (pharmaciesData.length > 0) {
      setSelectedPharmacie(pharmaciesData[0].id);
    } else {
      // Si aucune pharmacie n'a tous les produits, charger toutes les pharmacies
      const response = await api.get('/pharmacies/profiles/');
      setPharmacies(response.data);
      if (response.data.length > 0) {
        setSelectedPharmacie(response.data[0].id);
      }
    }
  } catch (err) {
    console.error('Erreur chargement pharmacies:', err);
    // Fallback: charger toutes les pharmacies
    try {
      const response = await api.get('/pharmacies/profiles/');
      setPharmacies(response.data);
      if (response.data.length > 0) {
        setSelectedPharmacie(response.data[0].id);
      }
    } catch (e) {
      console.error('Erreur fallback:', e);
    }
  }
  
  setShowConfirmModal(true);
};

  // Valider la commande
  const validerCommande = async () => {
    setValidating(true);
    setError('');

    try {
      const commande = await orderService.creerCommande(
        selectedPharmacie,
        livraison === 'domicile' ? 'LIVRAISON' : 'RETRAIT',
        adresseLivraison
      );

      setShowConfirmModal(false);
      setSuccess('🎉 Commande créée avec succès !');
      setItems([]);
      localStorage.removeItem('panier');

      // Rediriger vers les commandes
      setTimeout(() => {
        navigate(`/commande/${commande.id}`);
      }, 1500);
      
    } catch (err) {
      console.error('Erreur commande:', err);
      setError(err.response?.data?.error || 'Erreur lors de la création de la commande');
      setShowConfirmModal(false);
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div>
        <NavbarClient />
        <Container className="py-5 text-center">
          <Spinner animation="border" style={{ color: '#0B6E4F' }} />
          <p className="mt-3 text-muted">Chargement du panier...</p>
        </Container>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <NavbarClient />
        <Container className="py-5 text-center">
          {success && (
            <Alert variant="success" className="mb-4">
              {success}
            </Alert>
          )}
          <div style={{ position: 'relative', height: '120px', marginBottom: '10px' }}>
            <div className="animate-float" style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 90, height: 90, borderRadius: 22,
              background: 'linear-gradient(135deg, #e0e0e0, #bdbdbd)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
            }}>
              <FaShoppingCart size={36} color="rgba(255,255,255,0.85)" />
            </div>
          </div>
          <h3 className="fw-bold mt-3">Votre panier est vide</h3>
          <p className="text-muted mb-4">Parcourez notre catalogue pour trouver vos médicaments</p>
          <Link to="/catalogue">
            <Button style={{ backgroundColor: '#0B6E4F', border: 'none' }} size="lg">
              Voir le catalogue
            </Button>
          </Link>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <NavbarClient cartCount={items.length} />

      <Container className="py-4">
        <h2 className="fw-bold mb-4 gradient-text">
          <FaShoppingCart className="me-2" />
          Mon Panier 
          <Badge bg="success" className="ms-2" style={{ fontSize: '14px' }}>
            {items.length} article{items.length > 1 ? 's' : ''}
          </Badge>
        </h2>

        {/* Messages */}
        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            <FaExclamationTriangle className="me-2" />
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" onClose={() => setSuccess('')} dismissible>
            <FaCheckCircle className="me-2" />
            {success}
          </Alert>
        )}

        {!isAuthenticated && (
          <Alert variant="info" className="mb-3">
            💡 <Link to="/connexion" className="alert-link">Connectez-vous</Link> pour sauvegarder votre panier et passer commande.
          </Alert>
        )}

        <Row className="g-4">
          {/* Liste des articles */}
          <Col lg={8}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <Table responsive className="mb-0">
                  <thead style={{ backgroundColor: '#f8f9fa' }}>
                    <tr>
                      <th style={{ padding: '15px' }}>Produit</th>
                      <th className="text-center">Prix unitaire</th>
                      <th className="text-center">Quantité</th>
                      <th className="text-center">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} style={{ opacity: updating === item.id ? 0.5 : 1 }}>
                        <td style={{ padding: '15px' }}>
                          <div className="d-flex align-items-center gap-3">
                            <img
                              src={toAbsoluteUrl(item.image) || getMedicineImage(item.nom, item.categorie || 'Douleur')}
                              alt={item.nom}
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
                              <span className="fw-bold d-block">{item.nom}</span>
                              <small className="text-muted">{item.categorie}</small>
                            </div>
                          </div>
                        </td>
                        <td className="text-center align-middle">
                          <span className="fw-bold" style={{ color: '#0B6E4F' }}>
                            {parseFloat(item.prix).toFixed(2)} MAD
                          </span>
                        </td>
                        <td className="text-center align-middle">
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <Button 
                              variant="outline-secondary" 
                              size="sm" 
                              onClick={() => modifierQuantite(item.id, -1)}
                              disabled={item.quantite <= 1 || updating === item.id}
                              style={{ width: '32px', height: '32px', padding: 0 }}
                            >
                              <FaMinus size={10} />
                            </Button>
                            <span className="fw-bold" style={{ minWidth: '30px', textAlign: 'center' }}>
                              {item.quantite}
                            </span>
                            <Button 
                              variant="outline-secondary" 
                              size="sm" 
                              onClick={() => modifierQuantite(item.id, 1)}
                              disabled={updating === item.id}
                              style={{ width: '32px', height: '32px', padding: 0 }}
                            >
                              <FaPlus size={10} />
                            </Button>
                          </div>
                        </td>
                        <td className="text-center align-middle">
                          <span className="fw-bold fs-5" style={{ color: '#0B6E4F' }}>
                            {(parseFloat(item.prix) * item.quantite).toFixed(2)} MAD
                          </span>
                        </td>
                        <td className="text-center align-middle">
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => supprimerItem(item.id)}
                            disabled={updating === item.id}
                          >
                            {updating === item.id ? (
                              <Spinner size="sm" animation="border" />
                            ) : (
                              <FaTrash />
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>

            <div className="d-flex justify-content-between mt-3">
              <Link to="/catalogue" className="text-decoration-none" style={{ color: '#0B6E4F' }}>
                ← Continuer les achats
              </Link>
              <Button variant="outline-danger" size="sm" onClick={viderPanier}>
                <FaTrash className="me-1" /> Vider le panier
              </Button>
            </div>
          </Col>

          {/* Résumé */}
          <Col lg={4}>
            {/* Mode de livraison */}
            <Card className="border-0 shadow-sm mb-3">
              <Card.Header className="bg-white fw-bold border-0 pt-3">
                Mode de réception
              </Card.Header>
              <Card.Body>
                <Form.Check
                  type="radio"
                  id="livraison-domicile"
                  name="livraison"
                  label={
                    <div className="ms-2">
                      <div className="d-flex align-items-center">
                        <FaTruck className="me-2" style={{ color: '#0B6E4F' }} />
                        <strong>Livraison à domicile</strong>
                      </div>
                      <small className="text-muted">Sous 2h — 15.00 MAD</small>
                    </div>
                  }
                  checked={livraison === 'domicile'}
                  onChange={() => setLivraison('domicile')}
                  className="mb-3 p-3 rounded"
                  style={{ 
                    backgroundColor: livraison === 'domicile' ? '#e8f5e9' : 'transparent',
                    border: livraison === 'domicile' ? '2px solid #0B6E4F' : '1px solid #dee2e6'
                  }}
                />
                <Form.Check
                  type="radio"
                  id="livraison-pharmacie"
                  name="livraison"
                  label={
                    <div className="ms-2">
                      <div className="d-flex align-items-center">
                        <FaStore className="me-2" style={{ color: '#1B4965' }} />
                        <strong>Retrait en pharmacie</strong>
                      </div>
                      <small className="text-muted">Prêt sous 30min — Gratuit</small>
                    </div>
                  }
                  checked={livraison === 'pharmacie'}
                  onChange={() => setLivraison('pharmacie')}
                  className="p-3 rounded"
                  style={{ 
                    backgroundColor: livraison === 'pharmacie' ? '#e3f2fd' : 'transparent',
                    border: livraison === 'pharmacie' ? '2px solid #1B4965' : '1px solid #dee2e6'
                  }}
                />
              </Card.Body>
            </Card>

            {/* Total */}
            <Card className="border-0 shadow-sm" style={{ borderTop: '4px solid #0B6E4F' }}>
              <Card.Header className="bg-white fw-bold border-0 pt-3">
                Résumé de la commande
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Sous-total ({items.length} articles)</span>
                  <span className="fw-bold">{sousTotal.toFixed(2)} MAD</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Livraison</span>
                  <span className={fraisLivraison === 0 ? 'text-success fw-bold' : ''}>
                    {fraisLivraison === 0 ? 'Gratuit' : `${fraisLivraison.toFixed(2)} MAD`}
                  </span>
                </div>
                <hr />
                <div className="d-flex justify-content-between mb-3">
                  <span className="fw-bold fs-5">Total TTC</span>
                  <span className="fw-bold fs-4" style={{ color: '#0B6E4F' }}>
                    {total.toFixed(2)} MAD
                  </span>
                </div>
                <Button
                  className="w-100 fw-bold"
                  size="lg"
                  style={{ backgroundColor: '#0B6E4F', border: 'none' }}
                  onClick={ouvrirConfirmation}
                  disabled={validating}
                >
                  {validating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Validation...
                    </>
                  ) : isAuthenticated ? (
                    <>
                      <FaCheckCircle className="me-2" />
                      Valider la commande
                    </>
                  ) : (
                    'Se connecter pour commander'
                  )}
                </Button>
                <p className="text-muted text-center mt-3" style={{ fontSize: '12px' }}>
                  🔒 Paiement sécurisé à la livraison ou en pharmacie
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Modal de confirmation */}
<Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
  <Modal.Header closeButton>
    <Modal.Title>Confirmer la commande</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {/* Sélection de pharmacie */}
    <Form.Group className="mb-3">
      <Form.Label className="fw-bold">
        Pharmacie 
        {pharmacies.length > 0 && (
          <Badge bg="success" className="ms-2" style={{ fontSize: '10px' }}>
            {pharmacies.length} disponible{pharmacies.length > 1 ? 's' : ''}
          </Badge>
        )}
      </Form.Label>
      {pharmacies.length === 0 ? (
        <Alert variant="warning" className="mb-0">
          <small>Aucune pharmacie n'a tous vos produits en stock. Veuillez contacter une pharmacie.</small>
        </Alert>
      ) : (
        <Form.Select 
          value={selectedPharmacie || ''} 
          onChange={(e) => setSelectedPharmacie(e.target.value)}
        >
          {pharmacies.map(pharma => (
            <option key={pharma.id} value={pharma.id}>
              {pharma.nom_pharmacie} — {pharma.ville}
              {pharma.telephone && ` (${pharma.telephone})`}
            </option>
          ))}
        </Form.Select>
      )}
    </Form.Group>

    {/* Adresse de livraison */}
    {livraison === 'domicile' && (
      <Form.Group className="mb-3">
        <Form.Label className="fw-bold">Adresse de livraison</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          placeholder="Votre adresse complète..."
          value={adresseLivraison}
          onChange={(e) => setAdresseLivraison(e.target.value)}
        />
      </Form.Group>
    )}

    {/* Résumé */}
    <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="d-flex justify-content-between mb-2">
        <span>Articles ({items.length})</span>
        <span>{sousTotal.toFixed(2)} MAD</span>
      </div>
      <div className="d-flex justify-content-between mb-2">
        <span>Livraison</span>
        <span>{fraisLivraison === 0 ? 'Gratuit' : `${fraisLivraison.toFixed(2)} MAD`}</span>
      </div>
      <hr />
      <div className="d-flex justify-content-between">
        <span className="fw-bold">Total</span>
        <span className="fw-bold" style={{ color: '#0B6E4F' }}>{total.toFixed(2)} MAD</span>
      </div>
    </div>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
      Annuler
    </Button>
    <Button 
      style={{ backgroundColor: '#0B6E4F', border: 'none' }}
      onClick={validerCommande}
      disabled={validating || pharmacies.length === 0 || (livraison === 'domicile' && !adresseLivraison)}
    >
      {validating ? (
        <>
          <Spinner size="sm" animation="border" className="me-2" />
          Validation...
        </>
      ) : (
        'Confirmer la commande'
      )}
    </Button>
    </Modal.Footer>
     </Modal>

      <Footer />
    </div>
  );
}

export default Panier;