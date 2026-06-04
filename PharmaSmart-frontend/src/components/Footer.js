import { Container, Row, Col } from 'react-bootstrap';
import { FaFacebook, FaInstagram, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer style={{ backgroundColor: '#0A2342', color: 'white', padding: '50px 0 20px' }}>
      <Container>
        <Row className="mb-4">
          <Col md={4} className="mb-4 mb-md-0">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: '#fff', fontSize: '18px' }}>
              <img src="/images/logo-pharmasmart-navbar.png" alt="" style={{ height: '50px', width: 'auto', objectFit: 'contain' }} />
              PharmaSmart
            </h5>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', lineHeight: '1.7' }}>
              Votre pharmacie en ligne intelligente. Recherchez, commandez et recevez vos médicaments en toute simplicité.
            </p>
            <div className="d-flex gap-3 mt-3">
              <a href="https://facebook.com" target="_blank" rel="noreferrer"
                style={{ color: 'rgba(255,255,255,0.5)', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>
                <FaFacebook size={20} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer"
                style={{ color: 'rgba(255,255,255,0.5)', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>
                <FaInstagram size={20} />
              </a>
            </div>
          </Col>

          <Col md={4} className="mb-4 mb-md-0">
            <h6 className="fw-bold mb-3" style={{ color: '#fff', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px' }}>
              Liens rapides
            </h6>
            <div className="d-flex flex-column gap-2" style={{ fontSize: '14px' }}>
              {[
                { to: '/catalogue', label: 'Catalogue' },
                { to: '/chatbot', label: 'Assistant IA' },
                { to: '/mes-commandes', label: 'Mes commandes' },
                { to: '/ordonnances', label: 'Mes ordonnances' },
                { to: '/a-propos', label: 'À propos' },
              ].map(link => (
                <Link key={link.to} to={link.to}
                  style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.6)'}>
                  › {link.label}
                </Link>
              ))}
            </div>
          </Col>

          <Col md={4}>
            <h6 className="fw-bold mb-3" style={{ color: '#fff', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px' }}>
              Contact
            </h6>
            <div className="d-flex flex-column gap-2" style={{ fontSize: '14px' }}>
              <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                <FaPhone className="me-2" style={{ color: '#0B6E4F' }} />+212 5XX-XXXXXX
              </span>
              <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                <FaEnvelope className="me-2" style={{ color: '#0B6E4F' }} />contact@pharmasmart.ma
              </span>
              <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                <FaMapMarkerAlt className="me-2" style={{ color: '#0B6E4F' }} />Rabat, Maroc — ENSMR
              </span>
            </div>
          </Col>
        </Row>

        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />
        <p className="text-center mb-0" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
          © 2026 PharmaSmart — Projet Fédérateur ENSMR | Génie Informatique
        </p>
      </Container>
    </footer>
  );
}

export default Footer;
