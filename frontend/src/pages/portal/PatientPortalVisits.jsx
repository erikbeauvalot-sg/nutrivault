/**
 * Patient Portal Visits Page
 * Visit history with appointment request form, cancel capability, and custom field details
 */

import { useState, useEffect, useMemo } from 'react';
import { Spinner, Alert, Badge, Accordion, Pagination, Button, Form, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import * as portalService from '../../services/portalService';

const VISITS_PER_PAGE = 10;

const statusVariant = (status) => {
  const map = {
    REQUESTED: 'warning',
    SCHEDULED: 'primary',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    NO_SHOW: 'warning'
  };
  return map[status] || 'secondary';
};

const statusLabel = (status, t) => {
  const map = {
    REQUESTED: t('portal.visitStatus.requested', 'En attente'),
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

const canCancelVisit = (visit) => {
  if (visit.status === 'REQUESTED') return true;
  if (visit.status === 'SCHEDULED') {
    const visitTime = new Date(visit.visit_date).getTime();
    const hoursUntil = (visitTime - Date.now()) / (1000 * 60 * 60);
    return hoursUntil >= 24;
  }
  return false;
};

const PatientPortalVisits = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [bookingEnabled, setBookingEnabled] = useState(false);

  // Request form state
  const [showForm, setShowForm] = useState(false);
  const [dietitians, setDietitians] = useState([]);
  const [visitTypes, setVisitTypes] = useState([]);
  const [formData, setFormData] = useState({
    dietitian_id: '',
    visit_date: '',
    visit_type: '',
    duration_minutes: '',
    request_message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadVisits = async () => {
    try {
      const data = await portalService.getVisits();
      setVisits(data || []);
    } catch {
      setError(t('portal.loadError', 'Erreur lors du chargement'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    portalService.getFeatures()
      .then(f => setBookingEnabled(f?.patientBooking === true))
      .catch(() => {});
    loadVisits();
  }, []);

  const openRequestForm = async () => {
    try {
      const [dts, vts] = await Promise.all([
        portalService.getMyDietitians(),
        portalService.getVisitTypes()
      ]);
      setDietitians(dts || []);
      setVisitTypes(vts || []);
      // Auto-select if single dietitian
      setFormData(prev => ({
        ...prev,
        dietitian_id: (dts && dts.length === 1) ? dts[0].id : ''
      }));
      setShowForm(true);
    } catch {
      toast.error(t('portal.loadError', 'Erreur lors du chargement'));
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Auto-fill duration when visit type selected
    if (field === 'visit_type' && value) {
      const vt = visitTypes.find(v => v.name === value);
      if (vt?.duration_minutes) {
        setFormData(prev => ({ ...prev, [field]: value, duration_minutes: String(vt.duration_minutes) }));
      }
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!formData.dietitian_id || !formData.visit_date) return;

    setSubmitting(true);
    try {
      await portalService.createVisitRequest({
        dietitian_id: formData.dietitian_id,
        visit_date: new Date(formData.visit_date).toISOString(),
        visit_type: formData.visit_type || undefined,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
        request_message: formData.request_message || undefined
      });
      toast.success(t('portal.requestSubmitted', 'Demande soumise'));
      setShowForm(false);
      setFormData({ dietitian_id: '', visit_date: '', visit_type: '', duration_minutes: '', request_message: '' });
      setLoading(true);
      await loadVisits();
    } catch (err) {
      toast.error(err?.response?.data?.error || t('portal.loadError', 'Erreur'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelVisit = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await portalService.cancelVisit(cancelTarget.id);
      toast.success(t('portal.appointmentCancelled', 'Rendez-vous annule'));
      setCancelTarget(null);
      setLoading(true);
      await loadVisits();
    } catch (err) {
      toast.error(err?.response?.data?.error || t('portal.cancelTooLate', 'Impossible d\'annuler'));
    } finally {
      setCancelling(false);
    }
  };

  // Filtering
  const filteredVisits = useMemo(() => {
    if (filter === 'all') return visits;
    if (filter === 'pending') return visits.filter(v => v.status === 'REQUESTED');
    if (filter === 'upcoming') return visits.filter(v => v.status === 'SCHEDULED' && new Date(v.visit_date) > new Date());
    if (filter === 'past') return visits.filter(v => v.status === 'COMPLETED' || v.status === 'NO_SHOW' || (v.status === 'SCHEDULED' && new Date(v.visit_date) <= new Date()));
    return visits;
  }, [visits, filter]);

  const totalPages = Math.ceil(filteredVisits.length / VISITS_PER_PAGE);
  const paginatedVisits = useMemo(() => {
    const start = (page - 1) * VISITS_PER_PAGE;
    return filteredVisits.slice(start, start + VISITS_PER_PAGE);
  }, [filteredVisits, page]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [filter]);

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  const pendingCount = visits.filter(v => v.status === 'REQUESTED').length;

  return (
    <div>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 gap-2">
        <div className="d-flex align-items-center gap-2">
          <h2 className="mb-0" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }}>
            {'\uD83D\uDCCB'} {t('portal.nav.visits', 'Mes consultations')}
          </h2>
          {pendingCount > 0 && (
            <Badge bg="warning" text="dark" pill>{pendingCount}</Badge>
          )}
        </div>
        {bookingEnabled && (
          <Button variant="primary" size="sm" onClick={openRequestForm}>
            + {t('portal.requestAppointment', 'Demander un rendez-vous')}
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Filter tabs */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {[
          { key: 'all', label: t('common.all', 'Toutes') },
          { key: 'pending', label: t('portal.visitStatus.requested', 'En attente') },
          { key: 'upcoming', label: t('portal.upcomingVisits', 'A venir') },
          { key: 'past', label: t('portal.pastVisits', 'Passees') }
        ].map(f => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'primary' : 'outline-secondary'}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {filteredVisits.length === 0 ? (
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
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <strong style={{ whiteSpace: 'nowrap' }}>{date}</strong>
                        <span className="text-muted" style={{ fontSize: '0.9em' }}>{time}</span>
                        {v.visit_type && (
                          <Badge bg="light" text="dark" className="fw-normal" style={{ fontSize: '0.8em' }}>
                            {v.visit_type}
                          </Badge>
                        )}
                      </div>
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
                    {/* Request message */}
                    {v.request_message && (
                      <div className="mb-3 pb-3 border-bottom">
                        <strong className="d-block mb-1" style={{ fontSize: '0.85em', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#6c757d' }}>
                          {t('portal.yourMessage', 'Message')}
                        </strong>
                        <p className="mb-0 fst-italic" style={{ whiteSpace: 'pre-wrap' }}>{v.request_message}</p>
                      </div>
                    )}

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
                    ) : !v.visit_summary && !v.request_message ? (
                      <p className="text-muted mb-0">{t('portal.noVisitDetails', 'Aucun detail pour cette consultation')}</p>
                    ) : null}

                    {/* Cancel button (only when booking feature is enabled) */}
                    {bookingEnabled && canCancelVisit(v) && (
                      <div className="mt-3 pt-3 border-top">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setCancelTarget(v); }}
                        >
                          {t('portal.cancelAppointment', 'Annuler le rendez-vous')}
                        </Button>
                      </div>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>

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

      {/* Request Appointment Form Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('portal.requestAppointment', 'Demander un rendez-vous')}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitRequest}>
          <Modal.Body>
            {dietitians.length === 0 ? (
              <Alert variant="warning">{t('portal.noDietitian', 'Aucun dieteticien assigne')}</Alert>
            ) : (
              <>
                {dietitians.length > 1 && (
                  <Form.Group className="mb-3">
                    <Form.Label>{t('portal.selectDietitian', 'Choisir un(e) dieteticien(ne)')}</Form.Label>
                    <Form.Select
                      value={formData.dietitian_id}
                      onChange={(e) => handleFormChange('dietitian_id', e.target.value)}
                      required
                    >
                      <option value="">{t('portal.selectDietitian', 'Choisir...')}</option>
                      {dietitians.map(d => (
                        <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                )}

                {dietitians.length === 1 && (
                  <div className="mb-3">
                    <small className="text-muted">{t('portal.dietitian', 'Dieteticien')}</small>
                    <div className="fw-bold">{dietitians[0].first_name} {dietitians[0].last_name}</div>
                  </div>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>{t('portal.preferredDateTime', 'Date et heure souhaitees')}</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={formData.visit_date}
                    onChange={(e) => handleFormChange('visit_date', e.target.value)}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </Form.Group>

                {visitTypes.length > 0 && (
                  <Form.Group className="mb-3">
                    <Form.Label>{t('portal.selectVisitType', 'Type de consultation')}</Form.Label>
                    <Form.Select
                      value={formData.visit_type}
                      onChange={(e) => handleFormChange('visit_type', e.target.value)}
                    >
                      <option value="">{t('portal.selectVisitType', 'Type de consultation...')}</option>
                      {visitTypes.map(vt => (
                        <option key={vt.id} value={vt.name}>
                          {vt.name}{vt.duration_minutes ? ` (${vt.duration_minutes} min)` : ''}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>{t('portal.yourMessage', 'Message (optionnel)')}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    maxLength={1000}
                    placeholder={t('portal.messagePlaceholder', 'Precisez le motif de votre demande...')}
                    value={formData.request_message}
                    onChange={(e) => handleFormChange('request_message', e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    {formData.request_message.length}/1000
                  </Form.Text>
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              {t('common.cancel', 'Annuler')}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || !formData.dietitian_id || !formData.visit_date}>
              {submitting ? <Spinner size="sm" animation="border" /> : t('portal.requestAppointment', 'Demander')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal show={!!cancelTarget} onHide={() => setCancelTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('portal.cancelConfirmTitle', 'Annuler le rendez-vous ?')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cancelTarget?.status === 'REQUESTED'
            ? t('portal.cancelConfirmRequested', 'Voulez-vous annuler cette demande de rendez-vous ?')
            : t('portal.cancelConfirmScheduled', 'Voulez-vous annuler ce rendez-vous confirme ?')
          }
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setCancelTarget(null)}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button variant="danger" onClick={handleCancelVisit} disabled={cancelling}>
            {cancelling ? <Spinner size="sm" animation="border" /> : t('portal.cancelAppointment', 'Annuler le rendez-vous')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PatientPortalVisits;
