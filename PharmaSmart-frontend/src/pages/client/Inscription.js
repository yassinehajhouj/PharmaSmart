import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import authService from '../../services/authService';

function Inscription() {
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    nom: '', 
    prenom: '', 
    username: '',
    email: '', 
    telephone: '', 
    adresse: '', 
    password: '', 
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validation
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    setLoading(true);

    try {
      // Préparer les données pour l'API
      const userData = {
        username: form.username,
        email: form.email,
        password: form.password,
        password2: form.confirmPassword,
        first_name: form.prenom,
        last_name: form.nom,
        telephone: form.telephone,
        user_type: 'PATIENT'
      };

      // Appel à l'API Django
      await authService.register(userData);
      
      setSuccess('Compte créé avec succès ! Redirection vers la connexion...');
      
      // Redirection vers la page de connexion
      setTimeout(() => {
        navigate('/connexion');
      }, 2000);
      
    } catch (err) {
      console.error('Erreur d\'inscription:', err);
      
      if (err.response?.data) {
        // Afficher les erreurs de validation du backend
        const errors = err.response.data;
        const errorMessages = [];
        
        for (const [field, messages] of Object.entries(errors)) {
          if (Array.isArray(messages)) {
            errorMessages.push(`${field}: ${messages.join(', ')}`);
          } else {
            errorMessages.push(`${field}: ${messages}`);
          }
        }
        
        setError(errorMessages.join('\n'));
      } else {
        setError('Erreur lors de l\'inscription. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', padding: '40px 0' }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={6}>
            <div className="text-center mb-4">
              <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-2">
                <img src="/images/logo-pharmasmart-navbar.png" alt="PharmaSmart" style={{ height: '55px', width: 'auto', objectFit: 'contain' }} />
                <h2 className="fw-bold mb-0" style={{ color: '#0B6E4F' }}>PharmaSmart</h2>
              </Link>
              <p className="text-muted mt-2">Créez votre compte patient</p>
            </div>

            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                {/* Messages d'erreur et succès */}
                {error && (
                  <Alert variant="danger" onClose={() => setError('')} dismissible>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '14px' }}>{error}</pre>
                  </Alert>
                )}
                {success && (
                  <Alert variant="success">
                    {success}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Nom</Form.Label>
                        <div className="position-relative">
                          <FaUser className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                          <Form.Control
                            type="text" 
                            placeholder="EZZAOUI"
                            value={form.nom} 
                            onChange={(e) => handleChange('nom', e.target.value)}
                            style={{ paddingLeft: '40px' }} 
                            required
                            disabled={loading}
                          />
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Prénom</Form.Label>
                        <Form.Control
                          type="text" 
                          placeholder="Nasr Eddine"
                          value={form.prenom} 
                          onChange={(e) => handleChange('prenom', e.target.value)}
                          required
                          disabled={loading}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Nom d'utilisateur</Form.Label>
                    <div className="position-relative">
                      <FaUser className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                      <Form.Control
                        type="text" 
                        placeholder="nasr_eddine"
                        value={form.username} 
                        onChange={(e) => handleChange('username', e.target.value)}
                        style={{ paddingLeft: '40px' }} 
                        required
                        disabled={loading}
                      />
                    </div>
                    <Form.Text className="text-muted">
                      Utilisé pour la connexion. Lettres, chiffres et _ uniquement.
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Email</Form.Label>
                    <div className="position-relative">
                      <FaEnvelope className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                      <Form.Control
                        type="email" 
                        placeholder="votre@email.com"
                        value={form.email} 
                        onChange={(e) => handleChange('email', e.target.value)}
                        style={{ paddingLeft: '40px' }} 
                        required
                        disabled={loading}
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Téléphone</Form.Label>
                    <div className="position-relative">
                      <FaPhone className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                      <Form.Control
                        type="tel" 
                        placeholder="+212 6XX-XXXXXX"
                        value={form.telephone} 
                        onChange={(e) => handleChange('telephone', e.target.value)}
                        style={{ paddingLeft: '40px' }} 
                        required
                        disabled={loading}
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Adresse de livraison</Form.Label>
                    <div className="position-relative">
                      <FaMapMarkerAlt className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                      <Form.Control
                        type="text" 
                        placeholder="Rue, Ville, Code postal"
                        value={form.adresse} 
                        onChange={(e) => handleChange('adresse', e.target.value)}
                        style={{ paddingLeft: '40px' }} 
                        required
                        disabled={loading}
                      />
                    </div>
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Mot de passe</Form.Label>
                        <div className="position-relative">
                          <FaLock className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                          <Form.Control
                            type="password" 
                            placeholder="••••••••"
                            value={form.password} 
                            onChange={(e) => handleChange('password', e.target.value)}
                            style={{ paddingLeft: '40px' }} 
                            required 
                            minLength={8}
                            disabled={loading}
                          />
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Confirmer</Form.Label>
                        <Form.Control
                          type="password" 
                          placeholder="••••••••"
                          value={form.confirmPassword} 
                          onChange={(e) => handleChange('confirmPassword', e.target.value)}
                          required 
                          minLength={8}
                          disabled={loading}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Check
                    type="checkbox"
                    label={
                      <span style={{ fontSize: '13px' }}>
                        J'accepte les <button type="button" className="btn btn-link p-0 align-baseline" style={{ color: '#0B6E4F', fontSize: '13px' }}>conditions d'utilisation</button> et la <button type="button" className="btn btn-link p-0 align-baseline" style={{ color: '#0B6E4F', fontSize: '13px' }}>politique de confidentialité</button>
                      </span>
                    }
                    className="mb-3"
                    required
                    disabled={loading}
                  />

                  <Button 
                    type="submit" 
                    className="w-100 fw-bold" 
                    size="lg"
                    style={{ backgroundColor: '#0B6E4F', border: 'none' }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Création en cours...
                      </>
                    ) : (
                      'Créer mon compte'
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            <p className="text-center mt-3" style={{ fontSize: '14px' }}>
              Déjà inscrit ?{' '}
              <Link to="/connexion" className="fw-bold text-decoration-none" style={{ color: '#0B6E4F' }}>
                Se connecter
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

export default Inscription;
