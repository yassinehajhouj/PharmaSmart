import { useState, useEffect, useRef, useCallback } from 'react';
import Fuse from 'fuse.js';
import { Container, Form, Spinner, Alert } from 'react-bootstrap';
import {
  FaSearch, FaTimes, FaClinicMedical, FaMapMarkerAlt, FaHistory, FaStar,
} from 'react-icons/fa';
import NavbarClient from '../../components/NavbarClient';
import Footer from '../../components/Footer';
import catalogService from '../../services/catalogService';

// ─── constants ────────────────────────────────────────────────────────────────

const DEBOUNCE_MS     = 400;
const MIN_CHARS       = 2;
const MAX_SUGGESTIONS = 6;
const MAX_RECENT      = 5;
const RECENT_KEY      = 'pharmasmart_recent_searches';

const FUSE_OPTIONS = {
  keys: ['nom', 'dosage'],
  threshold: 0.35,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function scoreBadge(score) {
  if (score >= 0.8) return { color: '#198754', label: 'Excellent' };
  if (score >= 0.6) return { color: '#fd7e14', label: 'Bon' };
  return { color: '#aaa', label: 'Correct' };
}

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}

function saveRecent(term, current) {
  const updated = [term, ...current.filter(s => s !== term)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  return updated;
}

// ─── SuggestionDropdown ───────────────────────────────────────────────────────

function SuggestionDropdown({ query, suggestions, recentSearches, activeIdx, onSelect, onClearRecent }) {
  const q = query.trim();
  const showRecent      = q.length === 0 && recentSearches.length > 0;
  const showSuggestions = q.length >= MIN_CHARS && suggestions.length > 0;
  const showNoMatch     = q.length >= MIN_CHARS && suggestions.length === 0;

  if (!showRecent && !showSuggestions && !showNoMatch) return null;

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
      zIndex: 1000, backgroundColor: '#fff', borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.11)', border: '1px solid #ececec',
      overflow: 'hidden',
    }}>
      {showRecent && (
        <>
          <div className="d-flex align-items-center justify-content-between px-3 pt-2 pb-1"
            style={{ fontSize: '11px', color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span>Recherches récentes</span>
            <button onClick={onClearRecent} className="border-0 bg-transparent p-0"
              style={{ fontSize: '11px', color: '#aaa', cursor: 'pointer' }}>Effacer</button>
          </div>
          {recentSearches.map((term, i) => (
            <button key={term} onMouseDown={() => onSelect(term)}
              className="d-flex align-items-center gap-2 w-100 border-0 text-start px-3 py-2"
              style={{ fontSize: '14px', cursor: 'pointer', backgroundColor: activeIdx === i ? '#f0f8f5' : '#fff', color: '#1a1a2e', transition: 'background 0.1s' }}>
              <FaHistory size={11} color="#bbb" />{term}
            </button>
          ))}
        </>
      )}

      {showSuggestions && (
        <>
          <div className="px-3 pt-2 pb-1"
            style={{ fontSize: '11px', color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Suggestions
          </div>
          {suggestions.map((med, i) => (
            <button key={med.id} onMouseDown={() => onSelect(med.nom)}
              className="d-flex align-items-center justify-content-between w-100 border-0 text-start px-3 py-2"
              style={{ fontSize: '14px', cursor: 'pointer', backgroundColor: activeIdx === i ? '#f0f8f5' : '#fff', transition: 'background 0.1s' }}>
              <div>
                <span style={{ color: '#1a1a2e' }}>{med.nom}</span>
                {med.dosage && <span className="ms-2" style={{ fontSize: '12px', color: '#aaa' }}>{med.dosage}</span>}
              </div>
              <FaSearch size={10} color="#ddd" />
            </button>
          ))}
        </>
      )}

      {showNoMatch && (
        <div className="px-3 py-2" style={{ fontSize: '13px', color: '#999' }}>
          Recherche «&nbsp;{q}&nbsp;» en cours…
        </div>
      )}
    </div>
  );
}

// ─── PharmacieCard ────────────────────────────────────────────────────────────

function PharmacieCard({ ph, hasLocation }) {
  const isBest = ph.is_best_choice;
  const { color: scoreColor, label: scoreLabel } = scoreBadge(ph.score);

  return (
    <div style={{
      borderRadius: '14px',
      border: `2px solid ${isBest ? '#0B6E4F' : '#ececec'}`,
      backgroundColor: isBest ? '#f0faf5' : '#fff',
      padding: '16px',
      boxShadow: isBest
        ? '0 4px 18px rgba(11,110,79,0.13)'
        : '0 1px 5px rgba(0,0,0,0.05)',
      transition: 'box-shadow 0.2s',
    }}>

      {/* ── best-choice badge ── */}
      {isBest && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          backgroundColor: '#0B6E4F', color: '#fff',
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px',
          textTransform: 'uppercase', padding: '3px 10px',
          borderRadius: '20px', marginBottom: '12px',
        }}>
          <FaStar size={9} />Meilleur choix
        </div>
      )}

      <div className="d-flex align-items-start gap-3">
        {/* icon */}
        <div style={{
          width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
          backgroundColor: isBest ? '#c8e6da' : '#e8f4f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#0B6E4F',
        }}>
          <FaClinicMedical size={16} />
        </div>

        {/* pharmacy info */}
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <h6 className="fw-bold mb-1 text-truncate" style={{ color: '#1a1a2e', fontSize: '15px' }}>
            {ph.pharmacie}
          </h6>
          <div className="d-flex flex-wrap gap-2" style={{ fontSize: '12px', color: '#888' }}>
            <span><FaMapMarkerAlt size={10} className="me-1" />{ph.ville}</span>
            {hasLocation && ph.distance != null && (
              <span style={{ color: '#0B6E4F', fontWeight: 600 }}>
                📍 {ph.distance} km
              </span>
            )}
            {ph.date_expiration && (
              <span>Exp.&nbsp;{ph.date_expiration}</span>
            )}
          </div>
        </div>

        {/* price + quantity */}
        <div className="text-end flex-shrink-0">
          <div className="fw-bold" style={{ color: '#0B6E4F', fontSize: '16px', whiteSpace: 'nowrap' }}>
            {Number(ph.prix).toFixed(2)}&nbsp;
            <span style={{ fontSize: '10px', fontWeight: 400 }}>MAD</span>
          </div>
          <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
            {ph.quantite}&nbsp;<span style={{ fontSize: '11px' }}>unités</span>
          </div>
        </div>
      </div>

      {/* ── score bar ── */}
      <div className="d-flex align-items-center gap-2 mt-3 pt-2"
        style={{ borderTop: '1px solid #f0f0f0' }}>
        <div style={{ flex: 1, height: 5, backgroundColor: '#e9ecef', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.round(ph.score * 100)}%`, height: '100%',
            backgroundColor: scoreColor, borderRadius: 3,
          }} />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: scoreColor, minWidth: '90px', textAlign: 'right' }}>
          {scoreLabel}&nbsp;·&nbsp;{ph.score.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

function RechercheStock() {
  const [query, setQuery]               = useState('');
  // null = no search yet; { medicament, results: [...] } = API response
  const [results, setResults]           = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [suggestions, setSuggestions]   = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx]       = useState(-1);
  const [recentSearches, setRecentSearches] = useState(loadRecent);

  // 'idle' | 'loading' | 'granted' | 'denied'
  const [location, setLocation] = useState({ lat: null, lng: null, status: 'idle' });

  const fuseRef      = useRef(null);
  const containerRef = useRef(null);

  // ── request GPS once on mount ─────────────────────────────────────────────

  useEffect(() => {
    if (!navigator.geolocation) return;
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

  // ── init Fuse on mount ────────────────────────────────────────────────────

  useEffect(() => {
    catalogService.getMedicaments().then(data => {
      fuseRef.current = new Fuse(data, FUSE_OPTIONS);
    }).catch(() => {});
  }, []);

  // ── click-outside closes dropdown ─────────────────────────────────────────

  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fuse suggestions (instant) ────────────────────────────────────────────

  useEffect(() => {
    const q = query.trim();
    if (!fuseRef.current || q.length < MIN_CHARS) { setSuggestions([]); setActiveIdx(-1); return; }
    setSuggestions(fuseRef.current.search(q, { limit: MAX_SUGGESTIONS }).map(h => h.item));
    setActiveIdx(-1);
  }, [query]);

  // ── debounced recommendation call (re-fires when GPS becomes available) ───

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) { setResults(null); setError(''); setLoading(false); return; }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await catalogService.searchRecommended(q, {
          lat: location.lat,
          lng: location.lng,
        });
        setResults(data);
        setError('');
      } catch (err) {
        const httpStatus = err.response?.status;
        const detail     = err.response?.data?.detail;

        if (httpStatus === 404) {
          // med not found or no pharmacy stock — treat as empty result set
          setResults({ medicament: q, results: [] });
          setError('');
        } else {
          setError(detail || 'Erreur lors de la recherche. Vérifiez votre connexion.');
          setResults(null);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, location]);   // re-fires when GPS location is resolved

  // ── handlers ──────────────────────────────────────────────────────────────

  const selectSuggestion = useCallback(term => {
    setQuery(term);
    setShowDropdown(false);
    setActiveIdx(-1);
    setRecentSearches(prev => saveRecent(term, prev));
  }, []);

  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_KEY);
  }, []);

  const clear = () => {
    setQuery(''); setResults(null); setError(''); setShowDropdown(false);
  };

  const handleKeyDown = e => {
    if (!showDropdown) return;
    const items = query.trim().length >= MIN_CHARS ? suggestions : recentSearches;
    if (e.key === 'ArrowDown')       { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      const term = query.trim().length >= MIN_CHARS ? suggestions[activeIdx]?.nom : recentSearches[activeIdx];
      if (term) selectSuggestion(term);
    } else if (e.key === 'Escape') setShowDropdown(false);
  };

  // ── derived ───────────────────────────────────────────────────────────────

  const q           = query.trim();
  const showHint    = q.length > 0 && q.length < MIN_CHARS;
  const hasLocation = location.status === 'granted';
  const pharmacies  = results?.results ?? [];
  const showResults = !loading && results !== null && pharmacies.length > 0;
  const showEmpty   = !loading && !error && q.length >= MIN_CHARS && results !== null && pharmacies.length === 0;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <NavbarClient />

      <Container className="py-4" style={{ maxWidth: '760px' }}>

        <h2 className="fw-bold mb-1" style={{ color: '#1a1a2e' }}>Trouver la meilleure pharmacie</h2>
        <p className="text-muted mb-4" style={{ fontSize: '14px' }}>
          Recommandations personnalisées selon la distance, le stock, le prix et la fraîcheur.
        </p>

        {/* ── search input + dropdown ── */}
        <div ref={containerRef} className="position-relative mb-2">
          <FaSearch className="text-muted position-absolute"
            style={{ top: '50%', transform: 'translateY(-50%)', left: '14px', pointerEvents: 'none' }} />
          <Form.Control
            type="text" autoFocus placeholder="Nom ou principe actif…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            style={{
              paddingLeft: '42px', paddingRight: query ? '72px' : '14px',
              height: '48px', borderRadius: '12px', fontSize: '15px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1.5px solid #dee2e6',
            }}
          />
          {loading && (
            <Spinner size="sm" className="position-absolute text-muted"
              style={{ top: '50%', transform: 'translateY(-50%)', right: query ? '40px' : '14px' }} />
          )}
          {query && (
            <button onClick={clear}
              className="position-absolute border-0 bg-transparent text-muted"
              style={{ top: '50%', transform: 'translateY(-50%)', right: '12px', cursor: 'pointer', padding: '4px 6px' }}
              aria-label="Effacer">
              <FaTimes size={13} />
            </button>
          )}
          {showDropdown && (
            <SuggestionDropdown
              query={query} suggestions={suggestions} recentSearches={recentSearches}
              activeIdx={activeIdx} onSelect={selectSuggestion} onClearRecent={clearRecent} />
          )}
        </div>

        {/* ── location status pill ── */}
        {location.status === 'loading' && (
          <p className="mb-2" style={{ fontSize: '12px', color: '#aaa' }}>
            <FaMapMarkerAlt size={10} className="me-1" />Localisation en cours…
          </p>
        )}
        {location.status === 'granted' && (
          <p className="mb-2" style={{ fontSize: '12px', color: '#0B6E4F', fontWeight: 600 }}>
            <FaMapMarkerAlt size={10} className="me-1" />
            Localisation activée — recommandations personnalisées par proximité
          </p>
        )}
        {location.status === 'denied' && (
          <p className="mb-2" style={{ fontSize: '12px', color: '#888' }}>
            <FaMapMarkerAlt size={10} className="me-1" />
            Localisation non disponible — résultats triés par stock et prix
          </p>
        )}

        {showHint && (
          <p className="text-muted mb-3" style={{ fontSize: '12px' }}>
            Tapez encore {MIN_CHARS - q.length} caractère{MIN_CHARS - q.length > 1 ? 's' : ''} pour lancer la recherche.
          </p>
        )}

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">
            {error}
          </Alert>
        )}

        {/* ── results header ── */}
        {showResults && (
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Médicament :&nbsp;</span>
              <strong style={{ fontSize: '15px', color: '#1a1a2e' }}>{results.medicament}</strong>
            </div>
            <span className="text-muted" style={{ fontSize: '12px' }}>
              {pharmacies.length} pharmacie{pharmacies.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* ── empty state ── */}
        {showEmpty && (
          <div className="text-center py-5 text-muted">
            <div style={{ fontSize: '52px', lineHeight: 1 }}>💊</div>
            <h5 className="mt-3 fw-bold">Aucune pharmacie disponible</h5>
            <p style={{ fontSize: '14px' }}>
              «&nbsp;{q}&nbsp;» n'est actuellement en stock dans aucune pharmacie.
            </p>
          </div>
        )}

        {/* ── pharmacy cards ── */}
        <div className="d-flex flex-column gap-3">
          {showResults && pharmacies.map(ph => (
            <PharmacieCard
              key={ph.pharmacie_id}
              ph={ph}
              hasLocation={hasLocation}
            />
          ))}
        </div>

      </Container>

      <Footer />
    </div>
  );
}

export default RechercheStock;
