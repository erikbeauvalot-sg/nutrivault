/**
 * MessagesPage (Dietitian side)
 * Conversation list + message thread in a split layout.
 * Responsive: on mobile, shows list OR thread (not both).
 * Polls for new messages every 12 seconds.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Form, Button, Spinner, Badge, ListGroup, InputGroup, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiMessageSquare, FiSend, FiUser, FiSearch, FiPlus, FiArrowLeft, FiEdit2, FiX, FiCheck, FiLock, FiUnlock, FiTag, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import * as messageService from '../services/messageService';
import * as patientService from '../services/patientService';
import Layout from '../components/layout/Layout';
import MessageBubble from '../components/messages/MessageBubble';
import EditMessageModal from '../components/messages/EditMessageModal';
import DateSeparator from '../components/messages/DateSeparator';
import ConversationFilters from '../components/messages/ConversationFilters';
import ConversationLabels from '../components/messages/ConversationLabels';

const POLL_INTERVAL = 12000;
const EDIT_WINDOW_HOURS = 24;

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

  // Edit message state
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Filters
  const [filters, setFilters] = useState({ status: '', label: '', sort: 'recent' });

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
    setEditingTitle(false);
    try {
      const msgs = await messageService.getMessages(convo.id);
      setMessages(msgs);
      await loadConversations();
      setTimeout(scrollToBottom, 100);
    } catch {
      toast.error(t('messages.loadError', 'Failed to load messages'));
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleBack = () => {
    setActiveConvo(null);
    setMessages([]);
    setEditingTitle(false);
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

  // Edit message
  const handleEditMessage = (msg) => {
    setEditingMessage(msg);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (messageId, content) => {
    try {
      const updated = await messageService.editMessage(messageId, content);
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
      await messageService.deleteMessage(msg.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      toast.success(t('messages.messageDeleted', 'Message supprimé'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('messages.deleteError', 'Erreur lors de la suppression'));
    }
  };

  // Title edit
  const startEditTitle = () => {
    setTitleDraft(activeConvo?.title || '');
    setEditingTitle(true);
  };

  const saveTitle = async () => {
    try {
      const updated = await messageService.updateConversation(activeConvo.id, { title: titleDraft.trim() || null });
      setActiveConvo(prev => ({ ...prev, ...updated }));
      setEditingTitle(false);
      await loadConversations();
    } catch {
      toast.error(t('messages.titleError', 'Erreur'));
    }
  };

  // Close/reopen conversation
  const toggleConversationStatus = async () => {
    const newStatus = activeConvo?.status === 'closed' ? 'open' : 'closed';
    try {
      const updated = await messageService.updateConversation(activeConvo.id, { status: newStatus });
      setActiveConvo(prev => ({ ...prev, ...updated }));
      await loadConversations();
    } catch {
      toast.error(t('messages.statusError', 'Erreur'));
    }
  };

  // Delete closed conversation
  const handleDeleteConversation = async () => {
    if (!activeConvo || activeConvo.status !== 'closed') return;
    if (!window.confirm(t('messages.deleteConversationConfirm', 'Supprimer cette conversation et tous ses messages ? Cette action est irréversible.'))) return;
    try {
      await messageService.deleteConversation(activeConvo.id);
      setActiveConvo(null);
      setMessages([]);
      await loadConversations();
      toast.success(t('messages.conversationDeleted', 'Conversation supprimée'));
    } catch {
      toast.error(t('messages.deleteConversationError', 'Erreur lors de la suppression de la conversation'));
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
      toast.error(t('messages.createError', 'Erreur lors de la création de la conversation'));
    } finally {
      setCreatingConvo(false);
    }
  };

  const canEditMsg = (msg) => {
    if (msg.sender_id !== activeConvo?.dietitian?.id && msg.sender?.id !== activeConvo?.dietitian?.id) return false;
    const hours = (Date.now() - new Date(msg.created_at).getTime()) / (1000 * 60 * 60);
    return hours <= EDIT_WINDOW_HOURS;
  };

  const canDeleteMsg = (msg) => {
    return msg.sender_id === activeConvo?.dietitian?.id || msg.sender?.id === activeConvo?.dietitian?.id;
  };

  const filteredConvos = useMemo(() => {
    let result = conversations.filter(c => {
      // Text search
      if (search) {
        const name = `${c.patient?.first_name} ${c.patient?.last_name}`.toLowerCase();
        const title = (c.title || '').toLowerCase();
        if (!name.includes(search.toLowerCase()) && !title.includes(search.toLowerCase())) return false;
      }
      // Status filter
      if (filters.status && c.status !== filters.status) return false;
      // Label filter
      if (filters.label && !c.labels?.some(l => l.label === filters.label)) return false;
      return true;
    });

    // Sort
    if (filters.sort === 'oldest') {
      result = [...result].sort((a, b) => new Date(a.last_message_at || 0) - new Date(b.last_message_at || 0));
    } else if (filters.sort === 'unread') {
      result = [...result].sort((a, b) => (b.dietitian_unread_count || 0) - (a.dietitian_unread_count || 0));
    }
    // 'recent' is the default order from API (DESC)

    return result;
  }, [conversations, search, filters]);

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
      const isMe = msg.sender_id === activeConvo.dietitian?.id || msg.sender?.id === activeConvo.dietitian?.id;
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
    return (
      <Layout>
        <div className="text-center py-5"><Spinner animation="border" /></div>
      </Layout>
    );
  }

  /* ───────── Conversation list panel ───────── */
  const conversationList = (
    <div className="d-flex flex-column" style={{ height: '100%' }}>
      <InputGroup className="mb-2" size="sm">
        <InputGroup.Text><FiSearch size={14} /></InputGroup.Text>
        <Form.Control
          placeholder={t('messages.searchPatients', 'Chercher un patient...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </InputGroup>

      <ConversationFilters filters={filters} onChange={setFilters} />

      <Card className="flex-grow-1" style={{ overflow: 'hidden' }}>
        <ListGroup variant="flush" style={{ overflowY: 'auto', maxHeight: '100%' }}>
          {filteredConvos.length === 0 && (
            <ListGroup.Item className="text-muted text-center py-4">
              <FiMessageSquare size={32} className="mb-2 opacity-25 d-block mx-auto" />
              {conversations.length === 0
                ? t('messages.noConversations', 'Aucune conversation')
                : t('messages.noResults', 'Aucun résultat')
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
                  <div className="d-flex align-items-center gap-1">
                    {c.status === 'closed' && (
                      <FiLock size={12} className="text-muted" />
                    )}
                    {c.dietitian_unread_count > 0 && (
                      <Badge bg="danger" pill style={{ fontSize: '0.7rem' }}>
                        {c.dietitian_unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
                {c.title && (
                  <small className="d-block text-truncate" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                    {c.title}
                  </small>
                )}
                {c.labels?.length > 0 && (
                  <div className="d-flex gap-1 mt-1 flex-wrap">
                    {c.labels.map(l => (
                      <span key={l.id} className="badge" style={{
                        fontSize: '0.6rem',
                        background: l.color || '#6c757d',
                        color: '#fff',
                      }}>{l.label}</span>
                    ))}
                  </div>
                )}
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
    </div>
  );

  /* ───────── Empty state (no convo selected, desktop only) ───────── */
  const emptyThread = (
    <Card className="flex-grow-1 d-flex align-items-center justify-content-center">
      <div className="text-center text-muted py-5">
        <FiMessageSquare size={48} className="mb-3 opacity-25" />
        <p>{t('messages.selectConversation', 'Sélectionnez une conversation ou créez-en une nouvelle')}</p>
      </div>
    </Card>
  );

  /* ───────── Message thread panel ───────── */
  const messageThread = activeConvo ? (
    <Card className="flex-grow-1 d-flex flex-column" style={{ overflow: 'hidden' }}>
      {/* Thread header */}
      <Card.Header className="py-2">
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="link"
            size="sm"
            className="d-md-none p-0 text-decoration-none"
            onClick={handleBack}
            aria-label={t('common.back', 'Retour')}
          >
            <FiArrowLeft size={20} />
          </Button>
          <div className="flex-grow-1 overflow-hidden">
            <strong className="d-block text-truncate">{activeConvo.patient?.first_name} {activeConvo.patient?.last_name}</strong>
            {editingTitle ? (
              <div className="d-flex align-items-center gap-1 mt-1">
                <Form.Control
                  size="sm"
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  placeholder={t('messages.addTitle', 'Ajouter un titre...')}
                  autoFocus
                  style={{ fontSize: '0.8rem' }}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                />
                <Button variant="link" size="sm" className="p-0" onClick={saveTitle}><FiCheck size={16} /></Button>
                <Button variant="link" size="sm" className="p-0 text-muted" onClick={() => setEditingTitle(false)}><FiX size={16} /></Button>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-1">
                {activeConvo.title ? (
                  <small className="text-muted" style={{ cursor: 'pointer', fontSize: '0.8rem' }} onClick={startEditTitle}>
                    {activeConvo.title} <FiEdit2 size={11} className="ms-1" />
                  </small>
                ) : (
                  <small className="text-muted" style={{ cursor: 'pointer', opacity: 0.5, fontSize: '0.75rem' }} onClick={startEditTitle}>
                    {t('messages.addTitle', 'Ajouter un titre...')} <FiEdit2 size={11} />
                  </small>
                )}
              </div>
            )}
          </div>
          <div className="d-flex align-items-center gap-1">
            <Button
              variant={activeConvo.status === 'closed' ? 'outline-success' : 'outline-secondary'}
              size="sm"
              onClick={toggleConversationStatus}
              title={activeConvo.status === 'closed' ? t('messages.reopenConversation', 'Rouvrir') : t('messages.closeConversation', 'Fermer')}
              style={{ fontSize: '0.75rem' }}
            >
              {activeConvo.status === 'closed' ? <><FiUnlock size={13} className="me-1" /><span className="d-none d-lg-inline">{t('messages.reopenConversation', 'Rouvrir')}</span></> : <><FiLock size={13} className="me-1" /><span className="d-none d-lg-inline">{t('messages.closeConversation', 'Fermer')}</span></>}
            </Button>
            {activeConvo.status === 'closed' && (
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleDeleteConversation}
                title={t('messages.deleteConversation', 'Supprimer')}
                style={{ fontSize: '0.75rem' }}
              >
                <FiTrash2 size={13} className="me-1" /><span className="d-none d-lg-inline">{t('messages.deleteConversation', 'Supprimer')}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Labels */}
        <ConversationLabels conversation={activeConvo} onUpdate={async () => {
          const convos = await messageService.getConversations();
          setConversations(convos);
          const updated = convos.find(c => c.id === activeConvo.id);
          if (updated) setActiveConvo(updated);
        }} />
      </Card.Header>

      {/* Closed banner */}
      {activeConvo.status === 'closed' && (
        <div className="bg-warning bg-opacity-10 text-center py-1" style={{ fontSize: '0.78rem' }}>
          <FiLock size={12} className="me-1" />
          {t('messages.closedBanner', 'Cette conversation est fermée')}
        </div>
      )}

      {/* Messages */}
      <Card.Body ref={messagesContainerRef} className="flex-grow-1 p-3" style={{ overflowY: 'auto' }}>
        {loadingMessages ? (
          <div className="text-center py-4"><Spinner size="sm" animation="border" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t('messages.noMessages', 'Aucun message. Envoyez le premier !')}
          </div>
        ) : renderMessagesWithSeparators()}
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
  ) : null;

  return (
    <Layout>
      {/* Inline responsive styles */}
      <style>{`
        .messages-container {
          height: calc(100vh - 180px);
          min-height: 400px;
          display: flex;
          gap: 1rem;
        }
        .messages-sidebar {
          width: 340px;
          min-width: 280px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
        }
        .messages-thread {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .msg-bubble {
          max-width: 75%;
        }
        @media (max-width: 767.98px) {
          .messages-container {
            height: calc(100vh - 140px);
            min-height: 300px;
          }
          .messages-sidebar {
            width: 100%;
            min-width: unset;
          }
          .messages-thread {
            width: 100%;
          }
          .msg-bubble {
            max-width: 88%;
          }
        }
      `}</style>

      <div className="d-flex align-items-center mb-3 gap-2">
        <FiMessageSquare size={24} className="flex-shrink-0" />
        <h2 className="mb-0" style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}>
          {t('messages.title', 'Messages')}
        </h2>
        <Button
          variant="primary"
          size="sm"
          className="ms-auto flex-shrink-0"
          onClick={() => setShowNewConvo(true)}
        >
          <FiPlus className="me-1" />
          <span className="d-none d-sm-inline">{t('messages.newConversation', 'Nouvelle conversation')}</span>
          <span className="d-sm-none">{t('messages.new', 'Nouveau')}</span>
        </Button>
      </div>

      {/* Desktop: side-by-side | Mobile: list OR thread */}
      <div className="messages-container">
        <div className={`messages-sidebar ${activeConvo ? 'd-none d-md-flex' : 'd-flex'}`} style={{ flexDirection: 'column', height: '100%' }}>
          {conversationList}
        </div>
        <div className={`messages-thread ${!activeConvo ? 'd-none d-md-flex' : 'd-flex'}`} style={{ flexDirection: 'column', height: '100%' }}>
          {activeConvo ? messageThread : emptyThread}
        </div>
      </div>

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
            <ListGroup className="mt-2" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {patientResults.map(p => (
                <ListGroup.Item
                  key={p.id}
                  action
                  disabled={creatingConvo}
                  onClick={() => !creatingConvo && handleStartConversation(p)}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div className="overflow-hidden">
                    <strong>{p.first_name} {p.last_name}</strong>
                    {p.email && <small className="text-muted ms-2 d-none d-sm-inline">{p.email}</small>}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
          {!searchingPatients && patientSearch.trim() && patientResults.length === 0 && (
            <p className="text-muted text-center mt-3 mb-0">
              {t('messages.noPatientFound', 'Aucun patient trouvé')}
            </p>
          )}
        </Modal.Body>
      </Modal>

      {/* Edit Message Modal */}
      <EditMessageModal
        show={showEditModal}
        message={editingMessage}
        onSave={handleSaveEdit}
        onClose={() => { setShowEditModal(false); setEditingMessage(null); }}
      />
    </Layout>
  );
};

export default MessagesPage;
