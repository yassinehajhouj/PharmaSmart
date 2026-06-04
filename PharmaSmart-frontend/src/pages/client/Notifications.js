import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Card, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { FaBell, FaCheck, FaTrash, FaShoppingCart, FaBoxOpen, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaWifi } from 'react-icons/fa';
import NavbarClient from '../../components/NavbarClient';
import Footer from '../../components/Footer';
import notificationService from '../../services/notificationService';
import authService from '../../services/authService';
import { useNotifications } from '../../contexts/NotificationContext';

// ── Mini démo WebSocket ──────────────────────────────────────────────────────

function WsDemo() {
  const { connected, unreadCount } = useNotifications();
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState('');

  const handlePing = async () => {
    setPinging(true);
    setPingResult('');
    try {
      await notificationService.ping();
      setPingResult('✅ Ping envoyé — regardez le toast en haut à droite !');
    } catch {
      setPingResult('❌ Erreur : êtes-vous connecté ?');
    } finally {
      setPinging(false);
    }
  };

  return (
    <Card className="mb-4 border-0" style={{ background: connected ? '#f0faf5' : '#fff8f8', borderRadius: 14 }}>
      <Card.Body className="py-3 px-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            {/* indicateur de connexion */}
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              backgroundColor: connected ? '#0B6E4F' : '#dc3545',
              boxShadow: connected ? '0 0 0 3px rgba(11,110,79,.2)' : '0 0 0 3px rgba(220,53,69,.2)',
              flexShrink: 0,
            }} />
            <div>
              <span className="fw-bold" style={{ fontSize: 14 }}>
                <FaWifi className="me-1" />
                WebSocket {connected ? 'connecté' : 'déconnecté'}
              </span>
              <span className="ms-2 text-muted" style={{ fontSize: 12 }}>
                ws://127.0.0.1:8000/ws/notifications/
              </span>
              {connected && (
                <span className="ms-2" style={{ fontSize: 12, color: '#0B6E4F' }}>
                  · {unreadCount} non lue{unreadCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {pingResult && (
              <span style={{ fontSize: 12, color: pingResult.startsWith('✅') ? '#0B6E4F' : '#dc3545' }}>
                {pingResult}
              </span>
            )}
            <Button
              size="sm"
              disabled={pinging || !connected}
              onClick={handlePing}
              style={{
                backgroundColor: '#0B6E4F', border: 'none',
                borderRadius: 20, fontSize: 12, padding: '5px 16px',
              }}
              title={connected ? 'Envoyer une notification test via WebSocket' : 'WebSocket non connecté'}
            >
              {pinging ? <Spinner size="sm" /> : '🔔 Tester en temps réel'}
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Notifications() {
  const [filtre, setFiltre] = useState('toutes');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      const auth = authService.isAuthenticated();
      setIsAuthenticated(auth);

      if (!auth) {
        setLoading(false);
        return;
      }

      try {
        const data = await notificationService.getNotifications();
        
        const formattedNotifs = data.map(notif => ({
          id: notif.id,
          type: notif.type_notification.toLowerCase(),
          titre: notif.titre,
          message: notif.message,
          date: formatDate(notif.created_at),
          lu: notif.is_read,
        }));
        
        setNotifications(formattedNotifs);
      } catch (err) {
        console.error('Erreur chargement notifications:', err);
        setError('Impossible de charger les notifications');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days} jour(s)`;
    return date.toLocaleDateString('fr-FR');
  };

  const typeConfig = {
    commande: { icon: <FaShoppingCart />, color: '#0B6E4F', bg: '#e8f5ee' },
    stock: { icon: <FaBoxOpen />, color: '#1B4965', bg: '#e8f0f7' },
    ordonnance: { icon: <FaBoxOpen />, color: '#9B59B6', bg: '#f3e8f7' },
    alerte: { icon: <FaExclamationTriangle />, color: '#F39C12', bg: '#fdf5e6' },
    info: { icon: <FaInfoCircle />, color: '#6c757d', bg: '#f5f5f5' },
    systeme: { icon: <FaInfoCircle />, color: '#3498DB', bg: '#e8f4fc' },
    promotion: { icon: <FaInfoCircle />, color: '#E74C3C', bg: '#fce8e8' },
    approbation: { icon: <FaCheckCircle />, color: '#0B6E4F', bg: '#e8f5ee' },
  };

  const marquerLu = async (id) => {
    try {
      await notificationService.marquerLu(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, lu: true } : n));
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const supprimer = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const marquerToutLu = async () => {
    try {
      await notificationService.toutMarquerLu();
      setNotifications(notifications.map(n => ({ ...n, lu: true })));
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const filtrees = filtre === 'toutes'
    ? notifications
    : filtre === 'non_lues'
      ? notifications.filter(n => !n.lu)
      : notifications.filter(n => n.type === filtre);

  const nonLues = notifications.filter(n => !n.lu).length;

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <NavbarClient />
        <Container className="py-5 text-center">
          <Spinner animation="border" style={{ color: '#0B6E4F' }} />
          <p className="mt-3">Chargement des notifications...</p>
        </Container>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <NavbarClient />
        <Container className="py-5 text-center">
          <FaBell size={50} style={{ color: '#ccc' }} />
          <h3 className="fw-bold mt-3">Connectez-vous pour voir vos notifications</h3>
          <Link to="/connexion" className="btn btn-lg mt-3" style={{ backgroundColor: '#0B6E4F', color: 'white' }}>
            Se connecter
          </Link>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarClient />

      <Container className="py-4" style={{ maxWidth: '800px' }}>

        {/* ── Mini démo WebSocket ── */}
        <WsDemo />

        {/* En-tête */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">
              <FaBell className="me-2" style={{ color: '#0B6E4F' }} />
              Notifications
              {nonLues > 0 && (
                <Badge bg="danger" className="ms-2" style={{ fontSize: '14px' }}>{nonLues}</Badge>
              )}
            </h2>
            <p className="text-muted mb-0">{nonLues} non lue(s)</p>
          </div>
          {nonLues > 0 && (
            <Button variant="outline-success" size="sm" onClick={marquerToutLu}>
              <FaCheck className="me-1" /> Tout marquer comme lu
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        {/* Filtres */}
        <div className="d-flex gap-2 mb-4 flex-wrap">
          {[
            { key: 'toutes', label: 'Toutes' },
            { key: 'non_lues', label: `Non lues (${nonLues})` },
            { key: 'commande', label: 'Commandes' },
            { key: 'stock', label: 'Stock' },
            { key: 'info', label: 'Informations' },
          ].map(f => (
            <Button
              key={f.key}
              size="sm"
              variant={filtre === f.key ? 'dark' : 'outline-secondary'}
              onClick={() => setFiltre(f.key)}
              style={filtre === f.key ? { backgroundColor: '#0B6E4F', border: 'none' } : {}}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Liste */}
        {filtrees.length === 0 ? (
          <Card className="border-0 shadow-sm text-center py-5">
            <Card.Body>
              <FaBell size={50} style={{ color: '#dee2e6', marginBottom: '15px' }} />
              <h5 className="fw-bold text-muted">Aucune notification</h5>
              <p className="text-muted">Vous êtes à jour !</p>
            </Card.Body>
          </Card>
        ) : (
          <div className="d-flex flex-column gap-2">
            {filtrees.map(notif => {
              const cfg = typeConfig[notif.type] || typeConfig.info;
              return (
                <Card
                  key={notif.id}
                  className="border-0 shadow-sm"
                  style={{
                    borderLeft: `4px solid ${cfg.color}`,
                    opacity: notif.lu ? 0.8 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <Card.Body className="py-3">
                    <div className="d-flex align-items-start gap-3">
                      {/* Icône */}
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                        style={{ width: '40px', height: '40px', backgroundColor: cfg.bg, color: cfg.color }}
                      >
                        {cfg.icon}
                      </div>

                      {/* Contenu */}
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold" style={{ fontSize: '14px' }}>{notif.titre}</span>
                            {!notif.lu && <div className="rounded-circle bg-danger" style={{ width: '8px', height: '8px' }} />}
                          </div>
                          <span className="text-muted" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{notif.date}</span>
                        </div>
                        <p className="text-muted mb-0 mt-1" style={{ fontSize: '13px' }}>{notif.message}</p>
                      </div>

                      {/* Actions */}
                      <div className="d-flex gap-1 flex-shrink-0">
                        {!notif.lu && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-1"
                            title="Marquer comme lu"
                            onClick={() => marquerLu(notif.id)}
                            style={{ color: '#0B6E4F' }}
                          >
                            <FaCheckCircle size={16} />
                          </Button>
                        )}
                        <Button
                          variant="link"
                          size="sm"
                          className="p-1 text-danger"
                          title="Supprimer"
                          onClick={() => supprimer(notif.id)}
                        >
                          <FaTrash size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              );
            })}
          </div>
        )}
      </Container>

      <Footer />
    </div>
  );
}

export default Notifications;