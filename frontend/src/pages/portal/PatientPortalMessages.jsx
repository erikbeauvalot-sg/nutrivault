/**
 * Patient Portal Messages Page
 * Patient's messaging with their dietitian(s).
 * Conversations listed, click to open thread. Polls every 12s.
 * Patient can start a new conversation with any linked dietitian.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Form, Button, Spinner, Badge, ListGroup, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiMessageSquare, FiSend, FiUser, FiArrowLeft, FiPlus, FiLock, FiUnlock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import * as portalMessageService from '../../services/portalMessageService';
import * as portalService from '../../services/portalService';
import PullToRefreshWrapper from '../../components/common/PullToRefreshWrapper';
import { isNative } from '../../utils/platform';
import MessageBubble from '../../components/messages/MessageBubble';
import EditMessageModal from '../../components/messages/EditMessageModal';
import DateSeparator from '../../components/messages/DateSeparator';

const POLL_INTERVAL = 12000;
const EDIT_WINDOW_HOURS = 24;

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
  const messagesContainerRef = useRef(null);
  const pollRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  // Edit
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Track keyboard open/close on iOS native via Capacitor Keyboard plugin
  useEffect(() => {
    if (!isNative) return;
    let showListener = null;
    let hideListener = null;

    const setup = async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        showListener = await Keyboard.addListener('keyboardWillShow', (info) => {
          setKeyboardHeight(info.keyboardHeight || 300);
        });
        hideListener = await Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardHeight(0);
        });
      } catch {}
    };
    setup();

    return () => {
      showListener?.remove?.();
      hideListener?.remove?.();
    };
  }, []);

  // New conversation state
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [dietitians, setDietitians] = useState([]);
  const [loadingDietitians, setLoadingDietitians] = useState(false);
  const [creatingConvo, setCreatingConvo] = useState(false);

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
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Scroll to bottom when keyboard opens
  useEffect(() => {
    if (keyboardHeight > 0 && activeConvo) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [keyboardHeight, activeConvo, scrollToBottom]);

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
      toast.error(t('messages.sendError', "Erreur lors de l'envoi"));
    } finally {
      setSending(false);
    }
  };

  // Edit message
  const handleEditMessage = (msg) => {
    setEditingMessage(msg);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (messageId, content) => {
    try {
      const updated = await portalMessageService.editMessage(messageId, content);
      setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
      toast.success(t('messages.messageEdited', 'Message modifié'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('messages.editError', 'Erreur lors de la modification'));
      throw err;
    }
  };

  // Delete message
  const handleDeleteMessage = async (msg) => {
    if (!window.confirm(t('messages.deleteConfirm', 'Supprimer ce message ?'))) return;
    try {
      await portalMessageService.deleteMessage(msg.id);
      // If sender, remove from list; if received, also remove from view
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      toast.success(t('messages.messageDeleted', 'Message supprimé'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('messages.deleteError', 'Erreur lors de la suppression'));
    }
  };

  // Close/reopen conversation
  const toggleConversationStatus = async () => {
    const newStatus = activeConvo?.status === 'closed' ? 'open' : 'closed';
    try {
      const updated = await portalMessageService.updateConversation(activeConvo.id, { status: newStatus });
      setActiveConvo(prev => ({ ...prev, ...updated }));
      await loadConversations();
    } catch {
      toast.error(t('messages.statusError', 'Erreur'));
    }
  };

  const canEditMsg = (msg) => {
    if (msg.sender_id !== user?.id && msg.sender?.id !== user?.id) return false;
    const hours = (Date.now() - new Date(msg.created_at).getTime()) / (1000 * 60 * 60);
    return hours <= EDIT_WINDOW_HOURS;
  };

  // Patient can delete their own messages (24h) or hide received messages (no limit)
  const canDeleteMsg = () => true;

  const handleNewConversation = async () => {
    setShowNewConvo(true);
    setLoadingDietitians(true);
    try {
      const data = await portalService.getMyDietitians();
      setDietitians(Array.isArray(data) ? data : []);
    } catch {
      setDietitians([]);
    } finally {
      setLoadingDietitians(false);
    }
  };

  const handleStartConversation = async (dietitianId) => {
    setCreatingConvo(true);
    try {
      const convo = await portalMessageService.createConversation(dietitianId);
      await loadConversations();
      setShowNewConvo(false);
      openConversation(convo);
    } catch {
      toast.error(t('messages.createError', 'Erreur lors de la création'));
    } finally {
      setCreatingConvo(false);
    }
  };

  // Group messages by date for separators
  const renderMessagesWithSeparators = () => {
    const elements = [];
    let lastDate = null;
    messages.forEach(msg => {
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== lastDate) {
        elements.push(<DateSeparator key={`sep-${msgDate}`} date={msg.created_at} />);
        lastDate = msgDate;
      }
      const isMe = msg.sender_id === user?.id || msg.sender?.id === user?.id;
      elements.push(
        <MessageBubble
          key={msg.id}
          msg={msg}
          isMe={isMe}
          canEdit={canEditMsg(msg)}
          canDelete={canDeleteMsg(msg)}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
        />
      );
    });
    return elements;
  };

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  // Dietitian selection view
  if (showNewConvo) {
    return (
      <PullToRefreshWrapper onRefresh={handleNewConversation}>
        <div className="d-flex align-items-center gap-2 mb-3">
          <Button variant="link" className="p-0 text-dark" onClick={() => setShowNewConvo(false)}>
            <FiArrowLeft size={20} />
          </Button>
          <h2 className="mb-0" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }}>
            {t('messages.chooseDietitian', 'Choisir un(e) diététicien(ne)')}
          </h2>
        </div>

        {loadingDietitians ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : dietitians.length === 0 ? (
          <Card>
            <Card.Body className="text-center text-muted py-4">
              {t('messages.noDietitians', 'Aucun(e) diététicien(ne) lié(e) à votre compte')}
            </Card.Body>
          </Card>
        ) : (
          <ListGroup>
            {dietitians.map(d => (
              <ListGroup.Item
                key={d.id}
                action
                disabled={creatingConvo}
                onClick={() => !creatingConvo && handleStartConversation(d.id)}
                className="d-flex align-items-center gap-3 py-3"
              >
                <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44 }}>
                  <FiUser size={20} className="text-primary" />
                </div>
                <div className="flex-grow-1">
                  <strong>{d.first_name} {d.last_name}</strong>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </PullToRefreshWrapper>
    );
  }

  // Active conversation thread
  if (activeConvo) {
    return (
      <PullToRefreshWrapper onRefresh={() => openConversation(activeConvo)}>
        <div className="d-flex flex-column" style={{
          height: keyboardHeight > 0
            ? `calc(100vh - 120px - ${keyboardHeight}px)`
            : 'calc(100vh - 120px - 56px - env(safe-area-inset-bottom))',
          transition: 'height 0.15s ease-out',
        }}>
          {/* Header */}
          <div className="d-flex align-items-center gap-2 mb-2">
            <Button variant="link" className="p-0 text-dark" onClick={() => setActiveConvo(null)}>
              <FiArrowLeft size={20} />
            </Button>
            <div className="flex-grow-1">
              <strong>
                {activeConvo.dietitian?.first_name} {activeConvo.dietitian?.last_name}
              </strong>
              {activeConvo.title && (
                <small className="text-muted d-block" style={{ fontSize: '0.78rem' }}>{activeConvo.title}</small>
              )}
            </div>
            <Button
              variant={activeConvo.status === 'closed' ? 'outline-success' : 'outline-secondary'}
              size="sm"
              onClick={toggleConversationStatus}
              style={{ fontSize: '0.75rem' }}
            >
              {activeConvo.status === 'closed' ? <FiUnlock size={13} /> : <FiLock size={13} />}
            </Button>
          </div>

          {/* Closed banner */}
          {activeConvo.status === 'closed' && (
            <div className="bg-warning bg-opacity-10 text-center py-1 mb-1 rounded" style={{ fontSize: '0.78rem' }}>
              <FiLock size={12} className="me-1" />
              {t('messages.closedBanner', 'Cette conversation est fermée')}
            </div>
          )}

          {/* Messages */}
          <Card className="flex-grow-1 d-flex flex-column" style={{ overflow: 'hidden' }}>
            <Card.Body ref={messagesContainerRef} className="flex-grow-1 p-3" style={{ overflowY: 'auto' }}>
              {loadingMessages ? (
                <div className="text-center py-4"><Spinner size="sm" animation="border" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted py-4">
                  {t('messages.noMessages', 'Aucun message. Commencez la conversation !')}
                </div>
              ) : renderMessagesWithSeparators()}
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

        <EditMessageModal
          show={showEditModal}
          message={editingMessage}
          onSave={handleSaveEdit}
          onClose={() => { setShowEditModal(false); setEditingMessage(null); }}
        />
      </PullToRefreshWrapper>
    );
  }

  // Conversation list
  return (
    <PullToRefreshWrapper onRefresh={loadConversations}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="mb-0" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }}>
          <FiMessageSquare className="me-2" />
          {t('messages.title', 'Messages')}
        </h2>
        <Button variant="primary" size="sm" onClick={handleNewConversation}>
          <FiPlus className="me-1" />
          {t('messages.newMessage', 'Nouveau message')}
        </Button>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <Card.Body className="text-center text-muted py-5">
            <FiMessageSquare size={40} className="mb-3 opacity-25" />
            <p className="mb-2">{t('messages.noConversations', 'Aucune conversation')}</p>
            <Button variant="outline-primary" size="sm" onClick={handleNewConversation}>
              <FiPlus className="me-1" />
              {t('messages.startFirst', 'Envoyer un premier message')}
            </Button>
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
                  <div className="d-flex align-items-center gap-1">
                    {c.status === 'closed' && <FiLock size={12} className="text-muted" />}
                    {c.patient_unread_count > 0 && (
                      <Badge bg="danger" pill>{c.patient_unread_count}</Badge>
                    )}
                  </div>
                </div>
                {c.title && (
                  <small className="d-block" style={{ fontSize: '0.78rem', fontWeight: 500 }}>{c.title}</small>
                )}
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
