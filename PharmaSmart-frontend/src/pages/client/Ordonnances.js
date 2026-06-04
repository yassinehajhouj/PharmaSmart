import { useState } from 'react';
import { Container, Row, Col, Card, Badge, Button, Modal, Form, Alert } from 'react-bootstrap';
import { FaFileAlt, FaUpload, FaEye, FaTrash, FaCheckCircle, FaClock, FaTimesCircle, FaPlus } from 'react-icons/fa';
import NavbarClient from '../../components/NavbarClient';
import Footer from '../../components/Footer';

function Ordonnances() {
  const [showModal, setShowModal] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fichierSelectionne, setFichierSelectionne] = useState(null);
  const [medecin, setMedecin] = useState('');
  const [note, setNote] = useState('');

  const [ordonnances, setOrdonnances] = useState([
    {
      id: 'ORD-001',
      date: '20/02/2026',
      medecin: 'Dr. Rachid Alaoui',
      statut: 'validee',
      medicaments: ['Amoxicilline 1g — 2x/jour pendant 7 jours', 'Ibuprofène 400mg — 3x/jour si douleur'],
      note: 'Infection respiratoire',
    },
    {
      id: 'ORD-002',
      date: '10/02/2026',
      medecin: 'Dr. Nadia Tahiri',
      statut: 'en_attente',
      medicaments: ['Oméprazole 20mg — 1x/jour le matin', 'Smecta 3g — 3x/jour'],
      note: 'Gastrite',
    },
    {
      id: 'ORD-003',
      date: '05/01/2026',
      medecin: 'Dr. Karim Bensalah',
      statut: 'expiree',
      medicaments: ['Cétirizine 10mg — 1x/jour', 'Loratadine 10mg — 1x/jour si besoin'],
      note: 'Rhinite allergique saisonnière',
    },
  ]);

  const getStatutInfo = (s) => {
    const map = {
      validee: { bg: 'success', icon: <FaCheckCircle />, text: 'Validée' },
      en_attente: { bg: 'warning', icon: <FaClock />, text: 'En attente' },
      refusee: { bg: 'danger', icon: <FaTimesCircle />, text: 'Refusée' },
      expiree: { bg: 'secondary', icon: <FaTimesCircle />, text: 'Expirée' },
    };
    return map[s] || map.en_attente;
  };

  const soumettre = () => {
    if (!fichierSelectionne) return;
    const nouvelle = {
      id: `ORD-00${ordonnances.length + 1}`,
      date: new Date().toLocaleDateString('fr-FR'),
      medecin: medecin || 'Non renseigné',
      statut: 'en_attente',
      medicaments: ['En attente de vérification par le pharmacien...'],
      note: note || '',
    };
    setOrdonnances([nouvelle, ...ordonnances]);
    setShowModal(false);
    setFichierSelectionne(null);
    setMedecin('');
    setNote('');
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 4000);
  };

  const supprimer = (id) => {
    setOrdonnances(ordonnances.filter(o => o.id !== id));
  };

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarClient />

      <Container className="py-4">
        {uploadSuccess && (
          <Alert variant="success" className="mb-3">
            <FaCheckCircle className="me-2" />
            Votre ordonnance a été soumise. Le pharmacien va la vérifier sous peu.
          </Alert>
        )}

        {/* En-tête */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">
              <FaFileAlt className="me-2" style={{ color: '#0B6E4F' }} />
              Mes Ordonnances
            </h2>
            <p className="text-muted mb-0">{ordonnances.length} ordonnance(s) enregistrée(s)</p>
          </div>
          <Button
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: '#0B6E4F', border: 'none' }}
          >
            <FaPlus className="me-2" />
            Soumettre une ordonnance
          </Button>
        </div>

        {/* Infos importantes */}
        <Card className="border-0 mb-4" style={{ backgroundColor: '#e8f4fd', borderLeft: '4px solid #1B4965' }}>
          <Card.Body className="py-2">
            <p className="mb-0" style={{ fontSize: '13px', color: '#1B4965' }}>
              ℹ️ Les médicaments sous ordonnance nécessitent une validation par notre pharmacien. Soumettez une photo ou scan de votre ordonnance médicale.
            </p>
          </Card.Body>
        </Card>

        {/* Liste des ordonnances */}
        {ordonnances.length === 0 ? (
          <Card className="border-0 shadow-sm text-center py-5">
            <Card.Body>
              <FaFileAlt size={60} style={{ color: '#dee2e6', marginBottom: '20px' }} />
              <h5 className="fw-bold text-muted">Aucune ordonnance</h5>
              <p className="text-muted">Soumettez votre première ordonnance pour commander des médicaments sous prescription.</p>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-3">
            {ordonnances.map(ord => {
              const statut = getStatutInfo(ord.statut);
              return (
                <Col md={12} key={ord.id}>
                  <Card className="border-0 shadow-sm">
                    <Card.Body>
                      <Row className="align-items-start">
                        {/* Icône et ID */}
                        <Col md={1} className="text-center">
                          <div className="rounded-circle d-flex align-items-center justify-content-center mx-auto"
                            style={{ width: '50px', height: '50px', backgroundColor: '#0B6E4F12' }}>
                            <FaFileAlt size={22} style={{ color: '#0B6E4F' }} />
                          </div>
                        </Col>

                        {/* Infos principales */}
                        <Col md={7}>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="fw-bold">{ord.id}</span>
                            <Badge bg={statut.bg} className="d-flex align-items-center gap-1">
                              {statut.icon} {statut.text}
                            </Badge>
                          </div>
                          <div className="text-muted mb-2" style={{ fontSize: '13px' }}>
                            {ord.date} — {ord.medecin}
                            {ord.note && <span className="ms-2">| {ord.note}</span>}
                          </div>
                          <div>
                            {ord.medicaments.map((m, i) => (
                              <div key={i} className="d-flex align-items-center gap-2 mb-1">
                                <span style={{ fontSize: '12px', color: '#666' }}>•</span>
                                <span style={{ fontSize: '13px' }}>{m}</span>
                              </div>
                            ))}
                          </div>
                        </Col>

                        {/* Actions */}
                        <Col md={4} className="text-end d-flex flex-column gap-2 align-items-end">
                          {ord.statut === 'validee' && (
                            <Button
                              size="sm"
                              style={{ backgroundColor: '#0B6E4F', border: 'none', fontSize: '13px' }}
                            >
                              <FaFileAlt className="me-1" /> Commander
                            </Button>
                          )}
                          <Button size="sm" variant="outline-secondary" style={{ fontSize: '13px' }}>
                            <FaEye className="me-1" /> Voir l'image
                          </Button>
                          {ord.statut !== 'validee' && (
                            <Button
                              size="sm"
                              variant="outline-danger"
                              style={{ fontSize: '13px' }}
                              onClick={() => supprimer(ord.id)}
                            >
                              <FaTrash className="me-1" /> Supprimer
                            </Button>
                          )}
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Container>

      {/* Modal upload */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUpload className="me-2" style={{ color: '#0B6E4F' }} />
            Soumettre une ordonnance
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Zone d'upload */}
            <div
              className="text-center p-5 rounded mb-3"
              style={{
                border: '2px dashed #0B6E4F',
                backgroundColor: '#f0f7f4',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <input
                id="fileInput"
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={e => setFichierSelectionne(e.target.files[0])}
              />
              {fichierSelectionne ? (
                <div>
                  <FaCheckCircle size={40} style={{ color: '#0B6E4F', marginBottom: '10px' }} />
                  <p className="fw-bold mb-0" style={{ color: '#0B6E4F' }}>{fichierSelectionne.name}</p>
                  <p className="text-muted" style={{ fontSize: '12px' }}>
                    {(fichierSelectionne.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <FaUpload size={40} style={{ color: '#0B6E4F', opacity: 0.5, marginBottom: '10px' }} />
                  <p className="fw-bold mb-1">Cliquez pour choisir un fichier</p>
                  <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                    Formats acceptés : JPG, PNG, PDF — Max 5 MB
                  </p>
                </div>
              )}
            </div>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: '13px' }}>Nom du médecin prescripteur</Form.Label>
              <Form.Control
                placeholder="Ex : Dr. Mohamed Alaoui"
                value={medecin}
                onChange={e => setMedecin(e.target.value)}
                style={{ borderRadius: '8px' }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: '13px' }}>Note (facultatif)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Ex : renouvellement d'ordonnance, urgence..."
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{ borderRadius: '8px' }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
          <Button
            style={{ backgroundColor: '#0B6E4F', border: 'none' }}
            onClick={soumettre}
            disabled={!fichierSelectionne}
          >
            <FaUpload className="me-2" /> Soumettre
          </Button>
        </Modal.Footer>
      </Modal>

      <Footer />
    </div>
  );
}

export default Ordonnances;
