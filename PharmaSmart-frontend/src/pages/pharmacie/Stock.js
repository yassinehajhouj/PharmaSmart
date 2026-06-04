import { useState, useEffect } from 'react';
import {
  Container, Table, Badge, Button, Form, Modal,
  Row, Col, Spinner, Alert, Toast, ToastContainer,
} from 'react-bootstrap';
import { FaPlus, FaTrash } from 'react-icons/fa';
import NavbarPharmacie from '../../components/NavbarPharmacie';
import api from '../../services/api';
import authService from '../../services/authService';

// ─── initial form state ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  mode:             'existant',  // 'existant' | 'nouveau'
  medicament:       '',          // existing medication ID
  medicament_name:  '',          // new local medication name
  medicament_prix:  '',          // price for the new local medication
  medicament_image: null,        // File object for new medication image
  quantite:         '',
  prix_vente:       '',
  date_expiration:  '',
};

// ─── component ────────────────────────────────────────────────────────────────

function Stock() {
  const [medicaments, setMedicaments]       = useState([]);
  const [catalogMeds, setCatalogMeds]       = useState([]);  // raw list for the dropdown
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [recherche, setRecherche]           = useState('');
  const [filtreEtat, setFiltreEtat]         = useState('tous');

  // add-stock modal
  const [showAddModal, setShowAddModal]     = useState(false);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [submitting, setSubmitting]         = useState(false);
  const [formError, setFormError]           = useState('');

  // toast
  const [toast, setToast]                   = useState({ show: false, message: '', variant: 'success' });

  // ── data loading ────────────────────────────────────────────────────────────

  const fetchData = async () => {
    if (!authService.isAuthenticated()) {
      window.location.href = '/connexion';
      return;
    }
    try {
      setLoading(true);
      setError('');

      const [medsRes, stockRes] = await Promise.all([
        api.get('/catalog/medicaments/'),
        api.get('/inventory/stocks/'),   // fixed: was /inventory/stock/
      ]);

      const stocks = stockRes.data || [];
      const catalog = medsRes.data || [];
      setCatalogMeds(catalog);

      // Build a lookup so we can enrich stock rows with catalog metadata
      // (category name, catalog price) without a second API call.
      const catalogById = Object.fromEntries(catalog.map(m => [m.id, m]));

      // Table is stock-centric: only show medications this pharmacy actually
      // has in stock. Medications from other pharmacies are never in stockRes.
      const merged = stocks.map(s => {
        const med = catalogById[s.medicament] || {};
        return {
          id:          s.medicament,
          stockId:     s.id,
          nom:         s.medicament_nom,
          categorie:   med.categorie_nom || 'Médicament local',
          prix:        parseFloat(s.prix_vente ?? med.prix ?? 0),
          stock:       s.quantite,
          expiration:  s.date_expiration || '-',
          fournisseur: '-',
        };
      });

      setMedicaments(merged);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── filtering & stats ───────────────────────────────────────────────────────

  const resultats = medicaments.filter(med => {
    const matchRecherche =
      med.nom.toLowerCase().includes(recherche.toLowerCase()) ||
      med.fournisseur.toLowerCase().includes(recherche.toLowerCase());
    const matchFiltre =
      filtreEtat === 'tous' ||
      (filtreEtat === 'rupture' && med.stock === 0) ||
      (filtreEtat === 'faible' && med.stock > 0 && med.stock < 50) ||
      (filtreEtat === 'ok'     && med.stock >= 50);
    return matchRecherche && matchFiltre;
  });

  const stats = {
    total:   medicaments.length,
    ok:      medicaments.filter(m => m.stock >= 50).length,
    faible:  medicaments.filter(m => m.stock > 0 && m.stock < 50).length,
    rupture: medicaments.filter(m => m.stock === 0).length,
  };

  // ── add stock ───────────────────────────────────────────────────────────────

  const handleFormChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = e => {
    setForm(prev => ({ ...prev, medicament_image: e.target.files[0] || null }));
  };

  // Handles every DRF error shape:
  //   ["message"]                      → array (our ValidationError)
  //   {"detail": "..."}               → simplejwt / permission errors
  //   {"non_field_errors": ["..."]}   → non-field validation errors
  //   {"field": ["..."]}              → field-level validation errors
  const extractError = (err) => {
    const data = err.response?.data;
    if (!data)                         return 'Erreur réseau.';
    if (typeof data === 'string')      return data;
    if (Array.isArray(data))           return data[0];
    if (data.detail)                   return data.detail;
    if (data.non_field_errors?.[0])    return data.non_field_errors[0];
    const first = Object.values(data)[0];
    return Array.isArray(first) ? first[0] : String(first);
  };

  const ajouterStock = async e => {
    e.preventDefault();
    setFormError('');

    if (!form.quantite) {
      setFormError('La quantité est obligatoire.');
      return;
    }
    if (form.mode === 'existant' && !form.medicament) {
      setFormError('Sélectionnez un médicament dans la liste.');
      return;
    }
    if (form.mode === 'nouveau' && !form.medicament_name.trim()) {
      setFormError('Saisissez le nom du nouveau médicament.');
      return;
    }
    if (form.mode === 'nouveau' && !form.medicament_image) {
      setFormError('Une image est obligatoire pour un nouveau médicament.');
      return;
    }

    setSubmitting(true);
    try {
      let payload;
      if (form.mode === 'existant') {
        // Existing medication — plain JSON, never sends an image.
        payload = {
          medicament:     parseInt(form.medicament),
          quantite:       parseInt(form.quantite),
          ...(form.prix_vente      && { prix_vente:      parseFloat(form.prix_vente) }),
          ...(form.date_expiration && { date_expiration: form.date_expiration }),
        };
        await api.post('/inventory/stocks/', payload);
      } else {
        // New local medication — must use FormData to send the image file.
        const fd = new FormData();
        fd.append('medicament_name',  form.medicament_name.trim());
        fd.append('quantite',         parseInt(form.quantite));
        fd.append('medicament_image', form.medicament_image);
        if (form.medicament_prix) fd.append('medicament_prix', parseFloat(form.medicament_prix));
        if (form.prix_vente)      fd.append('prix_vente',      parseFloat(form.prix_vente));
        if (form.date_expiration) fd.append('date_expiration', form.date_expiration);
        await api.post('/inventory/stocks/', fd);
      }
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      setToast({ show: true, message: 'Stock ajouté avec succès !', variant: 'success' });
      await fetchData();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // IDs of medications that already have a stock entry → can't be added again
  const alreadyStockedIds = new Set(
    medicaments.filter(m => m.stockId !== null).map(m => m.id)
  );

  // ── delete ──────────────────────────────────────────────────────────────────

  const supprimerMedicament = async id => {
    try {
      await api.delete(`/catalog/medicaments/${id}/`);
      setMedicaments(prev => prev.filter(m => m.id !== id));
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  // ── loading screen ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <NavbarPharmacie />
        <Container className="text-center py-5">
          <Spinner animation="border" />
        </Container>
      </div>
    );
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarPharmacie />

      {/* ── toast ── */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast
          show={toast.show}
          onClose={() => setToast(t => ({ ...t, show: false }))}
          bg={toast.variant}
          autohide
          delay={3500}
        >
          <Toast.Body className="text-white fw-semibold">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>

      <Container className="py-4">

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

        {/* ── header ── */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="mb-0">Gestion du Stock</h2>
          <Button
            onClick={() => { setShowAddModal(true); setForm(EMPTY_FORM); setFormError(''); }}
            style={{ backgroundColor: '#0B6E4F', border: 'none' }}
          >
            <FaPlus className="me-2" />
            Ajouter du stock
          </Button>
        </div>

        {/* ── stats ── */}
        <Row className="mb-3 g-2">
          {[
            { label: 'Total',   value: stats.total,   variant: 'secondary' },
            { label: 'OK',      value: stats.ok,      variant: 'success'   },
            { label: 'Faible',  value: stats.faible,  variant: 'warning'   },
            { label: 'Rupture', value: stats.rupture, variant: 'danger'    },
          ].map(s => (
            <Col key={s.label} xs={6} md={3}>
              <div className="bg-white rounded shadow-sm p-3 text-center">
                <div className="fw-bold fs-4">{s.value}</div>
                <Badge bg={s.variant}>{s.label}</Badge>
              </div>
            </Col>
          ))}
        </Row>

        {/* ── filters ── */}
        <Row className="mb-3 g-2">
          <Col md={8}>
            <Form.Control
              placeholder="Rechercher par nom ou fournisseur..."
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
            />
          </Col>
          <Col md={4}>
            <Form.Select value={filtreEtat} onChange={e => setFiltreEtat(e.target.value)}>
              <option value="tous">Tous les états</option>
              <option value="ok">OK (≥ 50)</option>
              <option value="faible">Faible (1–49)</option>
              <option value="rupture">Rupture (0)</option>
            </Form.Select>
          </Col>
        </Row>

        {/* ── table ── */}
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Catégorie</th>
              <th>Fournisseur</th>
              <th>Prix</th>
              <th>Stock</th>
              <th>Expiration</th>
              <th>État</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {resultats.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  Aucun médicament trouvé.
                </td>
              </tr>
            ) : resultats.map(med => (
              <tr key={med.id}>
                <td>{med.nom}</td>
                <td>{med.categorie}</td>
                <td>{med.fournisseur}</td>
                <td>{med.prix.toFixed(2)} MAD</td>
                <td>{med.stock}</td>
                <td>{med.expiration}</td>
                <td>
                  <Badge bg={med.stock === 0 ? 'danger' : med.stock < 50 ? 'warning' : 'success'}>
                    {med.stock === 0 ? 'Rupture' : med.stock < 50 ? 'Faible' : 'OK'}
                  </Badge>
                </td>
                <td>
                  <Button size="sm" variant="outline-danger" onClick={() => supprimerMedicament(med.id)}>
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

      </Container>

      {/* ── add stock modal ── */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Ajouter du stock</Modal.Title>
        </Modal.Header>

        <Form onSubmit={ajouterStock}>
          <Modal.Body>

            {formError && (
              <Alert variant="danger" className="py-2" style={{ fontSize: '14px' }}>
                {formError}
              </Alert>
            )}

            {/* Mode toggle */}
            <div className="d-flex mb-3 rounded overflow-hidden" style={{ border: '1.5px solid #dee2e6' }}>
              {[
                { value: 'existant', label: 'Médicament existant' },
                { value: 'nouveau',  label: '+ Nouveau médicament' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, mode: opt.value, medicament: '', medicament_name: '', medicament_image: null }))}
                  className="flex-fill py-2 border-0 fw-semibold"
                  style={{
                    fontSize: '13px',
                    backgroundColor: form.mode === opt.value ? '#0B6E4F' : '#f8f9fa',
                    color:           form.mode === opt.value ? '#fff'    : '#555',
                    transition: 'background 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Existing medication dropdown */}
            {form.mode === 'existant' && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Médicament <span className="text-danger">*</span></Form.Label>
                <Form.Select name="medicament" value={form.medicament} onChange={handleFormChange}>
                  <option value="">-- Sélectionner --</option>
                  {catalogMeds.map(m => {
                    const inStock = alreadyStockedIds.has(m.id);
                    return (
                      <option key={m.id} value={m.id} disabled={inStock}>
                        {m.nom}{inStock ? ' (déjà en stock)' : ''}
                      </option>
                    );
                  })}
                </Form.Select>
              </Form.Group>
            )}

            {/* New local medication fields */}
            {form.mode === 'nouveau' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Nom du médicament <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="medicament_name"
                    placeholder="Ex : Ibuprofène 400mg"
                    value={form.medicament_name}
                    onChange={handleFormChange}
                    autoFocus
                  />
                  <Form.Text className="text-muted" style={{ fontSize: '12px' }}>
                    Un médicament local sera créé et associé uniquement à votre pharmacie.
                  </Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Prix catalogue <span className="text-muted fw-normal">(optionnel — MAD)</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="medicament_prix"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.medicament_prix}
                    onChange={handleFormChange}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Image du médicament <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <Form.Text className="text-muted" style={{ fontSize: '12px' }}>
                    JPG, PNG ou WebP. Cette image sera associée au médicament créé.
                  </Form.Text>
                  {form.medicament_image && (
                    <div className="mt-2 d-flex align-items-center gap-2">
                      <img
                        src={URL.createObjectURL(form.medicament_image)}
                        alt="Aperçu"
                        style={{ height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #dee2e6' }}
                      />
                      <span style={{ fontSize: '12px', color: '#555' }}>{form.medicament_image.name}</span>
                    </div>
                  )}
                </Form.Group>
              </>
            )}

            {/* Quantité */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Quantité <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="number"
                name="quantite"
                min="0"
                placeholder="Ex : 100"
                value={form.quantite}
                onChange={handleFormChange}
                required
              />
            </Form.Group>

            {/* Prix de vente */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                Prix de vente <span className="text-muted" style={{ fontWeight: 400 }}>(optionnel — MAD)</span>
              </Form.Label>
              <Form.Control
                type="number"
                name="prix_vente"
                min="0"
                step="0.01"
                placeholder="Laissez vide pour utiliser le prix catalogue"
                value={form.prix_vente}
                onChange={handleFormChange}
              />
            </Form.Group>

            {/* Date d'expiration */}
            <Form.Group className="mb-1">
              <Form.Label className="fw-semibold">
                Date d'expiration <span className="text-muted" style={{ fontWeight: 400 }}>(optionnel)</span>
              </Form.Label>
              <Form.Control
                type="date"
                name="date_expiration"
                value={form.date_expiration}
                onChange={handleFormChange}
              />
            </Form.Group>

          </Modal.Body>

          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowAddModal(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: '#0B6E4F', border: 'none' }}
            >
              {submitting ? <><Spinner size="sm" className="me-2" />Enregistrement...</> : 'Ajouter'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </div>
  );
}

export default Stock;
