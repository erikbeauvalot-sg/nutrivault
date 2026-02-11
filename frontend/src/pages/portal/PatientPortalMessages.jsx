/**
 * Patient Portal Messages Page
 * Patient's messaging with their dietitian(s).
 * Conversations listed, click to open thread. Polls every 12s.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Form, Button, Spinner, Badge, ListGroup, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiMessageSquare, FiSend, FiUser, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import * as portalMessageService from '../../services/portalMessageService';
import PullToRefreshWrapper from '../../components/common/PullToRefreshWrapper';

const POLL_INTERVAL = 12000;

const PatientPortalMessages = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await portalMessageService.getConversations();
      setConversations(data);
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadConversations();
      setLoading(false);
    };
    init();
  }, [loadConversations]);

  // Poll
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      await loadConversations();
      if (activeConvo) {
        try {
          const msgs = await portalMessageService.getMessages(activeConvo.id);
          setMessages(msgs);
        } catch {}
      }
    }, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [activeConvo, loadConversations]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const openConversation = async (convo) => {
    setActiveConvo(convo);
    setLoadingMessages(true);
    try {
      const msgs = await portalMessageService.getMessages(convo.id);
      setMessages(msgs);
      await loadConversations();
      setTimeout(scrollToBottom, 100);
    } catch {
      toast.error(t('messages.loadError', 'Erreur de chargement'));
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo) return;

    setSending(true);
    try {
      const msg = await portalMessageService.sendMessage(activeConvo.id, newMessage.trim());
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      await loadConversations();
      setTimeout(scrollToBottom, 100);
    } catch {
      toast.error(t('messages.sendError', 'Erreur lors de l\'envoi'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  // Mobile: show either list or thread (not both)
  if (activeConvo) {
    return (
      <PullToRefreshWrapper onRefresh={() => openConversation(activeConvo)}>
        <div className="d-flex flex-column" style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
          {/* Header */}
          <div className="d-flex align-items-center gap-2 mb-2">
            <Button variant="link" className="p-0 text-dark" onClick={() => setActiveConvo(null)}>
              <FiArrowLeft size={20} />
            </Button>
            <strong>
              {activeConvo.dietitian?.first_name} {activeConvo.dietitian?.last_name}
            </strong>
          </div>

          {/* Messages */}
          <Card className="flex-grow-1 d-flex flex-column" style={{ overflow: 'hidden' }}>
            <Card.Body className="flex-grow-1 p-3" style={{ overflowY: 'auto' }}>
              {loadingMessages ? (
                <div className="text-center py-4"><Spinner size="sm" animation="border" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted py-4">
                  {t('messages.noMessages', 'Aucun message. Commencez la conversation !')}
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === user?.id || msg.sender?.id === user?.id;
                  return (
                    <div key={msg.id} className={`d-flex mb-2 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                      <div
                        style={{
                          maxWidth: '80%',
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
        </div>
      </PullToRefreshWrapper>
    );
  }

  // Conversation list
  return (
    <PullToRefreshWrapper onRefresh={loadConversations}>
      <h2 className="mb-3" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }}>
        <FiMessageSquare className="me-2" />
        {t('messages.title', 'Messages')}
      </h2>

      {conversations.length === 0 ? (
        <Card>
          <Card.Body className="text-center text-muted py-5">
            <FiMessageSquare size={40} className="mb-3 opacity-25" />
            <p className="mb-0">{t('messages.noConversations', 'Aucune conversation')}</p>
            <small>{t('messages.patientNoConvoHint', 'Votre dieteticien(ne) doit initier la conversation')}</small>
          </Card.Body>
        </Card>
      ) : (
        <ListGroup>
          {conversations.map(c => (
            <ListGroup.Item
              key={c.id}
              action
              onClick={() => openConversation(c)}
              className="d-flex align-items-center gap-3 py-3"
            >
              <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44 }}>
                <FiUser size={20} className="text-primary" />
              </div>
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-center">
                  <strong>{c.dietitian?.first_name} {c.dietitian?.last_name}</strong>
                  {c.patient_unread_count > 0 && (
                    <Badge bg="danger" pill>{c.patient_unread_count}</Badge>
                  )}
                </div>
                {c.last_message_preview && (
                  <small className="text-muted d-block text-truncate">{c.last_message_preview}</small>
                )}
                {c.last_message_at && (
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {new Date(c.last_message_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </small>
                )}
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </PullToRefreshWrapper>
  );
};

export default PatientPortalMessages;
