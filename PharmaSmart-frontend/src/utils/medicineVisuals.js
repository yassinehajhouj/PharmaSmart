import { FaPills, FaFire, FaHeartbeat, FaLungs, FaEyeDropper, FaCapsules, FaLeaf, FaMortarPestle } from 'react-icons/fa';

// ============================================================
// Medicine category visual system
// Each category gets a unique gradient + icon + color + fallback image
// ============================================================

const CATEGORY_CONFIG = {
  'Douleur':            { gradient: 'linear-gradient(135deg, #FF6B6B, #EE5A24)', icon: FaPills,          color: '#EE5A24', image: '/images/meds/doliprane-500mg.webp' },
  'Antibiotique':       { gradient: 'linear-gradient(135deg, #0B6E4F, #14A76C)', icon: FaCapsules,       color: '#0B6E4F', image: '/images/meds/amoxicilline-1g.webp' },
  'Anti-inflammatoire': { gradient: 'linear-gradient(135deg, #E74C3C, #C0392B)', icon: FaFire,           color: '#E74C3C', image: '/images/meds/ibuprofene-400mg.jpg' },
  'Gastro':             { gradient: 'linear-gradient(135deg, #3498DB, #2980B9)', icon: FaMortarPestle,   color: '#3498DB', image: '/images/meds/omeprazole-20mg.webp' },
  'Vitamines':          { gradient: 'linear-gradient(135deg, #F39C12, #F1C40F)', icon: FaLeaf,           color: '#F39C12', image: '/images/meds/vitamine-c-1000mg.webp' },
  'Allergie':           { gradient: 'linear-gradient(135deg, #9B59B6, #8E44AD)', icon: FaEyeDropper,     color: '#9B59B6', image: '/images/meds/loratadine-10mg.webp' },
  'Diabète':            { gradient: 'linear-gradient(135deg, #1B4965, #62B6CB)', icon: FaHeartbeat,      color: '#1B4965', image: '/images/meds/metformine-850mg.webp' },
  'Respiratoire':       { gradient: 'linear-gradient(135deg, #00B894, #55E6C1)', icon: FaLungs,          color: '#00B894', image: '/images/meds/ventoline-spray.webp' },
};

const DEFAULT_CONFIG = { gradient: 'linear-gradient(135deg, #636e72, #b2bec3)', icon: FaPills, color: '#636e72', image: '/images/meds/doliprane-500mg.webp' };

// ============================================================
// Per-medicine image map — each medicine gets its own real photo
// Key = medicine name (must match exactly), Value = image path
// ============================================================

const MEDICINE_IMAGES = {
  'Doliprane 500mg':     '/images/meds/doliprane-500mg.webp',
  'Amoxicilline 1g':     '/images/meds/amoxicilline-1g.webp',
  'Ibuprofène 400mg':    '/images/meds/ibuprofene-400mg.jpg',
  'Oméprazole 20mg':     '/images/meds/omeprazole-20mg.webp',
  'Vitamine C 1000mg':   '/images/meds/vitamine-c-1000mg.webp',
  'Loratadine 10mg':     '/images/meds/loratadine-10mg.webp',
  'Metformine 850mg':    '/images/meds/metformine-850mg.webp',
  'Paracétamol Sirop':   '/images/meds/paracetamol-sirop.jpg',
  'Augmentin 1g':        '/images/meds/augmentin-1g.avif',
  'Ventoline Spray':     '/images/meds/ventoline-spray.webp',
  'Vitamine D 1000UI':   '/images/meds/vitamine-d-1000ui.jpg',
  'Smecta 3g':           '/images/meds/smecta-3g.jpg',
};

export function getCategoryVisual(categorie) {
  return CATEGORY_CONFIG[categorie] || DEFAULT_CONFIG;
}

/**
 * Get the real image for a specific medicine by name.
 * Falls back to category image, then default.
 */
export function getMedicineImage(nom, categorie) {
  return MEDICINE_IMAGES[nom] || (CATEGORY_CONFIG[categorie] || DEFAULT_CONFIG).image;
}

// ============================================================
// MedicineThumbnail — reusable visual component
// sizes: 'sm' (48px), 'md' (80px), 'lg' (200px), 'banner' (full-width 140px tall)
// ============================================================

const SIZES = {
  sm: { width: 48, height: 48, iconSize: 22, radius: 10 },
  md: { width: 80, height: 80, iconSize: 36, radius: 14 },
  lg: { width: 200, height: 200, iconSize: 80, radius: 20 },
  banner: { width: '100%', height: 140, iconSize: 50, radius: '12px 12px 0 0' },
};

export function MedicineThumbnail({ categorie, size = 'md', className = '' }) {
  const config = getCategoryVisual(categorie);
  const dim = SIZES[size] || SIZES.md;
  const Icon = config.icon;

  return (
    <div
      className={`medicine-thumb ${className}`}
      style={{
        width: dim.width,
        height: dim.height,
        minWidth: typeof dim.width === 'number' ? dim.width : undefined,
        background: config.gradient,
        borderRadius: typeof dim.radius === 'number' ? `${dim.radius}px` : dim.radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'inset 0 -4px 12px rgba(0,0,0,0.12), 0 4px 15px rgba(0,0,0,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative circle in background */}
      <div style={{
        position: 'absolute',
        width: '70%',
        height: '70%',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        top: '-10%',
        right: '-10%',
      }} />
      <Icon size={dim.iconSize} color="rgba(255,255,255,0.9)" style={{ zIndex: 1 }} />
    </div>
  );
}

// ============================================================
// MedicineRealImage — shows the actual medicine photo
// Renders real photo with gradient overlay, falls back to MedicineThumbnail
// ============================================================

export function MedicineRealImage({ nom, categorie, size = 'md', className = '' }) {
  const config = getCategoryVisual(categorie);
  const dim = SIZES[size] || SIZES.md;
  const imageUrl = getMedicineImage(nom, categorie);

  return (
    <div
      className={`medicine-real-image ${className}`}
      style={{
        width: dim.width,
        height: dim.height,
        minWidth: typeof dim.width === 'number' ? dim.width : undefined,
        borderRadius: typeof dim.radius === 'number' ? `${dim.radius}px` : dim.radius,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}
    >
      <img
        src={imageUrl}
        alt={nom || categorie}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#f8f9fa',
        }}
      />
      {/* Subtle bottom gradient with category color */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '30%',
        background: `linear-gradient(transparent, ${config.color}20)`,
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ============================================================
// MedicineSplitCard — creative split card for Catalogue
// Shows real medicine image first, on hover/tap splits: icon left + image right
// ============================================================

export function MedicineSplitCard({ nom, categorie, customImage, className = '' }) {
  const config = getCategoryVisual(categorie);
  const Icon = config.icon;
  const fallbackUrl = getMedicineImage(nom, categorie);
  // customImage comes from the backend (uploaded file). Use it when present;
  // fall back to the hardcoded category map if the URL is broken or absent.
  const imageUrl = customImage || fallbackUrl;
  const handleImgError = (e) => { e.currentTarget.src = fallbackUrl; };

  return (
    <div className={`split-card-wrapper ${className}`} style={{
      width: '100%', height: 160, borderRadius: '12px 12px 0 0',
      position: 'relative', overflow: 'hidden', cursor: 'pointer',
      backgroundColor: '#f8f9fa',
    }}>
      {/* Default state: real image */}
      <div className="split-card-image" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 1,
      }}>
        <img
          key={imageUrl}
          src={imageUrl}
          alt={nom || categorie}
          onError={handleImgError}
          style={{ maxWidth: '85%', maxHeight: '90%', objectFit: 'contain' }}
        />
      </div>

      {/* Subtle gradient overlay on image */}
      <div className="split-card-overlay" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: `linear-gradient(180deg, transparent 50%, ${config.color}30 100%)`,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 2,
      }} />

      {/* Left panel: icon + gradient (hidden by default, slides in on hover) */}
      <div className="split-card-icon-panel" style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: '40%',
        background: config.gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: 'translateX(-100%)',
        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 3,
      }}>
        <div style={{
          position: 'absolute', width: '120%', height: '120%', borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', top: '-20%', right: '-30%',
        }} />
        <Icon size={44} color="rgba(255,255,255,0.92)" style={{ zIndex: 1 }} />
      </div>

      {/* Right panel: the image shifts right on hover */}
      <div className="split-card-photo-panel" style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 2,
      }}>
        <img
          key={`panel-${imageUrl}`}
          src={imageUrl}
          alt={nom || categorie}
          onError={handleImgError}
          style={{ maxWidth: '80%', maxHeight: '90%', objectFit: 'contain' }}
        />
      </div>
    </div>
  );
}

export function getCategoryColor(categorie) {
  return (CATEGORY_CONFIG[categorie] || DEFAULT_CONFIG).color;
}

export function getCategoryImage(categorie) {
  return (CATEGORY_CONFIG[categorie] || DEFAULT_CONFIG).image;
}
