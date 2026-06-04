import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, Tab, Nav, Alert, Spinner } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaPhone, FaLock, FaEdit, FaCheck, FaShoppingBag, FaHeart, FaFileAlt } from 'react-icons/fa';
import NavbarClient from '../../components/NavbarClient';
import Footer from '../../components/Footer';
import authService from '../../services/authService';
import orderService from '../../services/orderService';

function Profil() {
  const [activeTab, setActiveTab] = useState('infos');
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [infos, setInfos] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    username: '',
  });

  const [mdp, setMdp] = useState({
    actuel: '',
    nouveau: '',
    confirmation: '',
  });

  const [historiqueCommandes, setHistoriqueCommandes] = useState([]);
  const [stats, setStats] = useState({ commandes: 0, favoris: 0, ordonnances: 0 });

  // Charger le profil
  useEffect(() => {
    const fetchProfile = async () => {
      if (!authService.isAuthenticated()) {
        window.location.href = '/connexion';
        return;
      }

      try {
        const user = await authService.getProfile();
        setInfos({
          prenom: user.first_name || '',
          nom: user.last_name || '',
          email: user.email || '',
          telephone: user.telephone || '',
          adresse: user.adresse || '',
          username: user.username || '',
        });

        // Charger les commandes
        try {
          const commandes = await orderService.getCommandes();
          setHistoriqueCommandes(commandes.slice(0, 5).map(cmd => ({
            id: cmd.numero,
            date: new Date(cmd.created_at).toLocaleDateString('fr-FR'),
            total: cmd.total,
            statut: cmd.statut.toLowerCase(),
            items: cmd.lignes?.length || 0
          })));
          setStats(prev => ({ ...prev, commandes: commandes.length }));
        } catch (e) {
          console.log('Pas de commandes');
        }

      } catch (err) {
        setError('Impossible de charger le profil');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      await authService.updateProfile({
        first_name: infos.prenom,
        last_name: infos.nom,
        email: infos.email,
        telephone: infos.telephone,
      });

      setSaveSuccess(true);
      setEditMode(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (mdp.nouveau !== mdp.confirmation) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setSaving(true);

    try {
      await authService.changePassword(mdp.actuel, mdp.nouveau);
      setSaveSuccess(true);
      setMdp({ actuel: '', nouveau: '', confirmation: '' });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const getStatutBadge = (s) => {
    const map = {
      livree: { bg: 'success', text: 'Livrée' },
      en_attente: { bg: 'warning', text: 'En attente' },
      annulee: { bg: 'danger', text: 'Annulée' },
      en_preparation: { bg: 'info', text: 'En préparation' },
      en_livraison: { bg: 'primary', text: 'En livraison' },
    };
    const c = map[s] || map.en_attente;
    return <Badge bg={c.bg}>{c.text}</Badge>;
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <NavbarClient />
        <Container className="py-5 text-center">
          <Spinner animation="border" style={{ color: '#0B6E4F' }} />
          <p className="mt-3">Chargement du profil...</p>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarClient />

      <Container className="py-4">
        <Row className="g-4">
          {/* Sidebar profil */}
          <Col md={3}>
            <Card className="border-0 shadow-sm text-center p-4">
              <div className="mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3"
                style={{ width: '80px', height: '80px', backgroundColor: '#0B6E4F', fontSize: '32px' }}>
                <FaUser color="white" size={35} />
              </div>
              <h5 className="fw-bold mb-1">{infos.prenom} {infos.nom}</h5>
              <p className="text-muted mb-2" style={{ fontSize: '13px' }}>{infos.email}</p>
              <Badge bg="success" className="mb-3">Client vérifié</Badge>

              <div className="d-flex justify-content-around mt-2">
                <div className="text-center">
                  <div className="fw-bold fs-5">{stats.commandes}</div>
                  <div className="text-muted" style={{ fontSize: '12px' }}>Commandes</div>
                </div>
                <div className="text-center">
                  <div className="fw-bold fs-5">{stats.favoris}</div>
                  <div className="text-muted" style={{ fontSize: '12px' }}>Favoris</div>
                </div>
                <div className="text-center">
                  <div className="fw-bold fs-5">{stats.ordonnances}</div>
                  <div className="text-muted" style={{ fontSize: '12px' }}>Ordonnances</div>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-sm mt-3">
              <Card.Body className="p-2">
                {[
                  { icon: <FaShoppingBag size={14} />, label: 'Mes commandes', href: '/commandes' },
                  { icon: <FaHeart size={14} />, label: 'Mes favoris', href: '/favoris' },
                  { icon: <FaFileAlt size={14} />, label: 'Mes ordonnances', href: '/ordonnances' },
                ].map((item, i) => (
                  <a key={i} href={item.href}
                    className="d-flex align-items-center gap-2 p-2 rounded text-decoration-none text-dark mb-1"
                    style={{ fontSize: '14px', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <span style={{ color: '#0B6E4F' }}>{item.icon}</span>
                    {item.label}
                  </a>
                ))}
              </Card.Body>
            </Card>
          </Col>

          {/* Contenu principal */}
          <Col md={9}>
            {saveSuccess && (
              <Alert variant="success" className="mb-3">
                <FaCheck className="me-2" />
                Vos informations ont été sauvegardées avec succès.
              </Alert>
            )}

            {error && (
              <Alert variant="danger" className="mb-3" onClose={() => setError('')} dismissible>
                {error}
              </Alert>
            )}

            <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-0 pt-3">
                  <Nav variant="tabs" className="border-0">
                    <Nav.Item>
                      <Nav.Link eventKey="infos" style={{ color: activeTab === 'infos' ? '#0B6E4F' : '#6c757d' }}>
                        <FaUser className="me-2" />Mes informations
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="historique" style={{ color: activeTab === 'historique' ? '#0B6E4F' : '#6c757d' }}>
                        <FaShoppingBag className="me-2" />Historique
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="securite" style={{ color: activeTab === 'securite' ? '#0B6E4F' : '#6c757d' }}>
                        <FaLock className="me-2" />Sécurité
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
                </Card.Header>

                <Card.Body className="p-4">
                  <Tab.Content>
                    {/* Onglet Informations */}
                    <Tab.Pane eventKey="infos">
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h5 className="fw-bold mb-0">Informations personnelles</h5>
                        {!editMode ? (
                          <Button variant="outline-success" size="sm" onClick={() => setEditMode(true)}>
                            <FaEdit className="me-1" /> Modifier
                          </Button>
                        ) : (
                          <div className="d-flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setEditMode(false)} disabled={saving}>
                              Annuler
                            </Button>
                            <Button size="sm" style={{ backgroundColor: '#0B6E4F', border: 'none' }} onClick={handleSave} disabled={saving}>
                              {saving ? <Spinner animation="border" size="sm" /> : <><FaCheck className="me-1" /> Enregistrer</>}
                            </Button>
                          </div>
                        )}
                      </div>

                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="text-muted" style={{ fontSize: '13px' }}>
                              <FaUser className="me-1" /> Prénom
                            </Form.Label>
                            <Form.Control
                              value={infos.prenom}
                              onChange={e => setInfos({ ...infos, prenom: e.target.value })}
                              disabled={!editMode}
                              style={{ borderRadius: '8px' }}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="text-muted" style={{ fontSize: '13px' }}>
                              <FaUser className="me-1" /> Nom
                            </Form.Label>
                            <Form.Control
                              value={infos.nom}
                              onChange={e => setInfos({ ...infos, nom: e.target.value })}
                              disabled={!editMode}
                              style={{ borderRadius: '8px' }}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="text-muted" style={{ fontSize: '13px' }}>
                              <FaEnvelope className="me-1" /> Email
                            </Form.Label>
                            <Form.Control
                              type="email"
                              value={infos.email}
                              onChange={e => setInfos({ ...infos, email: e.target.value })}
                              disabled={!editMode}
                              style={{ borderRadius: '8px' }}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="text-muted" style={{ fontSize: '13px' }}>
                              <FaPhone className="me-1" /> Téléphone
                            </Form.Label>
                            <Form.Control
                              value={infos.telephone}
                              onChange={e => setInfos({ ...infos, telephone: e.target.value })}
                              disabled={!editMode}
                              style={{ borderRadius: '8px' }}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group>
                            <Form.Label className="text-muted" style={{ fontSize: '13px' }}>
                              Nom d'utilisateur
                            </Form.Label>
                            <Form.Control
                              value={infos.username}
                              disabled={true}
                              style={{ borderRadius: '8px', backgroundColor: '#f8f9fa' }}
                            />
                            <Form.Text className="text-muted">Le nom d'utilisateur ne peut pas être modifié</Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                    </Tab.Pane>

                    {/* Onglet Historique */}
                    <Tab.Pane eventKey="historique">
                      <h5 className="fw-bold mb-4">Historique des commandes</h5>
                      {historiqueCommandes.length === 0 ? (
                        <p className="text-muted text-center py-4">Aucune commande pour le moment</p>
                      ) : (
                        historiqueCommandes.map((cmd) => (
                          <div key={cmd.id} className="d-flex justify-content-between align-items-center p-3 rounded mb-2"
                            style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                            <div>
                              <div className="fw-bold">{cmd.id}</div>
                              <div className="text-muted" style={{ fontSize: '13px' }}>
                                {cmd.date} — {cmd.items} article(s)
                              </div>
                            </div>
                            <div className="text-end">
                              <div className="fw-bold mb-1">{parseFloat(cmd.total).toFixed(2)} MAD</div>
                              {getStatutBadge(cmd.statut)}
                            </div>
                          </div>
                        ))
                      )}
                    </Tab.Pane>

                    {/* Onglet Sécurité */}
                    <Tab.Pane eventKey="securite">
                      <h5 className="fw-bold mb-4">Changer le mot de passe</h5>
                      <Row>
                        <Col md={7}>
                          <Form onSubmit={handleChangePassword}>
                            <Form.Group className="mb-3">
                              <Form.Label className="text-muted" style={{ fontSize: '13px' }}>Mot de passe actuel</Form.Label>
                              <Form.Control
                                type="password"
                                value={mdp.actuel}
                                onChange={e => setMdp({ ...mdp, actuel: e.target.value })}
                                placeholder="••••••••"
                                style={{ borderRadius: '8px' }}
                                required
                              />
                            </Form.Group>
                            <Form.Group className="mb-3">
                              <Form.Label className="text-muted" style={{ fontSize: '13px' }}>Nouveau mot de passe</Form.Label>
                              <Form.Control
                                type="password"
                                value={mdp.nouveau}
                                onChange={e => setMdp({ ...mdp, nouveau: e.target.value })}
                                placeholder="••••••••"
                                style={{ borderRadius: '8px' }}
                                required
                                minLength={8}
                              />
                            </Form.Group>
                            <Form.Group className="mb-4">
                              <Form.Label className="text-muted" style={{ fontSize: '13px' }}>Confirmer le nouveau mot de passe</Form.Label>
                              <Form.Control
                                type="password"
                                value={mdp.confirmation}
                                onChange={e => setMdp({ ...mdp, confirmation: e.target.value })}
                                placeholder="••••••••"
                                style={{ borderRadius: '8px' }}
                                required
                                minLength={8}
                              />
                            </Form.Group>
                            <Button type="submit" style={{ backgroundColor: '#0B6E4F', border: 'none' }} disabled={saving}>
                              {saving ? <Spinner animation="border" size="sm" /> : <><FaLock className="me-2" />Mettre à jour le mot de passe</>}
                            </Button>
                          </Form>
                        </Col>
                        <Col md={5}>
                          <Card className="border-0" style={{ backgroundColor: '#f0f7f4' }}>
                            <Card.Body>
                              <h6 className="fw-bold mb-3">Règles de sécurité</h6>
                              {[
                                'Minimum 8 caractères',
                                'Au moins une lettre majuscule',
                                'Au moins un chiffre',
                                'Au moins un caractère spécial',
                              ].map((r, i) => (
                                <div key={i} className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '13px' }}>
                                  <FaCheck style={{ color: '#0B6E4F' }} size={12} />
                                  {r}
                                </div>
                              ))}
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>
                    </Tab.Pane>
                  </Tab.Content>
                </Card.Body>
              </Card>
            </Tab.Container>
          </Col>
        </Row>
      </Container>

      <Footer />
    </div>
  );
}

export default Profil;
