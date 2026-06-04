import { useState } from 'react';
import { Container, Row, Col, Card, Badge, Button, Modal, Form } from 'react-bootstrap';
import { FaTag, FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaPercent, FaGift } from 'react-icons/fa';
import NavbarPharmacie from '../../components/NavbarPharmacie';

function Promotions() {
  const [showModal, setShowModal] = useState(false);
  const [vue, setVue] = useState('actives');

  const [promotions, setPromotions] = useState([
    {
      id: 1,
      nom: 'Soldes Vitamines Mars',
      type: 'pourcentage',
      valeur: 20,
      code: 'VITAMINE20',
      medicaments: ['Vitamine C 1000mg', 'Vitamine D 1000UI'],
      debut: '01/03/2026',
      fin: '31/03/2026',
      active: true,
      utilisations: 45,
    },
    {
      id: 2,
      nom: 'Offre Pack Grippe',
      type: 'montant',
      valeur: 30,
      code: 'GRIPPE30',
      medicaments: ['Doliprane 500mg', 'Ibuprofène 400mg', 'Paracétamol Sirop'],
      debut: '15/02/2026',
      fin: '15/03/2026',
      active: true,
      utilisations: 23,
    },
    {
      id: 3,
      nom: 'Fidélité Client Ancien',
      type: 'pourcentage',
      valeur: 10,
      code: 'FIDEL10',
      medicaments: ['Tous les médicaments'],
      debut: '01/01/2026',
      fin: '31/12/2026',
      active: true,
      utilisations: 128,
    },
    {
      id: 4,
      nom: 'Promo Janvier (terminée)',
      type: 'pourcentage',
      valeur: 15,
      code: 'JAN15',
      medicaments: ['Amoxicilline 1g', 'Oméprazole 20mg'],
      debut: '01/01/2026',
      fin: '31/01/2026',
      active: false,
      utilisations: 67,
    },
  ]);

  const [nouvellePromo, setNouvellePromo] = useState({
    nom: '', type: 'pourcentage', valeur: '', code: '', debut: '', fin: '', description: '',
  });

  const toggleActive = (id) => {
    setPromotions(promotions.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const supprimer = (id) => {
    setPromotions(promotions.filter(p => p.id !== id));
  };

  const ajouter = () => {
    if (!nouvellePromo.nom) return;
    setPromotions([...promotions, {
      id: promotions.length + 1,
      ...nouvellePromo,
      valeur: parseFloat(nouvellePromo.valeur),
      medicaments: ['Tous les médicaments'],
      active: true,
      utilisations: 0,
    }]);
    setNouvellePromo({ nom: '', type: 'pourcentage', valeur: '', code: '', debut: '', fin: '', description: '' });
    setShowModal(false);
  };

  const filtrees = vue === 'actives'
    ? promotions.filter(p => p.active)
    : vue === 'inactives'
      ? promotions.filter(p => !p.active)
      : promotions;

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarPharmacie />

      <Container className="py-4">
        {/* En-tête */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">
              <FaTag className="me-2" style={{ color: '#E74C3C' }} />
              Promotions & Remises
            </h2>
            <p className="text-muted mb-0">{promotions.filter(p => p.active).length} promotion(s) active(s)</p>
          </div>
          <Button
            style={{ backgroundColor: '#0B6E4F', border: 'none' }}
            onClick={() => setShowModal(true)}
          >
            <FaPlus className="me-2" /> Nouvelle promotion
          </Button>
        </div>

        {/* Stats */}
        <Row className="g-3 mb-4">
          {[
            { label: 'Promotions actives', valeur: promotions.filter(p => p.active).length, couleur: '#0B6E4F', icon: <FaTag /> },
            { label: 'Total utilisations', valeur: promotions.reduce((s, p) => s + p.utilisations, 0), couleur: '#1B4965', icon: <FaGift /> },
            { label: 'Réduction moy.', valeur: `${Math.round(promotions.filter(p => p.type === 'pourcentage').reduce((s, p) => s + p.valeur, 0) / promotions.filter(p => p.type === 'pourcentage').length)}%`, couleur: '#E74C3C', icon: <FaPercent /> },
            { label: 'Codes actifs', valeur: promotions.filter(p => p.active).length, couleur: '#F39C12', icon: <FaTag /> },
          ].map((stat, i) => (
            <Col md={3} key={i}>
              <Card className="border-0 shadow-sm">
                <Card.Body className="d-flex align-items-center gap-3 py-3">
                  <div className="rounded-circle p-2" style={{ backgroundColor: stat.couleur + '15', color: stat.couleur }}>
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>{stat.label}</div>
                    <div className="fw-bold fs-5">{stat.valeur}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Filtres */}
        <div className="d-flex gap-2 mb-3">
          {[
            { key: 'toutes', label: `Toutes (${promotions.length})` },
            { key: 'actives', label: `Actives (${promotions.filter(p => p.active).length})` },
            { key: 'inactives', label: `Terminées (${promotions.filter(p => !p.active).length})` },
          ].map(f => (
            <Button
              key={f.key}
              size="sm"
              onClick={() => setVue(f.key)}
              style={vue === f.key
                ? { backgroundColor: '#0B6E4F', border: 'none' }
                : {}}
              variant={vue === f.key ? 'dark' : 'outline-secondary'}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Liste des promotions */}
        <Row className="g-3">
          {filtrees.map(promo => (
            <Col md={6} key={promo.id}>
              <Card className="border-0 shadow-sm h-100"
                style={{ borderLeft: `4px solid ${promo.active ? '#0B6E4F' : '#aaa'}` }}>
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="fw-bold mb-1">{promo.nom}</h6>
                      <div className="d-flex gap-2 align-items-center">
                        <Badge bg={promo.active ? 'success' : 'secondary'}>
                          {promo.active ? 'Active' : 'Terminée'}
                        </Badge>
                        <code style={{
                          backgroundColor: '#f0f0f0',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: '#0B6E4F',
                        }}>
                          {promo.code}
                        </code>
                      </div>
                    </div>
                    {/* Valeur de la promo */}
                    <div className="text-center">
                      <div style={{
                        fontSize: '28px', fontWeight: 'bold',
                        color: promo.active ? '#E74C3C' : '#aaa',
                      }}>
                        {promo.type === 'pourcentage' ? `-${promo.valeur}%` : `-${promo.valeur} MAD`}
                      </div>
                    </div>
                  </div>

                  {/* Médicaments concernés */}
                  <div className="mb-3">
                    <div className="text-muted mb-1" style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                      Médicaments concernés
                    </div>
                    <div className="d-flex flex-wrap gap-1">
                      {promo.medicaments.map((m, i) => (
                        <Badge key={i} bg="light" text="dark" style={{ fontSize: '11px' }}>{m}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {promo.debut} → {promo.fin}
                      <span className="ms-2">• {promo.utilisations} utilisations</span>
                    </div>
                    <div className="d-flex gap-1">
                      <Button
                        variant={promo.active ? 'outline-danger' : 'outline-success'}
                        size="sm"
                        onClick={() => toggleActive(promo.id)}
                        title={promo.active ? 'Désactiver' : 'Activer'}
                      >
                        {promo.active ? <FaToggleOn size={14} /> : <FaToggleOff size={14} />}
                      </Button>
                      <Button variant="outline-secondary" size="sm">
                        <FaEdit size={11} />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => supprimer(promo.id)}>
                        <FaTrash size={11} />
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Modal nouvelle promotion */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title><FaTag className="me-2" /> Nouvelle promotion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label style={{ fontSize: '13px' }}>Nom de la promotion *</Form.Label>
                <Form.Control
                  value={nouvellePromo.nom}
                  onChange={e => setNouvellePromo({ ...nouvellePromo, nom: e.target.value })}
                  placeholder="Ex : Promo Vitamines Printemps"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '13px' }}>Type de remise</Form.Label>
                <Form.Select
                  value={nouvellePromo.type}
                  onChange={e => setNouvellePromo({ ...nouvellePromo, type: e.target.value })}
                  style={{ borderRadius: '8px' }}
                >
                  <option value="pourcentage">Pourcentage (%)</option>
                  <option value="montant">Montant fixe (MAD)</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '13px' }}>
                  Valeur de la remise {nouvellePromo.type === 'pourcentage' ? '(%)' : '(MAD)'}
                </Form.Label>
                <Form.Control
                  type="number"
                  value={nouvellePromo.valeur}
                  onChange={e => setNouvellePromo({ ...nouvellePromo, valeur: e.target.value })}
                  placeholder={nouvellePromo.type === 'pourcentage' ? '20' : '30'}
                  max={nouvellePromo.type === 'pourcentage' ? 100 : undefined}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '13px' }}>Code promo</Form.Label>
                <Form.Control
                  value={nouvellePromo.code}
                  onChange={e => setNouvellePromo({ ...nouvellePromo, code: e.target.value.toUpperCase() })}
                  placeholder="Ex : PROMO20"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label style={{ fontSize: '13px' }}>Date début</Form.Label>
                <Form.Control
                  type="date"
                  value={nouvellePromo.debut}
                  onChange={e => setNouvellePromo({ ...nouvellePromo, debut: e.target.value })}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label style={{ fontSize: '13px' }}>Date fin</Form.Label>
                <Form.Control
                  type="date"
                  value={nouvellePromo.fin}
                  onChange={e => setNouvellePromo({ ...nouvellePromo, fin: e.target.value })}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
          <Button
            style={{ backgroundColor: '#0B6E4F', border: 'none' }}
            onClick={ajouter}
            disabled={!nouvellePromo.nom || !nouvellePromo.valeur}
          >
            <FaPlus className="me-1" /> Créer la promotion
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Promotions;
