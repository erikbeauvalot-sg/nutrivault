/**
 * MessagesPage (Dietitian side)
 * Conversation list + message thread in a split layout.
 * Polls for new messages every 12 seconds.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Row, Col, Card, Form, Button, Spinner, Badge, ListGroup, InputGroup, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiMessageSquare, FiSend, FiUser, FiSearch, FiPlus } from 'react-icons/fi';
import { toast } from 'react-toastify';
import * as messageService from '../services/messageService';
import * as patientService from '../services/patientService';
import Layout from '../components/layout/Layout';

const POLL_INTERVAL = 12000;

const MessagesPage = () => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pollRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  // New conversation modal state
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [creatingConvo, setCreatingConvo] = useState(false);
  const searchTimeout = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await messageService.getConversations();
      setConversations(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadConversations();
      setLoading(false);
    };
    init();
  }, [loadConversations]);

  // Poll for new messages
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      await loadConversations();
      if (activeConvo) {
        try {
          const msgs = await messageService.getMessages(activeConvo.id);
          setMessages(msgs);
        } catch {}
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollRef.current);
  }, [activeConvo, loadConversations]);

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Auto-scroll when new messages arrive (polling or send)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      setTimeout(() => scrollToBottom(), 50);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, scrollToBottom]);

  const openConversation = async (convo) => {
    setActiveConvo(convo);
    setLoadingMessages(true);
    try {
      const msgs = await messageService.getMessages(convo.id);
      setMessages(msgs);
      // Refresh conversations to clear unread count
      await loadConversations();
      setTimeout(scrollToBottom, 100);
    } catch {
      toast.error(t('messages.loadError', 'Failed to load messages'));
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo) return;

    setSending(true);
    try {
      const msg = await messageService.sendMessage(activeConvo.id, newMessage.trim());
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      await loadConversations();
      setTimeout(scrollToBottom, 100);
    } catch {
      toast.error(t('messages.sendError', 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  // Patient search for new conversation
  const handlePatientSearch = (value) => {
    setPatientSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      setPatientResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const result = await patientService.getPatients({ search: value.trim(), limit: 10 });
        setPatientResults(result.data || []);
      } catch {
        setPatientResults([]);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
  };

  const handleStartConversation = async (patient) => {
    setCreatingConvo(true);
    try {
      const convo = await messageService.createConversation(patient.id);
      await loadConversations();
      setShowNewConvo(false);
      setPatientSearch('');
      setPatientResults([]);
      openConversation(convo);
    } catch {
      toast.error(t('messages.createError', 'Erreur lors de la cr\u00e9ation de la conversation'));
    } finally {
      setCreatingConvo(false);
    }
  };

  const filteredConvos = conversations.filter(c => {
    if (!search) return true;
    const name = `${c.patient?.first_name} ${c.patient?.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-5"><Spinner animation="border" /></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="d-flex align-items-center mb-3 gap-2">
        <FiMessageSquare size={24} />
        <h2 className="mb-0" style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}>
          {t('messages.title', 'Messages')}
        </h2>
        <Button
          variant="primary"
          size="sm"
          className="ms-auto"
          onClick={() => setShowNewConvo(true)}
        >
          <FiPlus className="me-1" />
          {t('messages.newConversation', 'Nouvelle conversation')}
        </Button>
      </div>

      <Row style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
        {/* Conversation list */}
        <Col md={4} className="d-flex flex-column" style={{ height: '100%' }}>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text><FiSearch size={14} /></InputGroup.Text>
            <Form.Control
              placeholder={t('messages.searchPatients', 'Chercher un patient...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </InputGroup>
          <Card className="flex-grow-1" style={{ overflow: 'hidden' }}>
            <ListGroup variant="flush" style={{ overflowY: 'auto', maxHeight: '100%' }}>
              {filteredConvos.length === 0 && (
                <ListGroup.Item className="text-muted text-center py-4">
                  <FiMessageSquare size={32} className="mb-2 opacity-25 d-block mx-auto" />
                  {conversations.length === 0
                    ? t('messages.noConversations', 'Aucune conversation')
                    : t('messages.noResults', 'Aucun r\u00e9sultat')
                  }
                </ListGroup.Item>
              )}
              {filteredConvos.map(c => (
                <ListGroup.Item
                  key={c.id}
                  action
                  active={activeConvo?.id === c.id}
                  onClick={() => openConversation(c)}
                  className="d-flex align-items-start gap-2 py-2"
                >
                  <div className="rounded-circle bg-secondary bg-opacity-25 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 36, height: 36 }}>
                    <FiUser size={16} />
                  </div>
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex justify-content-between align-items-center">
                      <strong style={{ fontSize: '0.85rem' }}>
                        {c.patient?.first_name} {c.patient?.last_name}
                      </strong>
                      {c.dietitian_unread_count > 0 && (
                        <Badge bg="danger" pill style={{ fontSize: '0.7rem' }}>
                          {c.dietitian_unread_count}
                        </Badge>
                      )}
                    </div>
                    {c.last_message_preview && (
                      <small className="text-muted d-block text-truncate" style={{ fontSize: '0.75rem' }}>
                        {c.last_message_preview}
                      </small>
                    )}
                    {c.last_message_at && (
                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {new Date(c.last_message_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </small>
                    )}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>

        {/* Message thread */}
        <Col md={8} className="d-flex flex-column" style={{ height: '100%' }}>
          {!activeConvo ? (
            <Card className="flex-grow-1 d-flex align-items-center justify-content-center">
              <div className="text-center text-muted py-5">
                <FiMessageSquare size={48} className="mb-3 opacity-25" />
                <p>{t('messages.selectConversation', 'S\u00e9lectionnez une conversation ou cr\u00e9ez-en une nouvelle')}</p>
              </div>
            </Card>
          ) : (
            <Card className="flex-grow-1 d-flex flex-column" style={{ overflow: 'hidden' }}>
              {/* Thread header */}
              <Card.Header className="py-2">
                <strong>{activeConvo.patient?.first_name} {activeConvo.patient?.last_name}</strong>
                {activeConvo.patient?.email && (
                  <small className="text-muted ms-2">{activeConvo.patient.email}</small>
                )}
              </Card.Header>

              {/* Messages */}
              <Card.Body ref={messagesContainerRef} className="flex-grow-1 p-3" style={{ overflowY: 'auto' }}>
                {loadingMessages ? (
                  <div className="text-center py-4"><Spinner size="sm" animation="border" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    {t('messages.noMessages', 'Aucun message. Envoyez le premier !')}
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === activeConvo.dietitian?.id || msg.sender?.id === activeConvo.dietitian?.id;
                    return (
                      <div key={msg.id} className={`d-flex mb-2 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                        <div
                          style={{
                            maxWidth: '75%',
                            padding: '8px 14px',
                            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: isMe ? 'var(--bs-primary, #4a9d6e)' : '#f0f0f0',
                            color: isMe ? '#fff' : '#333',
                            fontSize: '0.88rem',
                          }}
                        >
                          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                          <div style={{ fontSize: '0.65rem', opacity: 0.7, textAlign: 'right', marginTop: 2 }}>
                            {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Card.Body>

              {/* Input */}
              <Card.Footer className="p-2">
                <Form onSubmit={handleSend}>
                  <InputGroup>
                    <Form.Control
                      placeholder={t('messages.typePlaceholder', 'Votre message...')}
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      maxLength={5000}
                      disabled={sending}
                    />
                    <Button type="submit" variant="primary" disabled={sending || !newMessage.trim()}>
                      {sending ? <Spinner size="sm" animation="border" /> : <FiSend />}
                    </Button>
                  </InputGroup>
                </Form>
              </Card.Footer>
            </Card>
          )}
        </Col>
      </Row>

      {/* New Conversation Modal */}
      <Modal show={showNewConvo} onHide={() => { setShowNewConvo(false); setPatientSearch(''); setPatientResults([]); }} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1.1rem' }}>
            {t('messages.newConversation', 'Nouvelle conversation')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            placeholder={t('messages.searchPatientName', 'Nom du patient...')}
            value={patientSearch}
            onChange={e => handlePatientSearch(e.target.value)}
            autoFocus
          />
          {searchingPatients && (
            <div className="text-center py-3"><Spinner size="sm" animation="border" /></div>
          )}
          {!searchingPatients && patientResults.length > 0 && (
            <ListGroup className="mt-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {patientResults.map(p => {
                const hasConvo = conversations.some(c => c.patient?.id === p.id);
                return (
                  <ListGroup.Item
                    key={p.id}
                    action
                    disabled={creatingConvo}
                    onClick={() => !creatingConvo && handleStartConversation(p)}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <strong>{p.first_name} {p.last_name}</strong>
                      {p.email && <small className="text-muted ms-2">{p.email}</small>}
                    </div>
                    {hasConvo && (
                      <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>
                        {t('messages.existingConvo', 'D\u00e9j\u00e0 existante')}
                      </Badge>
                    )}
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          )}
          {!searchingPatients && patientSearch.trim() && patientResults.length === 0 && (
            <p className="text-muted text-center mt-3 mb-0">
              {t('messages.noPatientFound', 'Aucun patient trouv\u00e9')}
            </p>
          )}
        </Modal.Body>
      </Modal>
    </Layout>
  );
};

export default MessagesPage;
