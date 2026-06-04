import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaUser, FaLock, FaGoogle, FaFacebook } from 'react-icons/fa';
import authService from '../../services/authService';

function Connexion() {
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const userType = role === 'pharmacien' ? 'PHARMACIEN' : 'PATIENT';
      const user = await authService.login(username, password, userType);

      setSuccess('Connexion réussie ! Redirection...');

      setTimeout(() => {
        if (user.user_type === 'PHARMACIEN' || user.user_type === 'PERSONNEL') {
          navigate('/pharmacie');
        } else {
          navigate('/');
        }
      }, 1500);

    } catch (err) {
      const msg = err.message || 'Erreur de connexion. Veuillez réessayer.';
      // Provide a friendlier message for the pending-approval case
      if (msg.toLowerCase().includes('attente') || msg.toLowerCase().includes('approbation')) {
        setError('Votre compte pharmacie est en attente d\'approbation par l\'administrateur. Vous recevrez une notification dès que votre compte sera activé.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center' }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={5}>
            {/* Logo */}
            <div className="text-center mb-4">
              <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-2">
                <img src="/images/logo-pharmasmart-navbar.png" alt="PharmaSmart" style={{ height: '55px', width: 'auto', objectFit: 'contain' }} />
                <h2 className="fw-bold mb-0" style={{ color: '#0B6E4F' }}>PharmaSmart</h2>
              </Link>
              <p className="text-muted mt-2">Connectez-vous à votre compte</p>
            </div>

            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                {/* Messages d'erreur et succès */}
                {error && (
                  <Alert variant="danger" onClose={() => setError('')} dismissible>
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert variant="success">
                    {success}
                  </Alert>
                )}

                {/* Role selector */}
                <div className="d-flex mb-4 rounded overflow-hidden" style={{ border: '2px solid #0B6E4F' }}>
                  <button
                    type="button"
                    className="flex-fill py-2 border-0 fw-bold"
                    style={{
                      backgroundColor: role === 'client' ? '#0B6E4F' : 'white',
                      color: role === 'client' ? 'white' : '#0B6E4F',
                    }}
                    onClick={() => setRole('client')}
                  >
                    👤 Patient
                  </button>
                  <button
                    type="button"
                    className="flex-fill py-2 border-0 fw-bold"
                    style={{
                      backgroundColor: role === 'pharmacien' ? '#1B4965' : 'white',
                      color: role === 'pharmacien' ? 'white' : '#1B4965',
                    }}
                    onClick={() => setRole('pharmacien')}
                  >
                    💊 Pharmacien
                  </button>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Nom d'utilisateur</Form.Label>
                    <div className="position-relative">
                      <FaUser className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                      <Form.Control
                        type="text"
                        placeholder="Votre nom d'utilisateur"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                        required
                        disabled={loading}
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <div className="d-flex justify-content-between">
                      <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Mot de passe</Form.Label>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none"
                        style={{ fontSize: '13px', color: '#0B6E4F' }}
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="position-relative">
                      <FaLock className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                      <Form.Control
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                        required
                        disabled={loading}
                      />
                    </div>
                  </Form.Group>

                  <Form.Check
                    type="checkbox"
                    label="Se souvenir de moi"
                    className="mb-3"
                    style={{ fontSize: '14px' }}
                  />

                  <Button
                    type="submit"
                    className="w-100 fw-bold mb-3"
                    size="lg"
                    style={{
                      backgroundColor: role === 'client' ? '#0B6E4F' : '#1B4965',
                      border: 'none'
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Connexion en cours...
                      </>
                    ) : (
                      'Se connecter'
                    )}
                  </Button>
                </Form>

                {role === 'client' && (
                  <>
                    <div className="text-center text-muted my-3" style={{ fontSize: '13px' }}>
                      — ou connectez-vous avec —
                    </div>

                    <div className="d-flex gap-2">
                      <Button variant="outline-danger" className="flex-fill" disabled={loading}>
                        <FaGoogle className="me-2" /> Google
                      </Button>
                      <Button variant="outline-primary" className="flex-fill" disabled={loading}>
                        <FaFacebook className="me-2" /> Facebook
                      </Button>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>

            <p className="text-center mt-3" style={{ fontSize: '14px' }}>
              Pas encore de compte ?{' '}
              <Link
                to={role === 'pharmacien' ? '/inscription-pharmacie' : '/inscription'}
                className="fw-bold text-decoration-none"
                style={{ color: role === 'pharmacien' ? '#1B4965' : '#0B6E4F' }}
              >
                S'inscrire
              </Link>
            </p>

            <p className="text-center mt-2">
              <Link to="/" className="text-muted text-decoration-none" style={{ fontSize: '13px' }}>
                ← Retour à l'accueil
              </Link>
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Connexion;
