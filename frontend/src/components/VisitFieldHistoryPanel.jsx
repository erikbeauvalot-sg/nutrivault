/**
 * VisitFieldHistoryPanel Component
 * Read-only panel showing visit field history as a transposed table.
 * Fields as rows, visits as columns, with left/right navigation.
 */

import { useState, useEffect, useMemo } from 'react';
import { Alert, Spinner, Button, Badge, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import customFieldService from '../services/customFieldService';
import { formatDate } from '../utils/dateUtils';

const formatValue = (value, field, language) => {
  if (value === null || value === undefined || value === '') return '-';
  switch (field.field_type) {
    case 'number':
    case 'calculated':
    case 'embedded': {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      const dp = field.decimal_places != null ? field.decimal_places : 2;
      return num.toFixed(dp);
    }
    case 'boolean':
      return value === true || value === 'true' || value === 1 ? 'Oui' : 'Non';
    case 'select': {
      if (field.select_options && Array.isArray(field.select_options)) {
        const opt = field.select_options.find(o => (o.value || o) === value);
        return opt ? (opt.label || opt.value || opt) : value;
      }
      return value;
    }
    case 'date': {
      try {
        return formatDate(value, language);
      } catch {
        return value;
      }
    }
    default:
      return String(value);
  }
};

const EXCLUDED_TYPES = ['blank', 'separator'];

const VisitFieldHistoryPanel = ({ patientId, categoryId, categoryColor }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await customFieldService.getVisitFieldHistory(
          patientId, categoryId, i18n.language
        );
        setData(result);
        setStartIndex(0);
      } catch (err) {
        console.error('Error fetching visit field history:', err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [patientId, categoryId, i18n.language]);

  const displayFields = useMemo(() => {
    if (!data?.fields) return [];
    return data.fields.filter(f => !EXCLUDED_TYPES.includes(f.field_type));
  }, [data]);

  const totalVisits = data?.visits?.length || 0;
  const currentVisit = data?.visits?.[startIndex] || null;

  const canGoLeft = startIndex > 0;
  const canGoRight = startIndex + 1 < totalVisits;

  const goLeft = () => setStartIndex(prev => Math.max(0, prev - 1));
  const goRight = () => setStartIndex(prev => Math.min(totalVisits - 1, prev + 1));

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" />
        <span className="ms-2">{t('common.loading', 'Chargement...')}</span>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!data || !data.visits || data.visits.length === 0) {
    return (
      <Alert variant="info">
        {t('customFields.noVisitHistory', 'Aucune donnée de visite pour cette catégorie.')}
      </Alert>
    );
  }

  const handleVisitClick = (visitId) => {
    navigate(`/visits/${visitId}`);
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Badge bg="secondary">
          {t('customFields.viewsCount', '{{count}} visite(s)', { count: totalVisits })}
        </Badge>
      </div>

      <Alert variant="light" className="py-2 small border" style={{ borderLeftColor: categoryColor, borderLeftWidth: '3px' }}>
        {t('customFields.visitHistoryReadOnly', 'Données en lecture seule. Cliquez sur une date pour modifier.')}
      </Alert>

      {/* Navigation + date header */}
      {currentVisit && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Button
            variant="outline-secondary"
            disabled={!canGoLeft}
            onClick={goLeft}
            style={{ fontSize: '1.4rem', lineHeight: 1, padding: '0.3rem 0.8rem' }}
          >
            &#8249;
          </Button>
          <div className="text-center">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); handleVisitClick(currentVisit.visit_id); }}
              className="text-decoration-none fw-semibold"
              style={{ fontSize: '1.05rem' }}
            >
              {formatDate(currentVisit.visit_date, i18n.language)}
            </a>
            {currentVisit.visit_type && (
              <Badge bg="info" className="fw-normal ms-2" style={{ fontSize: '0.7rem' }}>
                {currentVisit.visit_type}
              </Badge>
            )}
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
              {startIndex + 1} / {totalVisits}
            </div>
          </div>
          <Button
            variant="outline-secondary"
            disabled={!canGoRight}
            onClick={goRight}
            style={{ fontSize: '1.4rem', lineHeight: 1, padding: '0.3rem 0.8rem' }}
          >
            &#8250;
          </Button>
        </div>
      )}

      <Table bordered size="sm" className="mb-0" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '25%' }} />
          <col style={{ width: '75%' }} />
        </colgroup>
        <tbody>
          {displayFields.map(field => (
            <tr key={field.id}>
              <td className="fw-medium text-muted text-truncate" style={{ fontSize: '0.85rem' }}>
                {field.field_label}
              </td>
              <td className="text-center">
                {currentVisit ? formatValue(currentVisit.values[field.id], field, i18n.language) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default VisitFieldHistoryPanel;
