import { Link } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';
import { FaHome, FaSearch, FaArrowLeft } from 'react-icons/fa';

function NotFound() {
  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Container className="text-center py-5">
        {/* Grand 404 */}
        <div style={{ fontSize: '120px', fontWeight: 'bold', color: '#0B6E4F', lineHeight: 1, opacity: 0.2, marginBottom: '-20px' }}>
          404
        </div>

        {/* Emoji médicament */}
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>💊</div>

        <h2 className="fw-bold mb-2">Oups ! Page introuvable</h2>
        <p className="text-muted mb-4" style={{ maxWidth: '420px', margin: '0 auto 30px' }}>
          La page que vous recherchez n'existe pas ou a été déplacée. Vérifiez l'URL ou retournez à l'accueil.
        </p>

        <div className="d-flex justify-content-center gap-3 flex-wrap">
          <Link to="/">
            <Button style={{ backgroundColor: '#0B6E4F', border: 'none' }}>
              <FaHome className="me-2" /> Accueil
            </Button>
          </Link>
          <Link to="/catalogue">
            <Button variant="outline-success">
              <FaSearch className="me-2" /> Catalogue
            </Button>
          </Link>
          <Button variant="outline-secondary" onClick={() => window.history.back()}>
            <FaArrowLeft className="me-2" /> Retour
          </Button>
        </div>

        {/* Liens utiles */}
        <div className="mt-5">
          <p className="text-muted mb-2" style={{ fontSize: '13px' }}>Liens utiles :</p>
          <div className="d-flex justify-content-center gap-4">
            {[
              { to: '/catalogue', label: 'Catalogue' },
              { to: '/chatbot', label: 'Assistant IA' },
              { to: '/mes-commandes', label: 'Mes commandes' },
              { to: '/pharmacie', label: 'Espace Pharmacie' },
            ].map((l, i) => (
              <Link key={i} to={l.to} className="text-decoration-none" style={{ color: '#0B6E4F', fontSize: '14px' }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}

export default NotFound;
