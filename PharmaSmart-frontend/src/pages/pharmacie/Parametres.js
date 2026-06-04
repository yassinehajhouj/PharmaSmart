import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge } from 'react-bootstrap';
import { FaCog, FaCheck, FaBell, FaShieldAlt, FaPalette, FaStore, FaUsers } from 'react-icons/fa';
import NavbarPharmacie from '../../components/NavbarPharmacie';

function Parametres() {
  const [activeTab, setActiveTab] = useState('pharmacie');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [infosPharmcie, setInfosPharmacie] = useState({
    nom: 'Pharmacie El Amal',
    adresse: '25, Av. Hassan II, Rabat',
    telephone: '+212 5 37-123456',
    email: 'contact@pharmacie-elamal.ma',
    heureOuverture: '08:00',
    heureFermeture: '22:00',
    siteWeb: 'www.pharmacie-elamal.ma',
    description: 'Pharmacie moderne au cœur de Rabat, disponible 7j/7.',
  });

  const [alertes, setAlertes] = useState({
    seuilStockBas: 50,
    joursAvantExpiration: 30,
    emailAlertes: true,
    smsAlertes: false,
    alerteRupture: true,
    alerteExpiration: true,
    alerteCommande: true,
  });

  const [apparence, setApparence] = useState({
    couleurPrincipale: '#0B6E4F',
    theme: 'clair',
    langue: 'fr',
  });

  const sauvegarder = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarPharmacie />

      <Container className="py-4">
        <div className="mb-4">
          <h2 className="fw-bold mb-1">
            <FaCog className="me-2" style={{ color: '#1B4965' }} />
            Paramètres
          </h2>
          <p className="text-muted mb-0">Configuration de votre espace pharmacie</p>
        </div>

        {saveSuccess && (
          <Alert variant="success" className="mb-3">
            <FaCheck className="me-2" />
            Paramètres sauvegardés avec succès.
          </Alert>
        )}

        <Row className="g-4">
          {/* Navigation latérale */}
          <Col md={3}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-2">
                {[
                  { key: 'pharmacie', icon: <FaStore />, label: 'Ma pharmacie' },
                  { key: 'alertes', icon: <FaBell />, label: 'Alertes & Notifications' },
                  { key: 'apparence', icon: <FaPalette />, label: 'Apparence' },
                  { key: 'securite', icon: <FaShieldAlt />, label: 'Sécurité' },
                  { key: 'utilisateurs', icon: <FaUsers />, label: 'Utilisateurs' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className="w-100 text-start border-0 rounded p-3 mb-1 d-flex align-items-center gap-2"
                    style={{
                      backgroundColor: activeTab === item.key ? '#0B6E4F15' : 'transparent',
                      color: activeTab === item.key ? '#0B6E4F' : '#555',
                      fontWeight: activeTab === item.key ? '600' : 'normal',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </Card.Body>
            </Card>
          </Col>

          {/* Contenu */}
          <Col md={9}>
            {/* Infos pharmacie */}
            {activeTab === 'pharmacie' && (
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white fw-bold border-0 pt-3">
                  <FaStore className="me-2" style={{ color: '#0B6E4F' }} />
                  Informations de la pharmacie
                </Card.Header>
                <Card.Body className="p-4">
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Nom de la pharmacie</Form.Label>
                        <Form.Control
                          value={infosPharmcie.nom}
                          onChange={e => setInfosPharmacie({ ...infosPharmcie, nom: e.target.value })}
                          style={{ borderRadius: '8px' }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Téléphone</Form.Label>
                        <Form.Control
                          value={infosPharmcie.telephone}
                          onChange={e => setInfosPharmacie({ ...infosPharmcie, telephone: e.target.value })}
                          style={{ borderRadius: '8px' }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={8}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Adresse</Form.Label>
                        <Form.Control
                          value={infosPharmcie.adresse}
                          onChange={e => setInfosPharmacie({ ...infosPharmcie, adresse: e.target.value })}
                          style={{ borderRadius: '8px' }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Email</Form.Label>
                        <Form.Control
                          type="email"
                          value={infosPharmcie.email}
                          onChange={e => setInfosPharmacie({ ...infosPharmcie, email: e.target.value })}
                          style={{ borderRadius: '8px' }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Heure ouverture</Form.Label>
                        <Form.Control
                          type="time"
                          value={infosPharmcie.heureOuverture}
                          onChange={e => setInfosPharmacie({ ...infosPharmcie, heureOuverture: e.target.value })}
                          style={{ borderRadius: '8px' }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Heure fermeture</Form.Label>
                        <Form.Control
                          type="time"
                          value={infosPharmcie.heureFermeture}
                          onChange={e => setInfosPharmacie({ ...infosPharmcie, heureFermeture: e.target.value })}
                          style={{ borderRadius: '8px' }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Site web</Form.Label>
                        <Form.Control
                          value={infosPharmcie.siteWeb}
                          onChange={e => setInfosPharmacie({ ...infosPharmcie, siteWeb: e.target.value })}
                          style={{ borderRadius: '8px' }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={infosPharmcie.description}
                          onChange={e => setInfosPharmacie({ ...infosPharmcie, description: e.target.value })}
                          style={{ borderRadius: '8px' }}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* Alertes */}
            {activeTab === 'alertes' && (
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white fw-bold border-0 pt-3">
                  <FaBell className="me-2" style={{ color: '#F39C12' }} />
                  Alertes & Notifications
                </Card.Header>
                <Card.Body className="p-4">
                  <h6 className="fw-bold mb-3 text-muted" style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                    Seuils d'alerte
                  </h6>
                  <Row className="g-3 mb-4">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>
                          Seuil de stock bas (unités)
                        </Form.Label>
                        <Form.Control
                          type="number"
                          value={alertes.seuilStockBas}
                          onChange={e => setAlertes({ ...alertes, seuilStockBas: parseInt(e.target.value) })}
                          style={{ borderRadius: '8px' }}
                        />
                        <Form.Text className="text-muted" style={{ fontSize: '12px' }}>
                          Alerte déclenchée quand le stock passe sous ce seuil
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>
                          Alerte expiration (jours avant)
                        </Form.Label>
                        <Form.Control
                          type="number"
                          value={alertes.joursAvantExpiration}
                          onChange={e => setAlertes({ ...alertes, joursAvantExpiration: parseInt(e.target.value) })}
                          style={{ borderRadius: '8px' }}
                        />
                        <Form.Text className="text-muted" style={{ fontSize: '12px' }}>
                          Alerte déclenchée N jours avant expiration
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  <h6 className="fw-bold mb-3 text-muted" style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                    Canaux de notification
                  </h6>
                  <div className="d-flex flex-column gap-3 mb-4">
                    {[
                      { key: 'emailAlertes', label: 'Notifications par email', desc: 'Recevoir les alertes sur votre email' },
                      { key: 'smsAlertes', label: 'Notifications par SMS', desc: 'Recevoir les alertes sur votre téléphone' },
                    ].map(item => (
                      <div key={item.key} className="d-flex justify-content-between align-items-center p-3 rounded"
                        style={{ backgroundColor: '#f8f9fa' }}>
                        <div>
                          <div className="fw-bold" style={{ fontSize: '14px' }}>{item.label}</div>
                          <div className="text-muted" style={{ fontSize: '12px' }}>{item.desc}</div>
                        </div>
                        <Form.Check
                          type="switch"
                          checked={alertes[item.key]}
                          onChange={e => setAlertes({ ...alertes, [item.key]: e.target.checked })}
                        />
                      </div>
                    ))}
                  </div>

                  <h6 className="fw-bold mb-3 text-muted" style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                    Types d'alertes
                  </h6>
                  <div className="d-flex flex-column gap-3">
                    {[
                      { key: 'alerteRupture', label: 'Rupture de stock', desc: 'Alerter quand un médicament atteint 0' },
                      { key: 'alerteExpiration', label: 'Médicaments bientôt périmés', desc: 'Alerter avant la date d\'expiration' },
                      { key: 'alerteCommande', label: 'Nouvelles commandes', desc: 'Alerter à chaque nouvelle commande client' },
                    ].map(item => (
                      <div key={item.key} className="d-flex justify-content-between align-items-center p-3 rounded"
                        style={{ backgroundColor: '#f8f9fa' }}>
                        <div>
                          <div className="fw-bold" style={{ fontSize: '14px' }}>{item.label}</div>
                          <div className="text-muted" style={{ fontSize: '12px' }}>{item.desc}</div>
                        </div>
                        <Form.Check
                          type="switch"
                          checked={alertes[item.key]}
                          onChange={e => setAlertes({ ...alertes, [item.key]: e.target.checked })}
                        />
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Apparence */}
            {activeTab === 'apparence' && (
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white fw-bold border-0 pt-3">
                  <FaPalette className="me-2" style={{ color: '#9B59B6' }} />
                  Apparence
                </Card.Header>
                <Card.Body className="p-4">
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Thème</Form.Label>
                        <Form.Select
                          value={apparence.theme}
                          onChange={e => setApparence({ ...apparence, theme: e.target.value })}
                          style={{ borderRadius: '8px' }}
                        >
                          <option value="clair">Mode clair</option>
                          <option value="sombre">Mode sombre</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Langue</Form.Label>
                        <Form.Select
                          value={apparence.langue}
                          onChange={e => setApparence({ ...apparence, langue: e.target.value })}
                          style={{ borderRadius: '8px' }}
                        >
                          <option value="fr">Français</option>
                          <option value="ar">العربية</option>
                          <option value="en">English</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Couleur principale</Form.Label>
                        <div className="d-flex gap-2 align-items-center mt-1">
                          {['#0B6E4F', '#1B4965', '#E74C3C', '#9B59B6', '#F39C12', '#2C3E50'].map(c => (
                            <div
                              key={c}
                              onClick={() => setApparence({ ...apparence, couleurPrincipale: c })}
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                backgroundColor: c,
                                cursor: 'pointer',
                                border: apparence.couleurPrincipale === c ? '3px solid #fff' : 'none',
                                boxShadow: apparence.couleurPrincipale === c ? `0 0 0 2px ${c}` : 'none',
                              }}
                            />
                          ))}
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* Sécurité */}
            {activeTab === 'securite' && (
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white fw-bold border-0 pt-3">
                  <FaShieldAlt className="me-2" style={{ color: '#1B4965' }} />
                  Sécurité
                </Card.Header>
                <Card.Body className="p-4">
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Mot de passe actuel</Form.Label>
                      <Form.Control type="password" placeholder="••••••••" style={{ borderRadius: '8px' }} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Nouveau mot de passe</Form.Label>
                      <Form.Control type="password" placeholder="••••••••" style={{ borderRadius: '8px' }} />
                    </Form.Group>
                    <Form.Group className="mb-4">
                      <Form.Label style={{ fontSize: '13px', fontWeight: '600' }}>Confirmer</Form.Label>
                      <Form.Control type="password" placeholder="••••••••" style={{ borderRadius: '8px' }} />
                    </Form.Group>
                  </Form>

                  <div className="p-3 rounded mb-3" style={{ backgroundColor: '#e8f4fd' }}>
                    <p className="fw-bold mb-2" style={{ fontSize: '13px', color: '#1B4965' }}>
                      Connexions récentes
                    </p>
                    {[
                      { appareil: 'Chrome — Windows 11', lieu: 'Rabat, Maroc', date: "Aujourd'hui 09:15" },
                      { appareil: 'Firefox — Windows 10', lieu: 'Rabat, Maroc', date: 'Hier 18:42' },
                    ].map((c, i) => (
                      <div key={i} className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '13px' }}>
                        <div>
                          <span className="fw-bold">{c.appareil}</span>
                          <span className="text-muted ms-2">{c.lieu}</span>
                        </div>
                        <span className="text-muted">{c.date}</span>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Utilisateurs */}
            {activeTab === 'utilisateurs' && (
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white fw-bold border-0 pt-3 d-flex justify-content-between">
                  <span><FaUsers className="me-2" style={{ color: '#0B6E4F' }} />Utilisateurs autorisés</span>
                  <Button size="sm" style={{ backgroundColor: '#0B6E4F', border: 'none', fontSize: '12px' }}>
                    + Inviter
                  </Button>
                </Card.Header>
                <Card.Body className="p-4">
                  {[
                    { nom: 'Dr. Pharmacien Principal', email: 'admin@pharmacie.ma', role: 'Administrateur', statut: 'actif' },
                    { nom: 'Assistante Ghita', email: 'ghita@pharmacie.ma', role: 'Gestionnaire stock', statut: 'actif' },
                    { nom: 'Livreur Karim', email: 'karim@pharmacie.ma', role: 'Livreur', statut: 'actif' },
                  ].map((u, i) => (
                    <div key={i} className="d-flex justify-content-between align-items-center p-3 rounded mb-2"
                      style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                          style={{ width: '40px', height: '40px', backgroundColor: '#0B6E4F', color: 'white', fontSize: '14px' }}>
                          {u.nom[0]}
                        </div>
                        <div>
                          <div className="fw-bold" style={{ fontSize: '14px' }}>{u.nom}</div>
                          <div className="text-muted" style={{ fontSize: '12px' }}>{u.email}</div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Badge bg="light" text="dark" style={{ fontSize: '12px' }}>{u.role}</Badge>
                        <Badge bg="success" style={{ fontSize: '11px' }}>Actif</Badge>
                      </div>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            )}

            {/* Bouton sauvegarder */}
            <div className="d-flex justify-content-end mt-3">
              <Button
                style={{ backgroundColor: '#0B6E4F', border: 'none' }}
                onClick={sauvegarder}
              >
                <FaCheck className="me-2" /> Sauvegarder les modifications
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Parametres;
