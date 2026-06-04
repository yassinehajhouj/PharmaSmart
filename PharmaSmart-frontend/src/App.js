import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// ===== Pages Client =====
import Accueil from './pages/client/Accueil';
import Catalogue from './pages/client/Catalogue';
import Produit from './pages/client/Produit';
import Panier from './pages/client/Panier';
import Commandes from './pages/client/Commandes';
import ConfirmationCommande from './pages/client/ConfirmationCommande';
import Chatbot from './pages/client/Chatbot';
import Connexion from './pages/client/Connexion';
import Inscription from './pages/client/Inscription';
import InscriptionPharmacie from './pages/client/InscriptionPharmacie';
import Profil from './pages/client/Profil';
import Favoris from './pages/client/Favoris';
import Ordonnances from './pages/client/Ordonnances';
import Notifications from './pages/client/Notifications';
import APropos from './pages/client/APropos';
import RechercheStock from './pages/client/RechercheStock';


// ===== Pages Admin =====
import GestionPharmacies from './pages/admin/GestionPharmacies';

// ===== Pages Pharmacie =====
import Dashboard from './pages/pharmacie/Dashboard';
import Stock from './pages/pharmacie/Stock';
import Analytics from './pages/pharmacie/Analytics';
import CommandesRecues from './pages/pharmacie/CommandesRecues';
import Predictions from './pages/pharmacie/Predictions';
import LowSellers from './pages/pharmacie/LowSellers';
import Rapport from './pages/pharmacie/Rapport';
import Parametres from './pages/pharmacie/Parametres';
import Promotions from './pages/pharmacie/Promotions';


import { NotificationProvider } from './contexts/NotificationContext';
import NotificationToast from './components/NotificationToast';
// ===== Page 404 =====
import NotFound from './pages/NotFound';

// ===== Route guard ================================================================
// Reads the user stored in localStorage (set by authService on login).
// allowedTypes: array of user_type strings allowed to access the route.
// If not authenticated → /connexion.
// If wrong role     → redirected to their own home, never to a blank page.

function ProtectedRoute({ children, allowedTypes }) {
  const token = localStorage.getItem('access_token');
  let user = null;
  try { user = JSON.parse(localStorage.getItem('user')); } catch {}

  if (!token || !user) return <Navigate to="/connexion" replace />;

  if (allowedTypes && !allowedTypes.includes(user.user_type)) {
    // Send each role to its own dashboard instead of showing a broken page.
    const isPharmacist = ['PHARMACIEN', 'PERSONNEL'].includes(user.user_type);
    return <Navigate to={isPharmacist ? '/pharmacie' : '/'} replace />;
  }

  return children;
}

const PHARMACIEN_TYPES = ['PHARMACIEN', 'PERSONNEL'];

// ===== Animated Routes Wrapper =====
function AnimatedRoutes() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState('enter');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setStage('exit');
    }
  }, [location, displayLocation]);

  return (
    <div
      className={`page-transition page-transition--${stage}`}
      onAnimationEnd={() => {
        if (stage === 'exit') {
          setDisplayLocation(location);
          setStage('enter');
        }
      }}
    >
      <Routes location={displayLocation}>
        {/* ===== Interface Client ===== */}
        <Route path="/" element={<Accueil />} />
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/produit/:id" element={<Produit />} />
        <Route path="/panier" element={<Panier />} />
        <Route path="/mes-commandes" element={<Commandes />} />
        <Route path="/commande/:id" element={<ConfirmationCommande />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/inscription-pharmacie" element={<InscriptionPharmacie />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/favoris" element={<Favoris />} />
        <Route path="/ordonnances" element={<Ordonnances />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/a-propos" element={<APropos />} />
        <Route path="/recherche" element={<RechercheStock />} />

        {/* ===== Interface Admin ===== */}
        <Route path="/admin/pharmacies" element={<GestionPharmacies />} />

        {/* ===== Interface Pharmacie (PHARMACIEN / PERSONNEL only) ===== */}
        <Route path="/pharmacie"            element={<ProtectedRoute allowedTypes={PHARMACIEN_TYPES}><Dashboard /></ProtectedRoute>} />
        <Route path="/pharmacie/stock"      element={<ProtectedRoute allowedTypes={PHARMACIEN_TYPES}><Stock /></ProtectedRoute>} />
        <Route path="/pharmacie/commandes"  element={<ProtectedRoute allowedTypes={PHARMACIEN_TYPES}><CommandesRecues /></ProtectedRoute>} />
        <Route path="/pharmacie/analytics"  element={<ProtectedRoute allowedTypes={PHARMACIEN_TYPES}><Analytics /></ProtectedRoute>} />
        <Route path="/pharmacie/predictions"  element={<ProtectedRoute allowedTypes={PHARMACIEN_TYPES}><Predictions /></ProtectedRoute>} />
        <Route path="/pharmacie/low-sellers"  element={<ProtectedRoute allowedTypes={PHARMACIEN_TYPES}><LowSellers /></ProtectedRoute>} />
        <Route path="/pharmacie/rapports"   element={<ProtectedRoute allowedTypes={PHARMACIEN_TYPES}><Rapport /></ProtectedRoute>} />
        <Route path="/pharmacie/parametres" element={<ProtectedRoute allowedTypes={PHARMACIEN_TYPES}><Parametres /></ProtectedRoute>} />
        <Route path="/pharmacie/promotions" element={<ProtectedRoute allowedTypes={PHARMACIEN_TYPES}><Promotions /></ProtectedRoute>} />

        {/* ===== 404 ===== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <NotificationProvider>
      <Router>
        <NotificationToast />
        <AnimatedRoutes />
      </Router>
    </NotificationProvider>
  );
}

export default App;