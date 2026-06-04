import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, Spinner, Tab, Tabs } from 'react-bootstrap';
import { FaCheck, FaTimes, FaBan, FaStore, FaClock, FaCheckCircle, FaTimesCircle, FaPause } from 'react-icons/fa';
import api from '../../services/api';

function GestionPharmacies() {
  const [pharmacies, setPharmacies] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pharmaciesRes, statsRes] = await Promise.all([
        api.get('/pharmacies/profiles/all_pharmacies/'),
        api.get('/pharmacies/profiles/stats/')
      ]);
      setPharmacies(pharmaciesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Erreur chargement:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (pharmacy, action) => {
    setSelectedPharmacy(pharmacy);
    setModalAction(action);
    setRejectReason('');
    setShowModal(true);
  };

  const handleAction = async () => {
    if (!selectedPharmacy) return;
    
    setActionLoading(true);
    setError('');
    
    try {
      if (modalAction === 'approve') {
        await api.post(`/pharmacies/profiles/${selectedPharmacy.id}/approve/`);
        setSuccess(`Pharmacie "${selectedPharmacy.nom_pharmacie}" approuvée avec succès !`);
      } else if (modalAction === 'reject') {
        await api.post(`/pharmacies/profiles/${selectedPharmacy.id}/reject/`, {
          reason: rejectReason
        });
        setSuccess(`Pharmacie "${selectedPharmacy.nom_pharmacie}" rejetée.`);
      } else if (modalAction === 'suspend') {
        await api.post(`/pharmacies/profiles/${selectedPharmacy.id}/suspend/`, {
          reason: rejectReason
        });
        setSuccess(`Pharmacie "${selectedPharmacy.nom_pharmacie}" suspendue.`);
      }
      
      setShowModal(false);
      loadData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Erreur action:', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'action');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING': { bg: 'warning', icon: <FaClock />, text: 'En attente' },
      'APPROVED': { bg: 'success', icon: <FaCheckCircle />, text: 'Approuvée' },
      'REJECTED': { bg: 'danger', icon: <FaTimesCircle />, text: 'Rejetée' },
      'SUSPENDED': { bg: 'secondary', icon: <FaPause />, text: 'Suspendue' }
    };
    const badge = badges[status] || badges['PENDING'];
    return (
      <Badge bg={badge.bg} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
        {badge.icon} {badge.text}
      </Badge>
    );
  };

  const filteredPharmacies = pharmacies.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return p.approval_status === 'PENDING';
    if (activeTab === 'approved') return p.approval_status === 'APPROVED';
    if (activeTab === 'rejected') return p.approval_status === 'REJECTED';
    if (activeTab === 'suspended') return p.approval_status === 'SUSPENDED';
    return true;
  });

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '30px 0' }}>
      <Container>
        {/* Header */}
        <div className="mb-4">
          <h2 className="fw-bold" style={{ color: '#1B4965' }}>
            <FaStore className="me-2" />
            Gestion des Pharmacies
          </h2>
          <p className="text-muted">Approuver, rejeter ou suspendre les pharmacies</p>
        </div>

        {/* Alerts */}
        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

        {/* Stats Cards */}
        <Row className="mb-4">
          <Col md={3} sm={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="text-center">
                <h3 className="fw-bold" style={{ color: '#1B4965' }}>{stats.total || 0}</h3>
                <small className="text-muted">Total</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} sm={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #ffc107' }}>
              <Card.Body className="text-center">
                <h3 className="fw-bold text-warning">{stats.pending || 0}</h3>
                <small className="text-muted">En attente</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} sm={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #28a745' }}>
              <Card.Body className="text-center">
                <h3 className="fw-bold text-success">{stats.approved || 0}</h3>
                <small className="text-muted">Approuvées</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} sm={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #dc3545' }}>
              <Card.Body className="text-center">
                <h3 className="fw-bold text-danger">{stats.rejected || 0}</h3>
                <small className="text-muted">Rejetées</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Tabs & Table */}
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
              <Tab eventKey="pending" title={`En attente (${stats.pending || 0})`} />
              <Tab eventKey="approved" title={`Approuvées (${stats.approved || 0})`} />
              <Tab eventKey="rejected" title={`Rejetées (${stats.rejected || 0})`} />
              <Tab eventKey="all" title="Toutes" />
            </Tabs>

            {filteredPharmacies.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FaStore size={50} className="mb-3 opacity-50" />
                <p>Aucune pharmacie dans cette catégorie</p>
              </div>
            ) : (
              <Table responsive hover>
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th>Pharmacie</th>
                    <th>Propriétaire</th>
                    <th>Ville</th>
                    <th>N° Autorisation</th>
                    <th>Statut</th>
                    <th>Date inscription</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPharmacies.map(pharmacy => (
                    <tr key={pharmacy.id}>
                      <td>
                        <strong>{pharmacy.nom_pharmacie}</strong>
                        <br />
                        <small className="text-muted">{pharmacy.telephone}</small>
                      </td>
                      <td>
                        {pharmacy.user?.first_name} {pharmacy.user?.last_name}
                        <br />
                        <small className="text-muted">{pharmacy.user?.email}</small>
                      </td>
                      <td>{pharmacy.ville}</td>
                      <td><code>{pharmacy.numero_autorisation}</code></td>
                      <td>{getStatusBadge(pharmacy.approval_status)}</td>
                      <td>
                        <small>
                          {new Date(pharmacy.created_at).toLocaleDateString('fr-FR')}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          {pharmacy.approval_status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => openModal(pharmacy, 'approve')}
                                title="Approuver"
                              >
                                <FaCheck />
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => openModal(pharmacy, 'reject')}
                                title="Rejeter"
                              >
                                <FaTimes />
                              </Button>
                            </>
                          )}
                          {pharmacy.approval_status === 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="warning"
                              onClick={() => openModal(pharmacy, 'suspend')}
                              title="Suspendre"
                            >
                              <FaBan />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>

        {/* Modal de confirmation */}
        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              {modalAction === 'approve' && '✅ Approuver la pharmacie'}
              {modalAction === 'reject' && '❌ Rejeter la pharmacie'}
              {modalAction === 'suspend' && '⚠️ Suspendre la pharmacie'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedPharmacy && (
              <>
                <p>
                  <strong>Pharmacie :</strong> {selectedPharmacy.nom_pharmacie}
                </p>
                <p>
                  <strong>Ville :</strong> {selectedPharmacy.ville}
                </p>
                <p>
                  <strong>N° Autorisation :</strong> {selectedPharmacy.numero_autorisation}
                </p>

                {(modalAction === 'reject' || modalAction === 'suspend') && (
                  <Form.Group className="mt-3">
                    <Form.Label>Motif (optionnel)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Indiquez la raison..."
                    />
                  </Form.Group>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button
              variant={modalAction === 'approve' ? 'success' : 'danger'}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Spinner size="sm" />
              ) : (
                <>
                  {modalAction === 'approve' && 'Approuver'}
                  {modalAction === 'reject' && 'Rejeter'}
                  {modalAction === 'suspend' && 'Suspendre'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
}

export default GestionPharmacies;
