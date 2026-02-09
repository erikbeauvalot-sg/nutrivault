/**
 * Patient Portal Visits Page
 * Read-only visit history with custom field details, pagination, and clean layout
 */

import { useState, useEffect, useMemo } from 'react';
import { Spinner, Alert, Badge, Accordion, Pagination } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as portalService from '../../services/portalService';

const VISITS_PER_PAGE = 10;

const statusVariant = (status) => {
  const map = {
    SCHEDULED: 'primary',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    NO_SHOW: 'warning'
  };
  return map[status] || 'secondary';
};

const statusLabel = (status, t) => {
  const map = {
    SCHEDULED: t('portal.visitStatus.scheduled', 'Planifiee'),
    COMPLETED: t('portal.visitStatus.completed', 'Terminee'),
    CANCELLED: t('portal.visitStatus.cancelled', 'Annulee'),
    NO_SHOW: t('portal.visitStatus.noShow', 'Absent(e)')
  };
  return map[status] || status;
};

const getFieldValue = (cfv) => {
  if (!cfv || !cfv.field_definition) return null;
  const type = cfv.field_definition.field_type;
  if (type === 'number') return cfv.value_number != null ? String(cfv.value_number) : null;
  if (type === 'boolean') return cfv.value_boolean != null ? (cfv.value_boolean ? 'Oui' : 'Non') : null;
  if (type === 'select' && cfv.value_json) {
    try {
      const arr = typeof cfv.value_json === 'string' ? JSON.parse(cfv.value_json) : cfv.value_json;
      return Array.isArray(arr) ? arr.join(', ') : cfv.value_text;
    } catch { return cfv.value_text; }
  }
  return cfv.value_text || null;
};

const formatVisitDate = (dateStr) => {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('fr-FR', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
  const time = d.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit'
  });
  return { date, time };
};

const PatientPortalVisits = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await portalService.getVisits();
        setVisits(data || []);
      } catch {
        setError(t('portal.loadError', 'Erreur lors du chargement'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const totalPages = Math.ceil(visits.length / VISITS_PER_PAGE);
  const paginatedVisits = useMemo(() => {
    const start = (page - 1) * VISITS_PER_PAGE;
    return visits.slice(start, start + VISITS_PER_PAGE);
  }, [visits, page]);

  // Reset to page 1 if current page exceeds total
  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }}>{'\uD83D\uDCCB'} {t('portal.nav.visits', 'Mes consultations')}</h2>
        {visits.length > 0 && (
          <span className="text-muted small">
            {visits.length} {t('portal.nav.visits', 'consultation').toLowerCase()}{visits.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {visits.length === 0 ? (
        <Alert variant="info">{t('portal.noVisits', 'Aucune consultation')}</Alert>
      ) : (
        <>
          <Accordion>
            {paginatedVisits.map((v, index) => {
              const fields = (v.custom_field_values || [])
                .filter(cfv => cfv.field_definition && getFieldValue(cfv));
              const { date, time } = formatVisitDate(v.visit_date);
              const globalIndex = (page - 1) * VISITS_PER_PAGE + index;

              return (
                <Accordion.Item key={v.id} eventKey={String(globalIndex)} className="mb-2 border rounded overflow-hidden">
                  <Accordion.Header>
                    <div className="d-flex flex-column flex-sm-row justify-content-between w-100 me-3 gap-1 gap-sm-3">
                      {/* Left: Date + Time + Type */}
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <strong style={{ whiteSpace: 'nowrap' }}>{date}</strong>
                        <span className="text-muted" style={{ fontSize: '0.9em' }}>{time}</span>
                        {v.visit_type && (
                          <Badge bg="light" text="dark" className="fw-normal" style={{ fontSize: '0.8em' }}>
                            {v.visit_type}
                          </Badge>
                        )}
                      </div>
                      {/* Right: Dietitian + Status */}
                      <div className="d-flex align-items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
                        {v.dietitian && (
                          <small className="text-muted">
                            {v.dietitian.first_name} {v.dietitian.last_name}
                          </small>
                        )}
                        <Badge bg={statusVariant(v.status)} style={{ fontSize: '0.78em' }}>
                          {statusLabel(v.status, t)}
                        </Badge>
                      </div>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body className="pt-3 pb-3">
                    {/* Visit summary */}
                    {v.visit_summary && (
                      <div className="mb-3 pb-3 border-bottom">
                        <strong className="d-block mb-1" style={{ fontSize: '0.85em', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#6c757d' }}>
                          {t('portal.summary', 'Resume')}
                        </strong>
                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{v.visit_summary}</p>
                      </div>
                    )}

                    {/* Custom fields */}
                    {fields.length > 0 ? (
                      <div className="row g-3">
                        {fields.map(cfv => {
                          const val = getFieldValue(cfv);
                          const isLong = val && val.length > 80;
                          return (
                            <div key={cfv.id} className={isLong ? 'col-12' : 'col-12 col-md-6'}>
                              <strong className="d-block mb-1" style={{ fontSize: '0.85em', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#6c757d' }}>
                                {cfv.field_definition.field_label || cfv.field_definition.field_name}
                              </strong>
                              <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{val}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : !v.visit_summary ? (
                      <p className="text-muted mb-0">{t('portal.noVisitDetails', 'Aucun detail pour cette consultation')}</p>
                    ) : null}
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination size="sm">
                <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
                <Pagination.Prev onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) {
                      acc.push(<Pagination.Ellipsis key={`e-${p}`} disabled />);
                    }
                    acc.push(
                      <Pagination.Item key={p} active={p === page} onClick={() => setPage(p)}>
                        {p}
                      </Pagination.Item>
                    );
                    return acc;
                  }, [])}
                <Pagination.Next onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
                <Pagination.Last onClick={() => setPage(totalPages)} disabled={page === totalPages} />
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PatientPortalVisits;
