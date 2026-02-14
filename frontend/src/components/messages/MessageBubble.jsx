import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { LuBookOpen, LuTarget } from 'react-icons/lu';

const MessageBubble = ({ msg, isMe, onEdit, onDelete, canEdit, canDelete }) => {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);

  const isJournalRef = msg.message_type === 'journal_ref';
  const isObjectiveRef = msg.message_type === 'objective_ref';
  const isSpecial = isJournalRef || isObjectiveRef;
  const meta = msg.metadata;

  const bubbleStyle = {
    padding: isSpecial ? '0' : '8px 14px',
    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    background: isMe ? 'var(--bs-primary, #4a9d6e)' : '#f0f0f0',
    color: isMe ? '#fff' : '#333',
    fontSize: '0.88rem',
    position: 'relative',
    overflow: 'hidden',
  };

  const renderRefCard = () => {
    const icon = isJournalRef ? <LuBookOpen size={16} /> : <LuTarget size={16} />;
    const label = isJournalRef
      ? t('messages.journalReference', 'Entrée de journal')
      : t('messages.objectiveReference', 'Objectif');
    const title = meta?.title || meta?.objective_title || '';

    return (
      <div style={{
        background: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.04)',
        borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.5)' : 'var(--bs-primary, #4a9d6e)'}`,
        padding: '8px 12px',
        margin: '0 0 0 0',
      }}>
        <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>
          {icon}
          <span style={{ fontWeight: 600 }}>{label}</span>
        </div>
        {title && (
          <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{title}</div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`d-flex mb-2 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      {/* Action icons */}
      {hovered && (canEdit || canDelete) && (
        <div
          className={`d-flex align-items-center gap-1 ${isMe ? 'me-1' : 'ms-1 order-1'}`}
          style={{ alignSelf: 'center' }}
        >
          {canEdit && (
            <button
              className="btn btn-sm p-0 border-0"
              onClick={() => onEdit?.(msg)}
              title={t('messages.editMessage', 'Modifier')}
              style={{ color: '#888', lineHeight: 1 }}
            >
              <FiEdit2 size={14} />
            </button>
          )}
          {canDelete && (
            <button
              className="btn btn-sm p-0 border-0"
              onClick={() => onDelete?.(msg)}
              title={t('messages.deleteMessage', 'Supprimer')}
              style={{ color: '#c44', lineHeight: 1 }}
            >
              <FiTrash2 size={14} />
            </button>
          )}
        </div>
      )}

      <div className="msg-bubble" style={bubbleStyle}>
        {isSpecial && renderRefCard()}
        <div style={{
          padding: isSpecial ? '6px 12px 8px' : '0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <div style={{
          fontSize: '0.65rem',
          opacity: 0.7,
          textAlign: 'right',
          padding: isSpecial ? '0 12px 6px' : '0',
          marginTop: 2,
        }}>
          {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          {msg.edited_at && (
            <span className="ms-1" style={{ fontStyle: 'italic' }}>
              ({t('messages.edited', 'modifié')})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
