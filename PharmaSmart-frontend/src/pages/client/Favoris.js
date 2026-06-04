import { useState } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form } from 'react-bootstrap';
import { FaHeart, FaShoppingCart, FaTrash, FaSearch, FaHeartBroken } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import NavbarClient from '../../components/NavbarClient';
import Footer from '../../components/Footer';

function Favoris() {
  const [recherche, setRecherche] = useState('');
  const [favoris, setFavoris] = useState([
    { id: 1, nom: 'Doliprane 500mg', categorie: 'Douleur', prix: 25.50, stock: 150, description: 'Antalgique et antipyrétique. Traitement des douleurs légères à modérées.' },
    { id: 2, nom: 'Amoxicilline 1g', categorie: 'Antibiotique', prix: 45.00, stock: 30, description: 'Antibiotique à large spectre. Traitement des infections bactériennes.' },
    { id: 4, nom: 'Oméprazole 20mg', categorie: 'Gastro', prix: 32.00, stock: 85, description: 'Inhibiteur de la pompe à protons. Protège contre l\'acidité gastrique.' },
    { id: 5, nom: 'Vitamine C 1000mg', categorie: 'Vitamines', prix: 55.00, stock: 200, description: 'Complément alimentaire. Renforce les défenses immunitaires.' },
    { id: 6, nom: 'Loratadine 10mg', categorie: 'Allergie', prix: 28.00, stock: 0, description: 'Antihistaminique non sédatif. Soulage les allergies saisonnières.' },
  ]);

  const retirerFavori = (id) => {
    setFavoris(favoris.filter(f => f.id !== id));
  };

  const resultats = favoris.filter(f =>
    f.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    f.categorie.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarClient />

      <Container className="py-4">
        {/* En-tête */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">
              <FaHeart className="me-2" style={{ color: '#E74C3C' }} />
              Mes Favoris
            </h2>
            <p className="text-muted mb-0">{favoris.length} médicament(s) sauvegardé(s)</p>
          </div>
          {favoris.length > 0 && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => setFavoris([])}
            >
              <FaTrash className="me-1" /> Tout supprimer
            </Button>
          )}
        </div>

        {favoris.length === 0 ? (
          /* État vide */
          <Card className="border-0 shadow-sm text-center py-5">
            <Card.Body>
              <FaHeartBroken size={60} style={{ color: '#dee2e6', marginBottom: '20px' }} />
              <h5 className="fw-bold text-muted">Aucun favori pour l'instant</h5>
              <p className="text-muted">Ajoutez des médicaments à vos favoris depuis le catalogue.</p>
              <Link to="/catalogue">
                <Button style={{ backgroundColor: '#0B6E4F', border: 'none' }}>
                  Explorer le catalogue
                </Button>
              </Link>
            </Card.Body>
          </Card>
        ) : (
          <>
            {/* Barre de recherche */}
            <div className="position-relative mb-4">
              <FaSearch className="position-absolute top-50 translate-middle-y ms-3 text-muted" style={{ zIndex: 1 }} />
              <Form.Control
                type="text"
                placeholder="Rechercher dans mes favoris..."
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                style={{ paddingLeft: '40px', borderRadius: '10px' }}
              />
            </div>

            {resultats.length === 0 ? (
              <p className="text-center text-muted py-4">Aucun résultat pour "{recherche}"</p>
            ) : (
              <Row className="g-3">
                {resultats.map(med => (
                  <Col md={6} lg={4} key={med.id}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <Badge bg="secondary">{med.categorie}</Badge>
                          <div className="d-flex gap-1">
                            {med.stock === 0
                              ? <Badge bg="danger">Rupture</Badge>
                              : med.stock < 50
                                ? <Badge bg="warning" text="dark">Stock faible</Badge>
                                : <Badge bg="success">En stock</Badge>
                            }
                          </div>
                        </div>
                        <Card.Title className="fw-bold" style={{ fontSize: '15px' }}>{med.nom}</Card.Title>
                        <Card.Text className="text-muted" style={{ fontSize: '13px' }}>
                          {med.description}
                        </Card.Text>
                        <div className="d-flex justify-content-between align-items-center mt-auto">
                          <span className="fw-bold fs-5" style={{ color: '#0B6E4F' }}>
                            {med.prix.toFixed(2)} MAD
                          </span>
                        </div>
                      </Card.Body>
                      <Card.Footer className="bg-white border-0 pb-3">
                        <div className="d-flex gap-2">
                          <Button
                            className="flex-grow-1"
                            style={{ backgroundColor: '#0B6E4F', border: 'none', fontSize: '13px' }}
                            disabled={med.stock === 0}
                          >
                            <FaShoppingCart className="me-1" />
                            {med.stock === 0 ? 'Indisponible' : 'Ajouter au panier'}
                          </Button>
                          <Button
                            variant="outline-danger"
                            style={{ fontSize: '13px' }}
                            onClick={() => retirerFavori(med.id)}
                            title="Retirer des favoris"
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </Card.Footer>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </>
        )}

        {/* Suggestions */}
        {favoris.length > 0 && (
          <div className="mt-5">
            <h5 className="fw-bold mb-3">Produits similaires qui pourraient vous intéresser</h5>
            <Row className="g-3">
              {[
                { nom: 'Efferalgan 1g', categorie: 'Douleur', prix: 30.00 },
                { nom: 'Cétirizine 10mg', categorie: 'Allergie', prix: 22.00 },
                { nom: 'Smecta 3g', categorie: 'Gastro', prix: 35.00 },
              ].map((prod, i) => (
                <Col md={4} key={i}>
                  <Card className="border-0 shadow-sm" style={{ borderLeft: '3px solid #0B6E4F !important' }}>
                    <Card.Body className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold">{prod.nom}</div>
                        <Badge bg="secondary" style={{ fontSize: '11px' }}>{prod.categorie}</Badge>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold" style={{ color: '#0B6E4F' }}>{prod.prix.toFixed(2)} MAD</div>
                        <Button size="sm" variant="outline-success" className="mt-1" style={{ fontSize: '12px' }}>
                          <FaHeart className="me-1" size={10} /> Ajouter
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Container>

      <Footer />
    </div>
  );
}

export default Favoris;
