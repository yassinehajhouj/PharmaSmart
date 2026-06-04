import { useState, useEffect, useMemo } from 'react';
import {
  Container, Row, Col, Card, Badge,
  Form, Button, Spinner, Alert,
  Toast, ToastContainer,
} from 'react-bootstrap';
import {
  FaSearch, FaShoppingCart, FaThLarge,
  FaList, FaCheckCircle, FaTimes,
  FaMapMarkerAlt, FaStar, FaClinicMedical,
  FaRoute,
} from 'react-icons/fa';
import NavbarClient from '../../components/NavbarClient';
import Footer from '../../components/Footer';
import { MedicineSplitCard, MedicineThumbnail, getCategoryColor } from '../../utils/medicineVisuals';
import catalogService from '../../services/catalogService';
import orderService from '../../services/orderService';

// ─── constantes ───────────────────────────────────────────────────────────────

const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_MIN_CHARS = 2;
const BACKEND_URL = 'http://127.0.0.1:8000';

const toAbsoluteUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
};

// ─── composant ────────────────────────────────────────────────────────────────

function Catalogue() {
  // catalogue
  const [medicaments, setMedicaments] = useState([]);
  const [categories, setCategories] = useState(['Tous']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // filtres
  const [recherche, setRecherche] = useState('');
  const [categorieActive, setCategorieActive] = useState('Tous');
  const [vue, setVue] = useState('grille');

  // recommend mode (search active)
  const [recommendResults, setRecommendResults] = useState(null);
  const [loadingRecommend, setLoadingRecommend] = useState(false);
  const [recommendError, setRecommendError] = useState('');

  // géolocalisation
  const [location, setLocation] = useState({ lat: null, lng: null, status: 'idle' });

  // "trouver près de moi"
  const [loadingProche, setLoadingProche] = useState(false);

  // panier
  const [addingToCart, setAddingToCart] = useState(null);
  const [addingPharmacy, setAddingPharmacy] = useState(null);
  const [addingPharmacyMedId, setAddingPharmacyMedId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  const isAuthenticated = () => !!localStorage.getItem('access_token');

  // ── géolocalisation au montage ────────────────────────────────────────────

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(l => ({ ...l, status: 'denied' }));
      return;
    }
    setLocation(l => ({ ...l, status: 'loading' }));
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        status: 'granted',
      }),
      () => setLocation({ lat: null, lng: null, status: 'denied' }),
      { timeout: 8000, maximumAge: 300_000 },
    );
  }, []);

  // ── chargement initial ────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [cats, meds] = await Promise.all([
          catalogService.getCategories(),
          catalogService.getMedicaments(),
        ]);

        setCategories(['Tous', ...cats.map(c => c.nom)]);

        setMedicaments(meds.map(m => ({
          id: m.id,
          nom: m.nom,
          categorie: m.categorie_nom || 'Autre',
          prix: parseFloat(m.prix),
          description: m.description || '',
          ordonnance: m.ordonnance_requise,
          dosage: m.dosage || '',
          forme: m.forme || '',
          image: toAbsoluteUrl(m.image),
          pharmaciesDisponibles: (m.pharmacies_disponibles || []).map(p => ({
            id: p.id,
            nomPharmacie: p.nom_pharmacie,
            ville: p.ville,
            stock: p.stock,
            prix: parseFloat(p.prix),
          })),
        })));
      } catch {
        setError('Impossible de charger le catalogue. Vérifiez votre connexion.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── recommend debounced ───────────────────────────────────────────────────

  useEffect(() => {
    const q = recherche.trim();

    if (q.length < SEARCH_MIN_CHARS) {
      setRecommendResults(null);
      setRecommendError('');
      setLoadingRecommend(false);
      return;
    }

    setLoadingRecommend(true);

    const timer = setTimeout(async () => {
      try {
        const data = await catalogService.searchRecommended(q, {
          lat: location.lat,
          lng: location.lng,
        });
        setRecommendResults(data);
        setRecommendError('');
      } catch (err) {
        if (err.response?.status === 404) {
          setRecommendResults({ medicament: q, results: [] });
          setRecommendError('');
        } else {
          setRecommendError('Erreur lors de la recherche. Vérifiez votre connexion.');
          setRecommendResults(null);
        }
      } finally {
        setLoadingRecommend(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [recherche, location]);

  // ── trouver près de moi ───────────────────────────────────────────────────

  const _fetchProximity = async (lat, lng) => {
    setLoadingProche(true);
    try {
      const data = await catalogService.getPharmaciesProches(recherche.trim(), lat, lng);
      setRecommendResults(data);
      setRecommendError('');

      const first = data?.results?.[0];
      if (first) {
        const mapsUrl = (first.latitude != null && first.longitude != null)
          ? `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${first.latitude},${first.longitude}&travelmode=driving`
          : `https://www.google.com/maps/search/${encodeURIComponent(first.pharmacie + ' ' + first.ville)}`;
        window.open(mapsUrl, '_blank');
      }
    } catch {
      setToast({ show: true, message: 'Erreur lors de la recherche de proximité', variant: 'danger' });
    } finally {
      setLoadingProche(false);
    }
  };

  const handleTrouverProcheDeNous = () => {
    if (!isSearchMode) return;
    if (location.status === 'granted' && location.lat != null) {
      _fetchProximity(location.lat, location.lng);
      return;
    }
    if (!navigator.geolocation) {
      setToast({ show: true, message: 'Géolocalisation non supportée par votre navigateur', variant: 'danger' });
      return;
    }
    setLoadingProche(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng, status: 'granted' });
        _fetchProximity(lat, lng);
      },
      () => {
        setLoadingProche(false);
        setToast({ show: true, message: 'Accès à la localisation refusé par le navigateur', variant: 'danger' });
      },
      { timeout: 8000 },
    );
  };

  // ── filtrage local (browse mode) ──────────────────────────────────────────

  const resultats = useMemo(() => {
    const q = recherche.toLowerCase().trim();
    return medicaments.filter(m => {
      const matchSearch = !q
        || m.nom.toLowerCase().includes(q)
        || m.description.toLowerCase().includes(q);
      const matchCat = categorieActive === 'Tous' || m.categorie === categorieActive;
      return matchSearch && matchCat;
    });
  }, [medicaments, recherche, categorieActive]);

  // ── panier ────────────────────────────────────────────────────────────────

  const handleAddToCart = async (med) => {
    if (!isAuthenticated()) {
      const cart = JSON.parse(localStorage.getItem('panier') || '[]');
      const item = cart.find(i => i.id === med.id);
      if (item) item.quantite += 1;
      else cart.push({ ...med, quantite: 1 });
      localStorage.setItem('panier', JSON.stringify(cart));
      setToast({ show: true, message: `${med.nom} ajouté au panier`, variant: 'success' });
      return;
    }

    setAddingToCart(med.id);
    try {
      await orderService.ajouterAuPanier(med.id, 1);
      setToast({ show: true, message: `${med.nom} ajouté au panier`, variant: 'success' });
    } catch {
      setToast({ show: true, message: "Erreur lors de l'ajout au panier", variant: 'danger' });
    } finally {
      setAddingToCart(null);
    }
  };

  // ── order from pharmacy (search mode) ────────────────────────────────────

  const handleOrderFromPharmacy = async (ph) => {
    if (!isAuthenticated()) {
      setToast({ show: true, message: 'Connectez-vous pour commander', variant: 'warning' });
      return;
    }
    setAddingPharmacy(ph.pharmacie_id);
    setAddingPharmacyMedId(ph.medicament_id);
    try {
      await orderService.ajouterAuPanier(ph.medicament_id, 1, ph.stock_id);
      setToast({
        show: true,
        message: `${ph.medicament_nom} ajouté — ${ph.pharmacie}`,
        variant: 'success',
      });
    } catch (err) {
      const msg = err.response?.data?.error || "Erreur lors de l'ajout au panier";
      setToast({ show: true, message: msg, variant: 'danger' });
    } finally {
      setAddingPharmacy(null);
      setAddingPharmacyMedId(null);
    }
  };

  // ── PharmacieResultCard (search mode) ─────────────────────────────────────

  const PharmacieResultCard = ({ ph, medicamentNom, onOrder, isAdding }) => {
    const isBest = ph.is_best_choice;
    const hasRoute = ph.duree_minutes != null;
    return (
      <Col xl={3} lg={4} md={6} className="mb-4">
        <Card
          className="h-100"
          style={{
            borderRadius: '14px',
            overflow: 'hidden',
            border: `2px solid ${isBest ? '#0B6E4F' : '#ececec'}`,
            backgroundColor: isBest ? '#f0faf5' : '#fff',
            boxShadow: isBest
              ? '0 4px 18px rgba(11,110,79,0.13)'
              : '0 1px 5px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
        >
          <div style={{ height: '6px', backgroundColor: isBest ? '#0B6E4F' : '#e8f4f0' }} />

          <Card.Body className="d-flex flex-column p-3">

            {isBest && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                backgroundColor: '#0B6E4F', color: '#fff',
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px',
                textTransform: 'uppercase', padding: '3px 10px',
                borderRadius: '20px', marginBottom: '10px', alignSelf: 'flex-start',
              }}>
                <FaStar size={9} /> Meilleur choix
              </div>
            )}

            <div className="d-flex align-items-start gap-2 mb-2">
              <div style={{
                width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                backgroundColor: isBest ? '#c8e6da' : '#e8f4f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0B6E4F',
              }}>
                <FaClinicMedical size={15} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h6 className="fw-bold mb-0 text-truncate" style={{ color: '#1a1a2e', fontSize: '14px' }}>
                  {ph.pharmacie}
                </h6>
                <div className="d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: '12px', color: '#888' }}>
                  <span><FaMapMarkerAlt size={10} className="me-1" />{ph.ville}</span>
                  {/* badge distance + durée OSRM */}
                  {hasRoute ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '3px',
                      backgroundColor: '#0B6E4F', color: '#fff',
                      fontSize: '10px', fontWeight: 700,
                      padding: '2px 8px', borderRadius: '12px',
                    }}>
                      <FaRoute size={9} />
                      {ph.distance_km} km — {ph.duree_minutes} min
                    </span>
                  ) : ph.distance != null ? (
                    <span style={{ color: '#0B6E4F', fontWeight: 600 }}>
                      📍 {ph.distance} km
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <p className="text-muted mb-2" style={{ fontSize: '12px' }}>
              {medicamentNom}
              {ph.date_expiration && <span className="ms-1">· Exp. {ph.date_expiration}</span>}
            </p>

            {/* horaires si disponibles */}
            {ph.horaires_ouverture && (
              <p style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
                🕐 {ph.horaires_ouverture}
              </p>
            )}

            <div className="mb-3">
              {ph.quantite > 0
                ? ph.quantite < 20
                  ? <Badge bg="warning" text="dark" style={{ fontSize: '10px' }}>Stock limité · {ph.quantite} unités</Badge>
                  : <Badge bg="success" style={{ fontSize: '10px' }}>En stock · {ph.quantite} unités</Badge>
                : <Badge bg="danger" style={{ fontSize: '10px' }}>Rupture de stock</Badge>
              }
            </div>

            <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-auto gap-2">
              <span className="fw-bold" style={{ color: '#0B6E4F', fontSize: '16px', flexShrink: 0 }}>
                {Number(ph.prix).toFixed(2)}{' '}
                <span style={{ fontSize: '11px', fontWeight: 400 }}>MAD</span>
              </span>
              <div className="d-flex gap-1 flex-wrap justify-content-end">
                {ph.itineraire_url && (
                  <a
                    href={ph.itineraire_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '11px', padding: '4px 8px', borderRadius: '8px',
                      border: '1px solid #0B6E4F', color: '#0B6E4F',
                      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px',
                    }}
                  >
                    <FaRoute size={9} /> Itinéraire
                  </a>
                )}
                {isBest ? (
                  <Button
                    size="sm"
                    disabled={isAdding}
                    onClick={() => onOrder(ph)}
                    style={{
                      backgroundColor: '#0B6E4F', border: 'none',
                      borderRadius: '8px', fontSize: '12px',
                    }}
                  >
                    {isAdding ? <Spinner size="sm" /> : <><FaShoppingCart className="me-1" />Commander</>}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline-success"
                    disabled={isAdding}
                    onClick={() => onOrder(ph)}
                    style={{ borderRadius: '8px', fontSize: '12px', borderColor: '#0B6E4F', color: '#0B6E4F' }}
                  >
                    {isAdding ? <Spinner size="sm" /> : 'Choisir'}
                  </Button>
                )}
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    );
  };

  // ── PharmaciesDisponibles (browse mode) ───────────────────────────────────

  const PharmaciesDisponibles = ({ list }) => {
    if (!list || list.length === 0) {
      return (
        <p style={{ fontSize: '11px', color: '#dc3545', margin: '0 0 6px' }}>
          ✖ Non disponible
        </p>
      );
    }
    const affichees = list.slice(0, 2);
    const reste = list.length - affichees.length;
    return (
      <p style={{ fontSize: '11px', color: '#555', margin: '0 0 6px', lineHeight: 1.4 }}>
        <span style={{ color: '#0B6E4F', fontWeight: 700 }}>✔ Disponible dans : </span>
        {affichees.map(p => `${p.nomPharmacie} (${p.ville})`).join(', ')}
        {reste > 0 && (
          <span style={{ color: '#888' }}> +{reste} autre{reste > 1 ? 's' : ''}</span>
        )}
      </p>
    );
  };

  // ── CardGrille (browse mode) ──────────────────────────────────────────────

  const CardGrille = ({ med }) => (
    <Col xl={3} lg={4} md={6} className="mb-4">
      <Card
        className="h-100 border-0 shadow-sm"
        style={{ borderRadius: '14px', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
      >
        <MedicineSplitCard
          nom={med.nom}
          categorie={med.categorie}
          customImage={med.image || undefined}
        />
        <Card.Body className="d-flex flex-column p-3">
          <div className="d-flex flex-wrap gap-1 mb-2">
            <Badge style={{ fontSize: '10px', backgroundColor: getCategoryColor(med.categorie), fontWeight: 500 }}>
              {med.categorie}
            </Badge>
            {med.ordonnance && (
              <Badge bg="warning" text="dark" style={{ fontSize: '10px' }}>Ordonnance</Badge>
            )}
          </div>
          <h6 className="fw-bold mb-1" style={{ fontSize: '14px', color: '#1a1a2e' }}>{med.nom}</h6>
          {(med.dosage || med.forme) && (
            <p className="text-muted mb-1" style={{ fontSize: '11px' }}>
              {[med.dosage, med.forme].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="text-muted mb-2" style={{ fontSize: '12px', flexGrow: 1, lineHeight: 1.5 }}>
            {med.description
              ? med.description.slice(0, 90) + (med.description.length > 90 ? '…' : '')
              : 'Aucune description disponible.'}
          </p>

          <PharmaciesDisponibles list={med.pharmaciesDisponibles} />

          <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-auto">
            <span className="fw-bold" style={{ color: '#0B6E4F', fontSize: '16px' }}>
              {med.prix.toFixed(2)}{' '}
              <span style={{ fontSize: '11px', fontWeight: 400 }}>MAD</span>
            </span>
            <Button
              size="sm"
              onClick={() => handleAddToCart(med)}
              disabled={addingToCart === med.id}
              style={{ backgroundColor: '#0B6E4F', border: 'none', borderRadius: '8px', fontSize: '12px' }}
            >
              {addingToCart === med.id
                ? <Spinner size="sm" />
                : <><FaShoppingCart className="me-1" />Ajouter</>}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );

  // ── LigneListe (browse mode) ──────────────────────────────────────────────

  const LigneListe = ({ med }) => (
    <div
      className="d-flex align-items-center gap-3 bg-white px-3 py-2 shadow-sm"
      style={{ borderRadius: '12px' }}
    >
      <MedicineThumbnail categorie={med.categorie} size="sm" />
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <div className="d-flex align-items-center gap-1 flex-wrap">
          <span className="fw-bold" style={{ fontSize: '14px' }}>{med.nom}</span>
          {med.ordonnance && (
            <Badge bg="warning" text="dark" style={{ fontSize: '10px' }}>Ordonnance</Badge>
          )}
        </div>
        <span className="text-muted d-block" style={{ fontSize: '12px' }}>
          {med.categorie}
          {med.dosage && ` · ${med.dosage}`}
          {med.forme && ` · ${med.forme}`}
        </span>
        <PharmaciesDisponibles list={med.pharmaciesDisponibles} />
      </div>
      <span className="fw-bold flex-shrink-0 mx-2" style={{ color: '#0B6E4F', whiteSpace: 'nowrap' }}>
        {med.prix.toFixed(2)} MAD
      </span>
      <Button
        size="sm"
        onClick={() => handleAddToCart(med)}
        disabled={addingToCart === med.id}
        style={{ backgroundColor: '#0B6E4F', border: 'none', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        {addingToCart === med.id
          ? <Spinner size="sm" />
          : <><FaShoppingCart className="me-1" />Ajouter</>}
      </Button>
    </div>
  );

  // ── dérivés ───────────────────────────────────────────────────────────────

  const q             = recherche.trim();
  const isSearchMode  = q.length >= SEARCH_MIN_CHARS;
  const pharmacies    = recommendResults?.results ?? [];
  const showCards     = isSearchMode && !loadingRecommend && pharmacies.length > 0;
  const showEmpty     = isSearchMode && !loadingRecommend && !recommendError && pharmacies.length === 0 && recommendResults !== null;

  // ── rendu ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <NavbarClient />

      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast
          show={toast.show}
          onClose={() => setToast(t => ({ ...t, show: false }))}
          autohide delay={3000}
          bg={toast.variant}
        >
          <Toast.Header>
            <FaCheckCircle className="me-2 text-success" />
            <strong className="me-auto">PharmaSmart</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>

      <Container className="py-4">

        {/* ── En-tête ── */}
        <div className="d-flex align-items-end justify-content-between mb-4">
          <div>
            <h2 className="fw-bold mb-0" style={{ color: '#1a1a2e' }}>
              {isSearchMode ? 'Recherche par pharmacie' : 'Catalogue'}
            </h2>
            {!loading && (
              <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                {isSearchMode
                  ? pharmacies.length > 0
                    ? `${pharmacies.length} pharmacie${pharmacies.length !== 1 ? 's' : ''} pour "${recommendResults?.medicament ?? q}"`
                    : 'Aucune pharmacie disponible'
                  : `${resultats.length} médicament${resultats.length !== 1 ? 's' : ''}${categorieActive !== 'Tous' ? ` · ${categorieActive}` : ''}`
                }
              </p>
            )}
          </div>

          {!isSearchMode && (
            <div className="d-flex gap-1">
              <Button
                size="sm"
                variant={vue === 'grille' ? 'dark' : 'outline-secondary'}
                onClick={() => setVue('grille')}
                title="Vue grille"
              >
                <FaThLarge />
              </Button>
              <Button
                size="sm"
                variant={vue === 'liste' ? 'dark' : 'outline-secondary'}
                onClick={() => setVue('liste')}
                title="Vue liste"
              >
                <FaList />
              </Button>
            </div>
          )}
        </div>

        {/* ── Bouton "Trouver près de moi" ── */}
        <div className="d-flex justify-content-end mb-2">
          <Button
            size="sm"
            onClick={handleTrouverProcheDeNous}
            disabled={!isSearchMode || loadingProche}
            style={{
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1.5px solid #0B6E4F',
              color: isSearchMode ? '#0B6E4F' : '#aaa',
              backgroundColor: 'transparent',
              cursor: isSearchMode ? 'pointer' : 'not-allowed',
              padding: '5px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
            title={isSearchMode ? 'Trier les pharmacies par proximité GPS + temps de trajet' : 'Lancez une recherche pour activer ce bouton'}
          >
            {loadingProche
              ? <><Spinner size="sm" className="me-1" />Localisation…</>
              : <><FaMapMarkerAlt size={11} /> Trouver près de moi</>
            }
          </Button>
        </div>

        {/* ── Barre de recherche ── */}
        <div className="position-relative mb-2">
          <FaSearch
            className="text-muted position-absolute"
            style={{ top: '50%', transform: 'translateY(-50%)', left: '14px', pointerEvents: 'none' }}
          />
          <Form.Control
            type="text"
            placeholder="Rechercher un médicament..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            style={{
              paddingLeft: '42px',
              paddingRight: recherche ? '36px' : '14px',
              height: '44px',
              borderRadius: '10px',
            }}
          />
          {loadingRecommend && (
            <Spinner
              size="sm"
              className="position-absolute text-muted"
              style={{ top: '50%', transform: 'translateY(-50%)', right: recherche ? '38px' : '12px' }}
            />
          )}
          {recherche && (
            <button
              onClick={() => { setRecherche(''); setRecommendResults(null); setRecommendError(''); }}
              className="position-absolute border-0 bg-transparent text-muted"
              style={{ top: '50%', transform: 'translateY(-50%)', right: '10px', cursor: 'pointer', padding: '4px 6px' }}
              aria-label="Effacer"
            >
              <FaTimes size={12} />
            </button>
          )}
        </div>

        {/* ── Statut GPS ── */}
        {location.status === 'loading' && (
          <p className="mb-2" style={{ fontSize: '12px', color: '#aaa' }}>
            <FaMapMarkerAlt size={10} className="me-1" />Localisation en cours…
          </p>
        )}
        {location.status === 'granted' && isSearchMode && (
          <p className="mb-2" style={{ fontSize: '12px', color: '#0B6E4F', fontWeight: 600 }}>
            <FaMapMarkerAlt size={10} className="me-1" />
            Localisation activée — résultats triés par proximité
          </p>
        )}
        {location.status === 'denied' && isSearchMode && (
          <p className="mb-2" style={{ fontSize: '12px', color: '#888' }}>
            <FaMapMarkerAlt size={10} className="me-1" />
            Localisation non disponible — résultats triés par stock et prix
          </p>
        )}

        {q.length > 0 && q.length < SEARCH_MIN_CHARS && (
          <p className="text-muted mb-2" style={{ fontSize: '12px' }}>
            Tapez encore {SEARCH_MIN_CHARS - q.length} caractère{SEARCH_MIN_CHARS - q.length > 1 ? 's' : ''} pour lancer la recherche.
          </p>
        )}

        {/* ── Filtres catégorie (browse mode only) ── */}
        {!isSearchMode && (
          <div className="d-flex flex-wrap gap-2 mb-4">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategorieActive(cat)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  backgroundColor: categorieActive === cat
                    ? (cat === 'Tous' ? '#1a1a2e' : getCategoryColor(cat))
                    : '#e9ecef',
                  color: categorieActive === cat ? 'white' : '#555',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* ── Erreurs ── */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>
        )}
        {recommendError && (
          <Alert variant="danger" dismissible onClose={() => setRecommendError('')}>{recommendError}</Alert>
        )}

        {/* ── Spinner global ── */}
        {(loading || (isSearchMode && loadingRecommend)) ? (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color: '#0B6E4F', width: '3rem', height: '3rem' }} />
            <p className="mt-3 text-muted">
              {loading ? 'Chargement du catalogue...' : 'Recherche des pharmacies…'}
            </p>
          </div>

        ) : isSearchMode ? (
          /* ── Mode recherche ── */
          <>
            {showEmpty && (
              <div className="text-center py-5 text-muted">
                <div style={{ fontSize: '52px', lineHeight: 1 }}>🏥</div>
                <h5 className="mt-3 fw-bold">Aucune pharmacie trouvée</h5>
                <p style={{ fontSize: '14px' }}>
                  «&nbsp;{q}&nbsp;» n'est actuellement en stock dans aucune pharmacie partenaire.
                </p>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => { setRecherche(''); setRecommendResults(null); }}
                >
                  Retour au catalogue
                </Button>
              </div>
            )}

            {showCards && (
              <Row>
                {pharmacies.map(ph => (
                  <PharmacieResultCard
                    key={`${ph.pharmacie_id}-${ph.medicament_id}`}
                    ph={ph}
                    medicamentNom={ph.medicament_nom ?? ph.nom ?? (recommendResults?.medicament ?? q)}
                    onOrder={handleOrderFromPharmacy}
                    isAdding={addingPharmacy === ph.pharmacie_id && addingPharmacyMedId === ph.medicament_id}
                  />
                ))}
              </Row>
            )}
          </>

        ) : resultats.length === 0 ? (
          /* ── Browse vide ── */
          <div className="text-center py-5 text-muted">
            <div style={{ fontSize: '56px', lineHeight: 1 }}>💊</div>
            <h5 className="mt-3 fw-bold">Aucun résultat</h5>
            <p style={{ fontSize: '14px' }}>
              {recherche
                ? `Aucun médicament trouvé pour "${recherche}".`
                : 'Cette catégorie ne contient pas encore de médicaments.'}
            </p>
            {(recherche || categorieActive !== 'Tous') && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => { setRecherche(''); setCategorieActive('Tous'); }}
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>

        ) : vue === 'grille' ? (
          /* ── Browse grille ── */
          <Row>
            {resultats.map(med => <CardGrille key={med.id} med={med} />)}
          </Row>

        ) : (
          /* ── Browse liste ── */
          <div className="d-flex flex-column gap-2">
            {resultats.map(med => <LigneListe key={med.id} med={med} />)}
          </div>
        )}

      </Container>

      <Footer />
    </div>
  );
}

export default Catalogue;
