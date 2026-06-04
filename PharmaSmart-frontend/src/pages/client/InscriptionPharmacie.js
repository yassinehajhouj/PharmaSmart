import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaMapMarkerAlt, FaStore, FaIdCard, FaCheckCircle } from 'react-icons/fa';
import api from '../../services/api';

function InscriptionPharmacie() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    // Infos utilisateur
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    telephone: '',
    password: '',
    confirmPassword: '',
    // Infos pharmacie
    nomPharmacie: '',
    adressePharmacie: '',
    ville: '',
    codePostal: '',
    telephonePharmacie: '',
    numeroLicence: '',
    description: ''
  });
  
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
    setError('');

    try {
      // Créer le compte pharmacien
      const registerData = {
        username: form.username,
        email: form.email,
        password: form.password,
        password2: form.confirmPassword,
        first_name: form.first_name,
        last_name: form.last_name,
        telephone: form.telephone,
        user_type: 'PHARMACIEN',
        // Données pharmacie (seront traitées par le backend)
        pharmacie_data: {
          nom: form.nomPharmacie,
          adresse: form.adressePharmacie,
          ville: form.ville,
          code_postal: form.codePostal,
          telephone: form.telephonePharmacie,
          numero_licence: form.numeroLicence,
          description: form.description
        }
      };

      await api.post('/auth/register/', registerData);
      setSubmitted(true);

    } catch (err) {
      console.error('Erreur inscription:', err);
      if (err.response?.data) {
        const errors = err.response.data;
        if (typeof errors === 'object') {
          const firstKey = Object.keys(errors)[0];
          const firstError = errors[firstKey];
          setError(`${firstKey}: ${Array.isArray(firstError) ? firstError[0] : firstError}`);
        } else {
          setError(errors);
        }
      } else {
        setError('Erreur lors de l\'inscription. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Écran de succès
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', padding: '40px 0' }}>
        <Container>
          <Row className="justify-content-center">
            <Col md={6}>
              <Card className="border-0 shadow-sm text-center p-5">
                <div style={{ fontSize: '60px', color: '#0B6E4F', marginBottom: '20px' }}>
                  <FaCheckCircle />
                </div>
                <h3 className="fw-bold mb-3" style={{ color: '#1B4965' }}>Inscription réussie !</h3>
                <p className="text-muted mb-4" style={{ fontSize: '15px', lineHeight: '1.7' }}>
                  Votre compte pharmacien a été créé avec succès.
                  Vous pouvez maintenant vous connecter à votre espace pharmacie.
                </p>
                <div className="p-3 rounded mb-4" style={{ backgroundColor: '#f0f7ff', border: '1px solid #d0e3f7' }}>
                  <p className="mb-1 fw-bold" style={{ color: '#1B4965', fontSize: '14px' }}>Vos identifiants :</p>
                  <p className="mb-0 text-muted" style={{ fontSize: '13px' }}>
                    Nom d'utilisateur : <strong>{form.username}</strong>
                  </p>
                  <p className="mb-0 text-muted" style={{ fontSize: '13px' }}>
                    Email : <strong>{form.email}</strong>
                  </p>
                </div>
                <Link to="/connexion">
                  <Button style={{ backgroundColor: '#1B4965', border: 'none' }} size="lg" className="fw-bold px-5">
                    Se connecter
                  </Button>
                </Link>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', padding: '40px 0' }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={7}>
            {/* Logo */}
            <div className="text-center mb-4">
              <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-2">
                <img src="/images/logo-pharmasmart-navbar.png" alt="PharmaSmart" style={{ height: '55px', width: 'auto', objectFit: 'contain' }} />
                <h2 className="fw-bold mb-0" style={{ color: '#1B4965' }}>PharmaSmart</h2>
              </Link>
              <p className="text-muted mt-2">Inscription — Espace Pharmacie</p>
            </div>

            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                {error && (
                  <Alert variant="danger" onClose={() => setError('')} dismissible>
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  {/* Section: Identité */}
                  <div className="mb-3 pb-2 border-bottom">
                    <h6 className="fw-bold d-flex align-items-center gap-2" style={{ color: '#1B4965' }}>
                      <FaUser /> Informations personnelles
                    </h6>
                  </div>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Prénom *</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Votre prénom"
                          value={form.first_name}
                          onChange={(e) => handleChange('first_name', e.target.value)}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Nom *</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Votre nom"
                          value={form.last_name}
                          onChange={(e) => handleChange('last_name', e.target.value)}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Nom d'utilisateur *</Form.Label>
                    <div className="position-relative">
                      <FaUser className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                      <Form.Control
                        type="text"
                        placeholder="pharmacien_exemple"
                        value={form.username}
                        onChange={(e) => handleChange('username', e.target.value)}
                        style={{ paddingLeft: '40px' }}
                        required
                      />
                    </div>
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Email *</Form.Label>
                        <div className="position-relative">
                          <FaEnvelope className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                          <Form.Control
                            type="email"
                            placeholder="email@pharmacie.ma"
                            value={form.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            style={{ paddingLeft: '40px' }}
                            required
                          />
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
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
                          />
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Section: Pharmacie */}
                  <div className="mb-3 mt-4 pb-2 border-bottom">
                    <h6 className="fw-bold d-flex align-items-center gap-2" style={{ color: '#1B4965' }}>
                      <FaStore /> Informations de la pharmacie
                    </h6>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Nom de la pharmacie *</Form.Label>
                    <div className="position-relative">
                      <FaStore className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                      <Form.Control
                        type="text"
                        placeholder="Pharmacie El Amal"
                        value={form.nomPharmacie}
                        onChange={(e) => handleChange('nomPharmacie', e.target.value)}
                        style={{ paddingLeft: '40px' }}
                        required
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>N° de licence *</Form.Label>
                    <div className="position-relative">
                      <FaIdCard className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                      <Form.Control
                        type="text"
                        placeholder="PHARM-XXXX-XXXX"
                        value={form.numeroLicence}
                        onChange={(e) => handleChange('numeroLicence', e.target.value)}
                        style={{ paddingLeft: '40px' }}
                        required
                      />
                    </div>
                  </Form.Group>

                  <Row>
                    <Col md={8}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Adresse *</Form.Label>
                        <div className="position-relative">
                          <FaMapMarkerAlt className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                          <Form.Control
                            type="text"
                            placeholder="Rue, Quartier"
                            value={form.adressePharmacie}
                            onChange={(e) => handleChange('adressePharmacie', e.target.value)}
                            style={{ paddingLeft: '40px' }}
                            required
                          />
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Code postal</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="20000"
                          value={form.codePostal}
                          onChange={(e) => handleChange('codePostal', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Ville *</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Casablanca"
                          value={form.ville}
                          onChange={(e) => handleChange('ville', e.target.value)}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Tél. pharmacie</Form.Label>
                        <Form.Control
                          type="tel"
                          placeholder="+212 5XX-XXXXXX"
                          value={form.telephonePharmacie}
                          onChange={(e) => handleChange('telephonePharmacie', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Décrivez votre pharmacie (services, spécialités...)"
                      value={form.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                    />
                  </Form.Group>

                  {/* Section: Mot de passe */}
                  <div className="mb-3 mt-4 pb-2 border-bottom">
                    <h6 className="fw-bold d-flex align-items-center gap-2" style={{ color: '#1B4965' }}>
                      <FaLock /> Mot de passe
                    </h6>
                  </div>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Mot de passe *</Form.Label>
                        <div className="position-relative">
                          <FaLock className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                          <Form.Control
                            type="password"
                            placeholder="Min. 8 caractères"
                            value={form.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            style={{ paddingLeft: '40px' }}
                            required
                            minLength={8}
                          />
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>Confirmer *</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="Confirmez le mot de passe"
                          value={form.confirmPassword}
                          onChange={(e) => handleChange('confirmPassword', e.target.value)}
                          required
                          minLength={8}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Check
                    type="checkbox"
                    label={
                      <span style={{ fontSize: '13px' }}>
                        J'accepte les{' '}
                        <Link to="#" style={{ color: '#1B4965' }}>conditions d'utilisation</Link> de PharmaSmart
                      </span>
                    }
                    className="mb-3"
                    required
                  />

                  <Button
                    type="submit"
                    className="w-100 fw-bold"
                    size="lg"
                    style={{ backgroundColor: '#1B4965', border: 'none' }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Inscription en cours...
                      </>
                    ) : (
                      "Créer mon compte pharmacie"
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            <p className="text-center mt-3" style={{ fontSize: '14px' }}>
              Déjà un compte ?{' '}
              <Link to="/connexion" className="fw-bold text-decoration-none" style={{ color: '#1B4965' }}>
                Se connecter
              </Link>
              {' | '}
              <Link to="/inscription" className="text-decoration-none" style={{ color: '#0B6E4F' }}>
                Inscription patient
              </Link>
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default InscriptionPharmacie;
