import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Container, Dropdown } from 'react-bootstrap';
import {
  FaTachometerAlt, FaBoxes, FaShoppingCart, FaChartBar, FaBrain,
  FaFileAlt, FaTag, FaCog, FaSignOutAlt, FaExternalLinkAlt,
  FaExclamationTriangle,
} from 'react-icons/fa';
import authService from '../services/authService';

function NavbarPharmacie() {
  const location = useLocation();
  const navigate  = useNavigate();

  const isActive = (path) =>
    location.pathname === path ? 'fw-bold text-white' : 'text-white-50';

  // Clear the pharmacist session completely before going to the client site.
  // Leaving the token in place would let patient APIs be called with a
  // pharmacist token, causing cart/stock inconsistencies.
  const handleGoToClientSite = () => {
    authService.logout();            // removes access_token, refresh_token, user
    navigate('/connexion');          // force a fresh patient login
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/connexion');
  };

  return (
    <nav className="navbar navbar-expand-lg sticky-top shadow-sm" style={{ backgroundColor: '#1B4965', padding: '10px 0' }}>
      <Container fluid className="px-4">
        <Link className="navbar-brand text-white fw-bold d-flex align-items-center" to="/pharmacie">
          <img src="/images/logo-pharmasmart-navbar.png" alt="PharmaSmart" className="navbar-logo" />
          PharmaSmart
          <span className="ms-2 badge" style={{ backgroundColor: '#0B6E4F', fontSize: '10px' }}>Pharmacie</span>
        </Link>

        <div className="d-flex align-items-center gap-3 flex-wrap">
          <Link to="/pharmacie" className={`text-decoration-none ${isActive('/pharmacie')}`} style={{ fontSize: '14px' }}>
            <FaTachometerAlt className="me-1" size={13} />Dashboard
          </Link>
          <Link to="/pharmacie/stock" className={`text-decoration-none ${isActive('/pharmacie/stock')}`} style={{ fontSize: '14px' }}>
            <FaBoxes className="me-1" size={13} />Stock
          </Link>
          <Link to="/pharmacie/commandes" className={`text-decoration-none ${isActive('/pharmacie/commandes')}`} style={{ fontSize: '14px' }}>
            <FaShoppingCart className="me-1" size={13} />Commandes
          </Link>
          <Link to="/pharmacie/analytics" className={`text-decoration-none ${isActive('/pharmacie/analytics')}`} style={{ fontSize: '14px' }}>
            <FaChartBar className="me-1" size={13} />Analytics
          </Link>
          <Link to="/pharmacie/predictions" className={`text-decoration-none ${isActive('/pharmacie/predictions')}`} style={{ fontSize: '14px' }}>
            <FaBrain className="me-1" size={13} />IA Prédictions
          </Link>

          {/* Menu Plus */}
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="link"
              className="p-0 border-0 text-white-50"
              style={{ boxShadow: 'none', fontSize: '14px', textDecoration: 'none' }}
            >
              Plus ▾
            </Dropdown.Toggle>
            <Dropdown.Menu style={{ minWidth: '200px', borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <Dropdown.Item as={Link} to="/pharmacie/low-sellers" className="py-2">
                <FaExclamationTriangle className="me-2" size={13} style={{ color: '#E74C3C' }} />Faibles ventes
              </Dropdown.Item>
              <Dropdown.Item as={Link} to="/pharmacie/promotions" className="py-2">
                <FaTag className="me-2" size={13} style={{ color: '#E74C3C' }} />Promotions
              </Dropdown.Item>
              <Dropdown.Item as={Link} to="/pharmacie/rapports" className="py-2">
                <FaFileAlt className="me-2" size={13} style={{ color: '#F39C12' }} />Rapports
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item as={Link} to="/pharmacie/parametres" className="py-2">
                <FaCog className="me-2" size={13} style={{ color: '#6c757d' }} />Paramètres
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          <div style={{ width: '1px', height: '20px', backgroundColor: '#ffffff30' }} />

          {/* User menu */}
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="link"
              className="p-0 border-0 d-flex align-items-center gap-2"
              style={{ boxShadow: 'none', color: 'white', textDecoration: 'none', fontSize: '13px' }}
            >
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                style={{ width: '30px', height: '30px', backgroundColor: '#0B6E4F', fontSize: '12px' }}
              >
                DR
              </div>
              <span className="d-none d-lg-block">Dr. Pharmacien</span>
            </Dropdown.Toggle>
            <Dropdown.Menu style={{ minWidth: '200px', borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <Dropdown.Item as={Link} to="/pharmacie/parametres" className="py-2">
                <FaCog className="me-2" size={13} /> Paramètres
              </Dropdown.Item>
              <Dropdown.Divider />

              {/*
                IMPORTANT: this is NOT a simple link to "/".
                Clicking it ends the pharmacist session before navigating so
                the pharmacist JWT is never reused for patient API calls.
                The patient must log in with their own credentials.
              */}
              <Dropdown.Item onClick={handleGoToClientSite} className="py-2 text-muted" style={{ fontSize: '13px', cursor: 'pointer' }}>
                <FaExternalLinkAlt className="me-2" size={11} />
                Site Client
                <div style={{ fontSize: '10px', color: '#bbb', marginTop: '2px' }}>
                  Déconnexion requise
                </div>
              </Dropdown.Item>

              <Dropdown.Item onClick={handleLogout} className="py-2 text-danger" style={{ cursor: 'pointer' }}>
                <FaSignOutAlt className="me-2" size={13} />
                Se déconnecter
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </Container>
    </nav>
  );
}

export default NavbarPharmacie;
