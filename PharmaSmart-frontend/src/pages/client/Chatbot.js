import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import { FaPaperPlane, FaRobot } from 'react-icons/fa';

import NavbarClient from '../../components/NavbarClient';
import aiService from '../../services/aiService';
import authService from '../../services/authService';

function Chatbot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Bonjour ! Je suis l'assistant PharmaSmart. Je peux vous aider a resumer un prospectus ou a comprendre un medicament.",
      options: [
       
        'Comprendre un medicament',
        'Resumer un prospectus de medicament',
       
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [awaitingProspectusName, setAwaitingProspectusName] = useState(false);
  const [prospectusMode, setProspectusMode] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  const newConversation = () => {
    setConversationId(null);
    setError('');
    setAwaitingProspectusName(false);
    setProspectusMode(false);
    setMessages([
      {
        id: 1,
        type: 'bot',
        text: 'Bonjour ! Comment puis-je vous aider ?',
        options: [
          'Trouver un medicament',
          'Resumer un prospectus de medicament',
          'Comprendre un medicament'
        ]
      }
    ]);
  };

  const getLocalResponse = (message, forceProspectus = false) => {
    const msg = message.toLowerCase();

    if (
      forceProspectus ||
      msg.includes('prospectus') ||
      msg.includes('notice') ||
      msg.includes('resume') ||
      msg.includes('resumer') ||
      msg.includes('résume') ||
      msg.includes('résumer')
    ) {
      return {
        text: "Le service de resume des prospectus est momentanement indisponible. Reessayez dans quelques instants.",
        suggestions: []
      };
    }

    if (msg.includes('mal') && msg.includes('tete')) {
      return {
        text: 'Pour les maux de tete :',
        suggestions: [
          { nom: 'Doliprane 500mg', prix: '25 MAD', desc: 'Antalgique' },
          { nom: 'Ibuprofene 400mg', prix: '18 MAD', desc: 'Anti-inflammatoire' }
        ]
      };
    }

    if (msg.includes('fievre') || msg.includes('fièvre')) {
      return {
        text: 'Pour la fievre :',
        suggestions: [
          { nom: 'Doliprane', prix: '25 MAD', desc: 'Paracetamol' }
        ]
      };
    }

    return {
      text: 'Je peux vous aider a trouver un medicament ou a resumer un prospectus.',
      suggestions: []
    };
  };

  const envoyerMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const normalizedText = messageText.toLowerCase();
    const compactText = messageText.trim();
    const wordCount = compactText.split(/\s+/).filter(Boolean).length;
    const containsProspectusKeyword =
      normalizedText.includes('prospectus') ||
      normalizedText.includes('notice') ||
      normalizedText.includes('resume') ||
      normalizedText.includes('resumer') ||
      normalizedText.includes('résume') ||
      normalizedText.includes('résumer');
    const isProspectus = awaitingProspectusName || prospectusMode || containsProspectusKeyword;
    const explicitMedicament =
      isProspectus && !containsProspectusKeyword
        ? compactText
        : (awaitingProspectusName || wordCount <= 3 ? compactText : null);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: messageText
    };

    setInput('');
    setError('');
    setIsTyping(true);
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await aiService.sendMessage({
        message: messageText,
        medicament: explicitMedicament,
        intent: isProspectus ? 'PROSPECTUS' : 'GENERAL',
        conversation_id: conversationId || undefined
      });

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      const aiText = response.ai_response || '';
      const normalizedAiText = aiText.toLowerCase();
      const stillWaitingForName =
        normalizedAiText.includes('preciser le nom du medicament') ||
        normalizedAiText.includes('veuillez preciser le nom du medicament');
      setAwaitingProspectusName(stillWaitingForName);
      setProspectusMode(
        containsProspectusKeyword ||
        isProspectus ||
        normalizedAiText.startsWith('prospectus -') ||
        stillWaitingForName
      );

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'bot',
          text: aiText
        }
      ]);
    } catch (err) {
      console.error(err);
      const fallback = getLocalResponse(messageText, isProspectus);
      setAwaitingProspectusName(
        fallback.text.toLowerCase().includes('preciser le nom du medicament')
      );
      setProspectusMode(isProspectus);
      setError("Le service IA est temporairement indisponible. Une reponse locale a ete affichee.");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'bot',
          text: fallback.text,
          suggestions: fallback.suggestions
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    envoyerMessage();
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavbarClient />

      <Container fluid className="flex-grow-1 py-3" style={{ backgroundColor: '#f0f2f5' }}>
        <Row className="h-100 justify-content-center">
          <Col md={8} className="d-flex flex-column">
            <Card className="flex-grow-1 d-flex flex-column shadow-sm">
              <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <FaRobot color="#0B6E4F" />
                  <strong>Assistant PharmaSmart</strong>
                </div>

                {isAuthenticated && (
                  <Button size="sm" variant="outline-secondary" onClick={newConversation}>
                    Nouvelle conversation
                  </Button>
                )}
              </Card.Header>

              <Card.Body className="overflow-auto" style={{ background: '#f8f9fa' }}>
                {error && (
                  <Alert variant="warning" className="mb-3">
                    {error}
                  </Alert>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-3 d-flex ${msg.type === 'user' ? 'justify-content-end' : ''}`}
                  >
                    <div
                      className={`p-3 rounded ${msg.type === 'user' ? 'bg-success text-white' : 'bg-white'}`}
                      style={{ maxWidth: '75%' }}
                    >
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>
                        {msg.text}
                      </pre>

                      {msg.options?.length > 0 && (
                        <div className="mt-2">
                          {msg.options.map((option, index) => (
                            <Button
                              key={`${msg.id}-${index}`}
                              variant="outline-success"
                              size="sm"
                              className="me-2 mb-2"
                              onClick={() => envoyerMessage(option)}
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                      )}

                      {msg.suggestions?.map((suggestion, index) => (
                        <div key={index} className="mt-2 p-2 border rounded">
                          <strong>{suggestion.nom}</strong> - {suggestion.prix}
                          <div style={{ fontSize: '12px' }}>{suggestion.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {isTyping && <div className="text-muted">Assistant ecrit...</div>}

                <div ref={messagesEndRef} />
              </Card.Body>

              <Card.Footer>
                <Form onSubmit={handleSubmit} className="d-flex gap-2">
                  <Form.Control
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Posez votre question..."
                  />
                  <Button type="submit" style={{ background: '#0B6E4F', borderColor: '#0B6E4F' }}>
                    <FaPaperPlane />
                  </Button>
                </Form>
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Chatbot;