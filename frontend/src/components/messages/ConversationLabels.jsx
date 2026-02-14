import { useState } from 'react';
import { Badge, Form, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiX } from 'react-icons/fi';
import * as messageService from '../../services/messageService';
import { toast } from 'react-toastify';

const COLORS = ['#4a9d6e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280'];

const ConversationLabels = ({ conversation, onUpdate }) => {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const labels = conversation?.labels || [];

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    try {
      await messageService.addLabel(conversation.id, newLabel.trim(), selectedColor);
      setNewLabel('');
      setAdding(false);
      onUpdate?.();
    } catch (err) {
      toast.error(err.response?.data?.error || t('messages.labelError', 'Erreur'));
    }
  };

  const handleRemove = async (labelId) => {
    try {
      await messageService.removeLabel(conversation.id, labelId);
      onUpdate?.();
    } catch {
      toast.error(t('messages.labelError', 'Erreur'));
    }
  };

  return (
    <div className="d-flex align-items-center gap-1 flex-wrap mt-1" style={{ minHeight: 24 }}>
      {labels.map(l => (
        <Badge
          key={l.id}
          style={{ fontSize: '0.65rem', background: l.color || '#6c757d', cursor: 'pointer' }}
          className="d-flex align-items-center gap-1"
        >
          {l.label}
          <FiX size={10} onClick={() => handleRemove(l.id)} style={{ cursor: 'pointer' }} />
        </Badge>
      ))}

      {adding ? (
        <div className="d-flex align-items-center gap-1">
          <Form.Control
            size="sm"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder={t('messages.labelName', 'Label...')}
            style={{ width: 100, fontSize: '0.75rem', height: 24 }}
            autoFocus
            maxLength={50}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
          />
          <div className="d-flex gap-0">
            {COLORS.map(c => (
              <div
                key={c}
                onClick={() => setSelectedColor(c)}
                style={{
                  width: 14, height: 14, borderRadius: '50%', background: c,
                  cursor: 'pointer', border: selectedColor === c ? '2px solid #333' : '1px solid #ccc',
                }}
              />
            ))}
          </div>
          <Button variant="link" size="sm" className="p-0" onClick={handleAdd} style={{ lineHeight: 1 }}>
            <FiPlus size={14} />
          </Button>
          <Button variant="link" size="sm" className="p-0 text-muted" onClick={() => setAdding(false)} style={{ lineHeight: 1 }}>
            <FiX size={14} />
          </Button>
        </div>
      ) : (
        labels.length < 10 && (
          <button
            className="btn btn-sm p-0 border-0 text-muted"
            onClick={() => setAdding(true)}
            title={t('messages.addLabel', 'Ajouter un label')}
            style={{ fontSize: '0.7rem', lineHeight: 1 }}
          >
            <FiPlus size={12} />
          </button>
        )
      )}
    </div>
  );
};

export default ConversationLabels;
