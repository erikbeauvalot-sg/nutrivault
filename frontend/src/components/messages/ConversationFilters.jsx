import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiClock, FiArrowUp, FiMessageCircle } from 'react-icons/fi';
import * as messageService from '../../services/messageService';

const ConversationFilters = ({ filters, onChange }) => {
  const { t } = useTranslation();
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    messageService.getDistinctLabels().then(setLabels).catch(() => {});
  }, []);

  const statusOptions = [
    { value: '', label: t('messages.filterAll', 'Tous') },
    { value: 'open', label: t('messages.filterOpen', 'Ouvertes') },
    { value: 'closed', label: t('messages.filterClosed', 'Fermées') },
  ];

  const sortOptions = [
    { value: 'recent', label: t('messages.sortRecent', 'Récentes'), icon: <FiClock size={11} /> },
    { value: 'oldest', label: t('messages.sortOldest', 'Anciennes'), icon: <FiArrowUp size={11} /> },
    { value: 'unread', label: t('messages.sortUnread', 'Non lues'), icon: <FiMessageCircle size={11} /> },
  ];

  const pillStyle = (active) => ({
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: '0.72rem',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--bs-primary, #4a9d6e)' : 'transparent',
    color: active ? '#fff' : '#777',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    lineHeight: '1.6',
  });

  return (
    <div className="mb-2 d-flex flex-column gap-1">
      {/* Status + Sort row */}
      <div className="d-flex align-items-center gap-0" style={{
        background: '#f5f5f5',
        borderRadius: 22,
        padding: '2px',
        overflow: 'hidden',
      }}>
        {statusOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange({ ...filters, status: opt.value })}
            style={pillStyle(filters.status === opt.value)}
          >
            {opt.label}
          </button>
        ))}

        <div style={{ width: 1, height: 16, background: '#ddd', margin: '0 4px', flexShrink: 0 }} />

        {sortOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange({ ...filters, sort: opt.value })}
            style={pillStyle(filters.sort === opt.value)}
            title={opt.label}
          >
            {opt.icon}
          </button>
        ))}
      </div>

      {/* Label pills row (only if labels exist) */}
      {labels.length > 0 && (
        <div className="d-flex gap-1 flex-wrap ps-1">
          <button
            onClick={() => onChange({ ...filters, label: '' })}
            style={{
              ...pillStyle(!filters.label),
              background: !filters.label ? 'var(--bs-primary, #4a9d6e)' : '#eee',
              fontSize: '0.68rem',
            }}
          >
            {t('messages.allLabels', 'Tous')}
          </button>
          {labels.map(l => (
            <button
              key={l}
              onClick={() => onChange({ ...filters, label: filters.label === l ? '' : l })}
              style={{
                ...pillStyle(filters.label === l),
                background: filters.label === l ? 'var(--bs-primary, #4a9d6e)' : '#eee',
                fontSize: '0.68rem',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConversationFilters;
