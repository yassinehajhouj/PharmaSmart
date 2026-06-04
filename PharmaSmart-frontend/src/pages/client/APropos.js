import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import {
  FaSearch, FaShoppingCart, FaTruck, FaRobot,
  FaShieldAlt, FaClock, FaMobileAlt, FaPills,
  FaHeartbeat, FaFileAlt,
} from 'react-icons/fa';
import NavbarClient from '../../components/NavbarClient';
import Footer from '../../components/Footer';

const FEATURES = [
  {
    icon: <FaSearch size={28} />,
    title: 'Recherche en temps réel',
    desc: 'Trouvez instantanément n\'importe quel médicament et vérifiez sa disponibilité dans les pharmacies proches de chez vous.',
    color: '#0B6E4F',
  },
  {
    icon: <FaShoppingCart size={28} />,
    title: 'Commandes en ligne',
    desc: 'Commandez vos médicaments depuis chez vous en quelques clics, sans vous déplacer.',
    color: '#1B4965',
  },
  {
    icon: <FaTruck size={28} />,
    title: 'Livraison ou retrait',
    desc: 'Choisissez la livraison à domicile ou le retrait en pharmacie selon vos préférences.',
    color: '#14A76C',
  },
  {
    icon: <FaRobot size={28} />,
    title: 'Assistant IA',
    desc: 'Notre chatbot intelligent répond à vos questions sur les médicaments et vous guide dans vos choix.',
    color: '#9B59B6',
  },
  {
    icon: <FaFileAlt size={28} />,
    title: 'Gestion d\'ordonnances',
    desc: 'Téléversez et gérez vos ordonnances médicales directement depuis l\'application.',
    color: '#E67E22',
  },
  {
    icon: <FaHeartbeat size={28} />,
    title: 'Suivi de commandes',
    desc: 'Suivez l\'état de vos commandes en temps réel et recevez des notifications à chaque étape.',
    color: '#E74C3C',
  },
];

const BENEFITS = [
  {
    icon: <FaClock size={32} />,
    title: 'Disponible 24h/24',
    desc: 'Accédez au catalogue et passez vos commandes à n\'importe quelle heure, 7 jours sur 7.',
    color: '#0B6E4F',
    bg: '#0B6E4F12',
  },
  {
    icon: <FaShieldAlt size={32} />,
    title: 'Sécurisé & confidentiel',
    desc: 'Vos données personnelles et médicales sont protégées et ne sont jamais partagées sans votre consentement.',
    color: '#1B4965',
    bg: '#1B496512',
  },
  {
    icon: <FaMobileAlt size={32} />,
    title: 'Simple & intuitif',
    desc: 'Une interface pensée pour tous. Aucune connaissance technique requise pour utiliser PharmaSmart.',
    color: '#14A76C',
    bg: '#14A76C12',
  },
];

function APropos() {
  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <NavbarClient />

      {/* Hero */}
      <div className="hero-section" style={{ minHeight: 'auto', padding: '70px 0' }}>
        <div className="hero-bg-image" style={{ backgroundImage: 'url(/images/pharmacy-about.jpg)' }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(135deg, rgba(11,110,79,0.82) 0%, rgba(20,167,108,0.68) 50%, rgba(11,110,79,0.78) 100%)',
          zIndex: 1,
        }} />
        <Container className="text-center" style={{ position: 'relative', zIndex: 3 }}>
          <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-4"
            style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <FaPills size={34} color="white" />
          </div>
          <h1 className="fw-bold display-5 mb-3">À propos de PharmaSmart</h1>
          <p className="fs-5 mb-0" style={{ opacity: 0.9, maxWidth: '620px', margin: '0 auto' }}>
            Votre pharmacie numérique de confiance — accédez à vos médicaments, gérez vos ordonnances et restez en bonne santé, où que vous soyez.
          </p>
        </Container>
      </div>

      <Container className="py-5">

        {/* App description */}
        <Row className="justify-content-center mb-5">
          <Col lg={8} className="text-center">
            <h2 className="fw-bold mb-3">Qu'est-ce que PharmaSmart ?</h2>
            <p className="text-muted fs-5 mb-0">
              PharmaSmart est une plateforme en ligne qui connecte les patients aux pharmacies partenaires. Grâce à une interface simple et intuitive, vous pouvez rechercher vos médicaments, passer des commandes, gérer vos ordonnances et bénéficier des conseils de notre assistant intelligent — le tout depuis votre téléphone ou ordinateur.
            </p>
          </Col>
        </Row>

        {/* Divider */}
        <div className="d-flex align-items-center gap-3 mb-5">
          <div style={{ flex: 1, height: 1, background: '#dee2e6' }} />
          <span className="text-muted fw-semibold" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
            FONCTIONNALITÉS POUR LES PATIENTS
          </span>
          <div style={{ flex: 1, height: 1, background: '#dee2e6' }} />
        </div>

        {/* Features grid */}
        <Row className="g-4 mb-5">
          {FEATURES.map((feat, i) => (
            <Col md={6} lg={4} key={i}>
              <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 52, height: 52, backgroundColor: feat.color + '15', color: feat.color }}>
                      {feat.icon}
                    </div>
                    <h6 className="fw-bold mb-0" style={{ fontSize: 15 }}>{feat.title}</h6>
                  </div>
                  <p className="text-muted mb-0" style={{ fontSize: 14, lineHeight: 1.6 }}>{feat.desc}</p>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Divider */}
        <div className="d-flex align-items-center gap-3 mb-5">
          <div style={{ flex: 1, height: 1, background: '#dee2e6' }} />
          <span className="text-muted fw-semibold" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
            LES AVANTAGES DE LA PLATEFORME
          </span>
          <div style={{ flex: 1, height: 1, background: '#dee2e6' }} />
        </div>

        {/* Benefits */}
        <Row className="g-4 mb-5">
          {BENEFITS.map((b, i) => (
            <Col md={4} key={i}>
              <Card className="border-0 shadow-sm h-100 text-center" style={{ borderRadius: 14 }}>
                <Card.Body className="p-4">
                  <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                    style={{ width: 64, height: 64, backgroundColor: b.bg, color: b.color }}>
                    {b.icon}
                  </div>
                  <h6 className="fw-bold mb-2">{b.title}</h6>
                  <p className="text-muted mb-0" style={{ fontSize: 14, lineHeight: 1.6 }}>{b.desc}</p>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* CTA */}
        <Card className="border-0 shadow-sm text-center p-4" style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #0B6E4F 0%, #14A76C 100%)',
          color: 'white',
        }}>
          <Card.Body>
            <FaHeartbeat size={36} className="mb-3" style={{ opacity: 0.9 }} />
            <h4 className="fw-bold mb-2">Prêt à simplifier votre accès aux médicaments ?</h4>
            <p className="mb-4" style={{ opacity: 0.85, maxWidth: 480, margin: '0 auto 1.5rem' }}>
              Créez votre compte gratuitement et profitez de tous les services PharmaSmart dès aujourd'hui.
            </p>
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <Link to="/catalogue">
                <Button variant="light" className="fw-bold px-4" style={{ color: '#0B6E4F', borderRadius: 8 }}>
                  <FaSearch className="me-2" />
                  Parcourir le catalogue
                </Button>
              </Link>
              <Link to="/inscription">
                <Button variant="outline-light" className="fw-bold px-4" style={{ borderRadius: 8 }}>
                  Créer un compte
                </Button>
              </Link>
            </div>
          </Card.Body>
        </Card>

      </Container>

      <Footer />
    </div>
  );
}

export default APropos;
