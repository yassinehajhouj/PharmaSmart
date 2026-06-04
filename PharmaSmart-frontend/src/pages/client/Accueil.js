import { Link } from 'react-router-dom';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { FaSearch, FaPills, FaComments, FaTruck, FaShieldAlt, FaChartLine, FaRobot, FaHeartbeat, FaCapsules, FaLeaf } from 'react-icons/fa';
import NavbarClient from '../../components/NavbarClient';
import Footer from '../../components/Footer';

function Accueil() {
  return (
    <div>
      <NavbarClient />

      {/* Hero Section */}
      <div className="hero-section">
        {/* Background image layer — responsive via CSS class, image set inline for public folder */}
        <div className="hero-bg-image" style={{ backgroundImage: 'url(/images/pharmacist-hero.jpg)' }} />
        {/* Green gradient overlay on top of image */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(135deg, rgba(11,110,79,0.78) 0%, rgba(20,167,108,0.65) 40%, rgba(11,110,79,0.72) 100%)',
          zIndex: 1,
        }} />
        {/* Decorative background circles */}
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -60, right: -60, zIndex: 2 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', bottom: -40, left: '20%', zIndex: 2 }} />

        <Container style={{ position: 'relative', zIndex: 3 }}>
          <Row className="align-items-center">
            <Col md={7}>
              <h1 className="display-4 fw-bold mb-3">
                Votre pharmacie en ligne, intelligente et accessible
              </h1>
              <p className="fs-5 mb-4" style={{ opacity: 0.9 }}>
                Recherchez vos médicaments, vérifiez leur disponibilité en temps réel,
                et faites-vous livrer à domicile. Notre assistant IA est là pour vous guider.
              </p>
              <div className="d-flex gap-3 flex-wrap">
                <Link to="/catalogue">
                  <Button variant="light" size="lg" className="fw-bold" style={{ color: '#0B6E4F' }}>
                    <FaSearch className="me-2" />
                    Rechercher un médicament
                  </Button>
                </Link>
                <Link to="/chatbot">
                  <Button variant="outline-light" size="lg" className="fw-bold">
                    <FaComments className="me-2" />
                    Parler à l'assistant IA
                  </Button>
                </Link>
              </div>
            </Col>
            <Col md={5} className="text-center d-none d-md-block">
              {/* Floating illustration composition */}
              <div style={{ position: 'relative', height: '320px' }}>
                {/* Main pill icon */}
                <div className="animate-float" style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 140, height: 140, borderRadius: 28,
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                }}>
                  <FaPills size={60} color="rgba(255,255,255,0.9)" />
                </div>

                {/* Floating secondary icons */}
                <div className="animate-float" style={{
                  position: 'absolute', top: '10%', left: '15%',
                  animationDelay: '0.8s',
                  width: 65, height: 65, borderRadius: 16,
                  background: 'linear-gradient(135deg, #FF6B6B, #EE5A24)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 6px 20px rgba(238,90,36,0.3)',
                }}>
                  <FaHeartbeat size={28} color="white" />
                </div>

                <div className="animate-float" style={{
                  position: 'absolute', top: '15%', right: '10%',
                  animationDelay: '1.6s',
                  width: 55, height: 55, borderRadius: 14,
                  background: 'linear-gradient(135deg, #3498DB, #2980B9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 6px 20px rgba(52,152,219,0.3)',
                }}>
                  <FaCapsules size={24} color="white" />
                </div>

                <div className="animate-float" style={{
                  position: 'absolute', bottom: '15%', left: '10%',
                  animationDelay: '2.4s',
                  width: 50, height: 50, borderRadius: 12,
                  background: 'linear-gradient(135deg, #F39C12, #F1C40F)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 6px 20px rgba(243,156,18,0.3)',
                }}>
                  <FaLeaf size={22} color="white" />
                </div>

                <div className="animate-float" style={{
                  position: 'absolute', bottom: '10%', right: '20%',
                  animationDelay: '3.2s',
                  width: 60, height: 60, borderRadius: 14,
                  background: 'linear-gradient(135deg, #9B59B6, #8E44AD)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 6px 20px rgba(155,89,182,0.3)',
                }}>
                  <FaRobot size={26} color="white" />
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Stats Banner */}
      <div style={{ backgroundColor: '#0A2342', color: 'white', padding: '25px 0' }}>
        <Container>
          <Row className="text-center">
            {[
              { val: "500+", label: "Médicaments disponibles" },
              { val: "24/7", label: "Assistant IA" },
              { val: "2h", label: "Livraison express" },
              { val: "100%", label: "Satisfaction client" },
            ].map((s, i) => (
              <Col md={3} key={i} className="animate-fade-up">
                <h3 className="fw-bold mb-0 stat-number" style={{ color: '#14A76C' }}>{s.val}</h3>
                <small style={{ color: 'rgba(255,255,255,0.6)' }}>{s.label}</small>
              </Col>
            ))}
          </Row>
        </Container>
      </div>

      {/* Services */}
      <Container className="py-5">
        <h2 className="text-center fw-bold mb-2 gradient-text">Nos Services</h2>
        <p className="text-center text-muted mb-5">Tout ce dont vous avez besoin pour votre santé, en un clic</p>
        <Row className="g-4">
          {[
            { icon: <FaPills size={28} />, title: "Catalogue complet", desc: "Consultez notre catalogue de médicaments avec descriptions détaillées, prix et disponibilité en temps réel.", link: "/catalogue", gradient: 'linear-gradient(135deg, #0B6E4F, #14A76C)' },
            { icon: <FaTruck size={28} />, title: "Livraison rapide", desc: "Commandez en ligne et recevez vos médicaments à domicile dans les plus brefs délais.", link: "/catalogue", gradient: 'linear-gradient(135deg, #1B4965, #62B6CB)' },
            { icon: <FaRobot size={28} />, title: "Assistant IA", desc: "Notre chatbot intelligent vous aide à trouver le bon médicament selon vos symptômes.", link: "/chatbot", gradient: 'linear-gradient(135deg, #9B59B6, #8E44AD)' },
            { icon: <FaShieldAlt size={28} />, title: "Sécurité garantie", desc: "Tous nos médicaments sont vérifiés et certifiés. Vos données personnelles sont protégées.", link: "#", gradient: 'linear-gradient(135deg, #F39C12, #E67E22)' },
          ].map((feature, index) => (
            <Col md={3} key={index} className="animate-fade-up">
              <Link to={feature.link} className="text-decoration-none">
                <Card className="h-100 border-0 shadow-sm text-center p-4">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                    style={{ width: 60, height: 60, background: feature.gradient, color: 'white' }}>
                    {feature.icon}
                  </div>
                  <Card.Title className="fw-bold text-dark">{feature.title}</Card.Title>
                  <Card.Text className="text-muted" style={{ fontSize: '14px' }}>{feature.desc}</Card.Text>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Comment ça marche */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '60px 0' }}>
        <Container>
          <h2 className="text-center fw-bold mb-5 gradient-text">Comment ça marche ?</h2>
          <Row className="text-center g-4">
            {[
              { step: "1", title: "Recherchez", desc: "Trouvez votre médicament dans notre catalogue ou demandez à l'assistant IA", icon: <FaSearch size={35} />, gradient: 'linear-gradient(135deg, #0B6E4F, #14A76C)' },
              { step: "2", title: "Commandez", desc: "Ajoutez au panier et validez votre commande en quelques clics", icon: <FaPills size={35} />, gradient: 'linear-gradient(135deg, #1B4965, #62B6CB)' },
              { step: "3", title: "Recevez", desc: "Récupérez en pharmacie ou faites-vous livrer à domicile", icon: <FaTruck size={35} />, gradient: 'linear-gradient(135deg, #F39C12, #E67E22)' },
            ].map((s, i) => (
              <Col md={4} key={i} className="animate-fade-up">
                <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: '100px', height: '100px', background: s.gradient, color: 'white', boxShadow: '0 8px 25px rgba(0,0,0,0.12)' }}>
                  {s.icon}
                </div>
                <h5 className="fw-bold">{s.title}</h5>
                <p className="text-muted">{s.desc}</p>
              </Col>
            ))}
          </Row>
        </Container>
      </div>

      {/* CTA */}
      <div style={{ background: 'linear-gradient(135deg, #1B4965, #0B6E4F)', padding: '60px 0', color: 'white' }}>
        <Container className="text-center">
          <FaChartLine size={50} className="mb-3" style={{ opacity: 0.7 }} />
          <h2 className="fw-bold mb-3">Vous êtes pharmacien ?</h2>
          <p className="fs-5 mb-4" style={{ opacity: 0.9 }}>
            Digitalisez votre pharmacie avec PharmaSmart. Gestion de stock, analytics, prédictions IA.
          </p>
          <Link to="/pharmacie">
            <Button variant="light" size="lg" className="fw-bold" style={{ color: '#1B4965' }}>
              Accéder à l'Espace Pharmacie
            </Button>
          </Link>
        </Container>
      </div>

      <Footer />
    </div>
  );
}

export default Accueil;
