import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Container, Badge, Dropdown } from 'react-bootstrap';
import { FaShoppingCart, FaUser, FaBell, FaHeart, FaFileAlt, FaSignOutAlt, FaCheckDouble } from 'react-icons/fa';
import { useNotifications } from '../contexts/NotificationContext';
import authService from '../services/authService';

function NavbarClient({ cartCount = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  
  // Hook notifications temps réel
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Charger l'utilisateur connecté
  useEffect(() => {
    const loadUser = async () => {
      if (authService.isAuthenticated()) {
        try {
          const profile = await authService.getProfile();
          setUser(profile);
        } catch (err) {
          console.log('Erreur chargement profil');
        }
      }
    };
    loadUser();
  }, []);

  const isActive = (path) => location.pathname === path ? 'fw-bold' : '';

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    navigate('/connexion');
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString('fr-FR');
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.lien) {
      navigate(notification.lien);
    }
  };

  return (
    <nav
      className={`navbar navbar-expand-lg sticky-top shadow-sm ${scrolled ? 'navbar-scrolled' : ''}`}
      style={{
        backgroundColor: scrolled ? 'rgba(11,110,79,0.92)' : '#0B6E4F',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        transition: 'all 0.3s ease',
        padding: '10px 0',
      }}
    >
      <Container>
        <Link className="navbar-brand text-white fw-bold fs-4 d-flex align-items-center" to="/">
          <img src="/images/logo-pharmasmart-navbar.png" alt="PharmaSmart" className="navbar-logo" />
          PharmaSmart
        </Link>

        <div className="d-flex align-items-center gap-4">
          <Link to="/" className={`text-white text-decoration-none ${isActive('/')}`}>Accueil</Link>
          <Link to="/catalogue" className={`text-white text-decoration-none ${isActive('/catalogue')}`}>Catalogue</Link>
          <Link to="/chatbot" className={`text-white text-decoration-none ${isActive('/chatbot')}`}>Assistant IA</Link>
          <Link to="/a-propos" className={`text-white text-decoration-none ${isActive('/a-propos')}`}>À propos</Link>

          {/* Favoris */}
          <Link to="/favoris" className="text-white text-decoration-none position-relative" title="Mes favoris">
            <FaHeart size={18} />
          </Link>

          {/* Panier */}
          <Link to="/panier" className="text-white text-decoration-none position-relative" title="Mon panier">
            <FaShoppingCart size={20} />
            {cartCount > 0 && (
              <Badge bg="danger" pill className="position-absolute" style={{ top: '-8px', right: '-12px', fontSize: '10px' }}>
                {cartCount}
              </Badge>
            )}
          </Link>

          {/* Notifications Dropdown */}
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="link"
              className="p-0 border-0 text-white position-relative"
              style={{ boxShadow: 'none' }}
            >
              <FaBell size={18} />
              {unreadCount > 0 && (
                <Badge 
                  bg="danger" 
                  pill 
                  className="position-absolute" 
                  style={{ top: '-8px', right: '-10px', fontSize: '10px' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Dropdown.Toggle>
            <Dropdown.Menu 
              style={{ 
                minWidth: '320px', 
                maxHeight: '400px',
                overflowY: 'auto',
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 4px 25px rgba(0,0,0,0.15)',
                padding: 0
              }}
            >
              {/* Header */}
              <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom" style={{ backgroundColor: '#f8f9fa' }}>
                <span className="fw-bold">
                  🔔 Notifications
                  {unreadCount > 0 && (
                    <Badge bg="danger" className="ms-2">{unreadCount}</Badge>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button 
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    onClick={markAllAsRead}
                    style={{ fontSize: '12px', color: '#0B6E4F' }}
                  >
                    <FaCheckDouble className="me-1" />
                    Tout marquer lu
                  </button>
                )}
              </div>

              {/* Liste des notifications */}
              {notifications.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <FaBell size={30} className="mb-2 opacity-50" />
                  <p className="mb-0" style={{ fontSize: '14px' }}>Aucune notification</p>
                </div>
              ) : (
                notifications.slice(0, 5).map((notif) => (
                  <Dropdown.Item 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className="py-2 px-3 border-bottom"
                    style={{ 
                      backgroundColor: notif.is_read ? 'white' : '#f0f9f4',
                      whiteSpace: 'normal'
                    }}
                  >
                    <div className="d-flex align-items-start gap-2">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center mt-1"
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          minWidth: '32px',
                          backgroundColor: notif.type === 'COMMANDE' ? '#e8f5e9' : '#e3f2fd'
                        }}
                      >
                        {notif.type === 'COMMANDE' ? '📦' : '🔔'}
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-bold" style={{ fontSize: '13px' }}>
                          {notif.titre}
                          {!notif.is_read && (
                            <span 
                              className="ms-2 rounded-circle d-inline-block"
                              style={{ 
                                width: '8px', 
                                height: '8px', 
                                backgroundColor: '#0B6E4F' 
                              }}
                            />
                          )}
                        </div>
                        <div className="text-muted" style={{ fontSize: '12px' }}>
                          {notif.message}
                        </div>
                        <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                          {formatTime(notif.created_at)}
                        </div>
                      </div>
                    </div>
                  </Dropdown.Item>
                ))
              )}

              {/* Footer */}
              <div className="text-center py-2 border-top">
                <Link 
                  to="/notifications" 
                  className="text-decoration-none"
                  style={{ fontSize: '13px', color: '#0B6E4F' }}
                >
                  Voir toutes les notifications →
                </Link>
              </div>
            </Dropdown.Menu>
          </Dropdown>

          {/* Menu utilisateur */}
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="link"
              className="p-0 border-0 text-white"
              style={{ boxShadow: 'none' }}
            >
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '32px', height: '32px', backgroundColor: '#ffffff30' }}
              >
                <FaUser size={15} />
              </div>
            </Dropdown.Toggle>
            <Dropdown.Menu style={{ minWidth: '200px', borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              {user ? (
                <>
                  <div className="px-3 py-2 border-bottom">
                    <div className="fw-bold" style={{ fontSize: '14px' }}>
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>{user.email}</div>
                  </div>
                  <Dropdown.Item as={Link} to="/profil" className="py-2">
                    <FaUser className="me-2" size={13} style={{ color: '#0B6E4F' }} />
                    Mon profil
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/mes-commandes" className="py-2">
                    <FaShoppingCart className="me-2" size={13} style={{ color: '#0B6E4F' }} />
                    Mes commandes
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/ordonnances" className="py-2">
                    <FaFileAlt className="me-2" size={13} style={{ color: '#0B6E4F' }} />
                    Mes ordonnances
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/favoris" className="py-2">
                    <FaHeart className="me-2" size={13} style={{ color: '#0B6E4F' }} />
                    Mes favoris
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout} className="py-2 text-danger">
                    <FaSignOutAlt className="me-2" size={13} />
                    Se déconnecter
                  </Dropdown.Item>
                </>
              ) : (
                <>
                  <Dropdown.Item as={Link} to="/connexion" className="py-2">
                    <FaUser className="me-2" size={13} style={{ color: '#0B6E4F' }} />
                    Se connecter
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/inscription" className="py-2">
                    <FaUser className="me-2" size={13} style={{ color: '#0B6E4F' }} />
                    S'inscrire
                  </Dropdown.Item>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>

          <Link to="/pharmacie" className="btn btn-outline-light btn-sm">
            Espace Pharmacie
          </Link>
        </div>
      </Container>
    </nav>
  );
}

export default NavbarClient;