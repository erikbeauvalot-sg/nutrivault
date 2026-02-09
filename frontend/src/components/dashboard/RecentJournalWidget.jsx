/**
 * Recent Journal Widget
 * Displays recent patient journal entries for the dietitian dashboard
 */

import { useState, useEffect } from 'react';
import { Card, ListGroup, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { getRecentJournal } from '../../services/dashboardService';

const MOOD_EMOJIS = {
  very_bad: '\uD83D\uDE2B',
  bad: '\uD83D\uDE1F',
  neutral: '\uD83D\uDE10',
  good: '\uD83D\uDE42',
  very_good: '\uD83D\uDE04',
};

const TYPE_ICONS = {
  food: '\uD83C\uDF7D\uFE0F',
  symptom: '\uD83E\uDE7A',
  mood: '\uD83D\uDCAD',
  activity: '\uD83C\uDFC3',
  note: '\uD83D\uDCDD',
  other: '\uD83D\uDCCE',
};

const RecentJournalWidget = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await getRecentJournal(8);
      if (response.success) {
        setEntries(response.data);
      }
    } catch (err) {
      console.error('Error fetching recent journal:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLocale = () => i18n.language === 'fr' ? fr : enUS;

  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date + 'T00:00:00'), {
        addSuffix: true,
        locale: getLocale()
      });
    } catch {
      return '';
    }
  };

  return (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Header className="bg-white border-0">
        <h6 className="mb-0">{'\uD83D\uDCD3'} {t('dashboard.recentJournal', 'Journal des patients')}</h6>
      </Card.Header>
      <Card.Body className="p-0" style={{ maxHeight: 400, overflowY: 'auto' }}>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center text-muted py-5">
            <div style={{ fontSize: '2rem' }}>{'\uD83D\uDCD3'}</div>
            <p className="mt-2">{t('dashboard.noJournalEntries', 'Aucune entrée récente')}</p>
          </div>
        ) : (
          <ListGroup variant="flush">
            {entries.map((entry) => (
              <ListGroup.Item
                key={entry.id}
                action
                onClick={() => navigate(`/patients/${entry.patient_id}?tab=journal`)}
                className="border-0 border-bottom py-3"
              >
                <div className="d-flex align-items-start">
                  <span
                    className="me-3"
                    style={{ fontSize: '1.2rem', minWidth: 28, textAlign: 'center' }}
                  >
                    {TYPE_ICONS[entry.entry_type] || '\uD83D\uDCDD'}
                  </span>
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold small text-truncate">{entry.patient_name}</span>
                      <small className="text-muted ms-2 text-nowrap">{formatTime(entry.entry_date)}</small>
                    </div>
                    <p className="mb-1 small text-truncate">
                      {entry.mood && MOOD_EMOJIS[entry.mood] ? `${MOOD_EMOJIS[entry.mood]} ` : ''}
                      {entry.title || entry.content}
                    </p>
                    <div className="d-flex gap-2 align-items-center">
                      <Badge bg="light" text="dark" className="px-1" style={{ fontSize: '0.7rem' }}>
                        {t(`portal.journal.type.${entry.entry_type}`, entry.entry_type)}
                      </Badge>
                      {entry.comment_count > 0 && (
                        <small className="text-muted">
                          {'\uD83D\uDCAC'} {entry.comment_count}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
};

export default RecentJournalWidget;
