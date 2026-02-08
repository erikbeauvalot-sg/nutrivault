/**
 * VisitsPage Component
 * Visit management with list, filters, and basic actions
 */

import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import useModalParam from '../hooks/useModalParam';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { PageHeader, PageError, LoadingSpinner, EmptyState, Pagination } from '../components/common';
import { useIsMobile } from '../hooks';
import visitService from '../services/visitService';
import { getPatients } from '../services/patientService';
import { formatDate as utilFormatDate, formatTime as utilFormatTime } from '../utils/dateUtils';
import ExportModal from '../components/ExportModal';
import ActionButton from '../components/ActionButton';
import ConfirmModal from '../components/ConfirmModal';
import CreateVisitModal from '../components/CreateVisitModal';
import api from '../services/api';
import './VisitsPage.css';

const VisitsPage = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    patient_id: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'timeline'
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasSyncedRef = useRef(false);
  const isMobile = useIsMobile();
  const [showCreateModal, openCreateModal, closeCreateModal] = useModalParam('new-visit');
  const [createModalPatient, setCreateModalPatient] = useState(null);

  // Initialize filters from URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlStatus = searchParams.get('status');
    const urlDate = searchParams.get('date');
    const urlPatientId = searchParams.get('patient_id');

    const newFilters = { ...filters };
    let hasChanges = false;

    if (urlStatus && urlStatus !== filters.status) {
      newFilters.status = urlStatus;
      hasChanges = true;
    }
    if (urlDate) {
      // Set date range for a specific day
      newFilters.start_date = urlDate;
      newFilters.end_date = urlDate;
      hasChanges = true;
    }
    if (urlPatientId && urlPatientId !== filters.patient_id) {
      newFilters.patient_id = urlPatientId;
      hasChanges = true;
    }

    if (hasChanges) {
      setFilters(newFilters);
    }
  }, [location.search]);

  useEffect(() => {
    fetchPatients();
    fetchVisits();
  }, [filters]);

  // Handle patient selection from navigation state (from patients page or alerts)
  useEffect(() => {
    if (location.state?.selectedPatient) {
      setCreateModalPatient(location.state.selectedPatient);
      openCreateModal();
      // Clear the state so it doesn't re-trigger
      navigate(location.pathname + location.search, { replace: true, state: {} });
    } else if (location.state?.openCreateModal) {
      // From AlertsWidget - open modal, optionally with patient
      if (location.state.patientId) {
        // We'll set patient_id but not the full object - modal handles it via dropdown
        setCreateModalPatient({ id: location.state.patientId });
      }
      openCreateModal();
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.state]);

  // Sync with Google Calendar on page load (once per session)
  useEffect(() => {
    const syncWithGoogleCalendar = async () => {
      // Only sync once per page load
      if (hasSyncedRef.current) return;
      hasSyncedRef.current = true;

      try {
        // Check if user has Google Calendar sync enabled
        const statusResponse = await api.get('/calendar/sync-status');
        if (!statusResponse.data.success || !statusResponse.data.data.google_calendar_sync_enabled) {
          return; // User doesn't have Google Calendar sync enabled
        }

        setIsSyncing(true);

        // Sync from Google Calendar to NutriVault (bidirectional)
        await api.post('/calendar/sync-from-calendar');

        // Sync from NutriVault to Google Calendar
        await api.post('/calendar/sync-to-calendar');

        // Refresh visits after sync
        await fetchVisits();
      } catch (err) {
        // Silently fail - don't show error to user for background sync
        console.warn('Google Calendar sync failed:', err.message);
      } finally {
        setIsSyncing(false);
      }
    };

    syncWithGoogleCalendar();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data } = await getPatients();
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      // Error fetching patients - silently ignore
    }
  };

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const { data, pagination: paginationData, customFieldDefinitions: fieldDefs } = await visitService.getVisits(filters);
      setVisits(Array.isArray(data) ? data : []);
      setPagination(paginationData || { total: 0, totalPages: 0 });
      setCustomFieldDefinitions(fieldDefs || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || t('visits.failedToLoad'));
      setVisits([]);
      setCustomFieldDefinitions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDelete = (visitId) => {
    setVisitToDelete(visitId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteVisit = async () => {
    if (!visitToDelete) return;

    try {
      await visitService.deleteVisit(visitToDelete);
      fetchVisits();
    } catch (err) {
      setError(err.response?.data?.error || t('errors.failedToDeleteVisit'));
    } finally {
      setVisitToDelete(null);
    }
  };

  const handleCreateClick = () => {
    setCreateModalPatient(null);
    openCreateModal();
  };

  const handleViewClick = (visitId) => {
    navigate(`/visits/${visitId}`);
  };

  const handleEditClick = (visitId) => {
    navigate(`/visits/${visitId}/edit`);
  };

  const getStatusBadge = (status) => {
    const variants = {
      SCHEDULED: 'info',
      COMPLETED: 'success',
      CANCELLED: 'secondary',
      NO_SHOW: 'danger'
    };
    const statusText = {
      SCHEDULED: t('visits.scheduled'),
      COMPLETED: t('visits.completed'),
      CANCELLED: t('visits.cancelled'),
      NO_SHOW: t('visits.noShow')
    };
    return <Badge bg={variants[status] || 'secondary'}>{statusText[status] || status}</Badge>;
  };

  const formatDate = (dateString) => {
    return utilFormatDate(dateString, i18n.language);
  };

  const formatTime = (dateString) => {
    return utilFormatTime(dateString, i18n.language);
  };

  const canEdit = (visit) => {
    const canEditResult = user.role === 'ADMIN' || user.role === 'ASSISTANT' || (user.role === 'DIETITIAN' && visit.dietitian_id === user.id);
    return canEditResult;
  };

  const formatCustomFieldValue = (value, fieldType) => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (fieldType === 'boolean') {
      return value ? t('common.yes') : t('common.no');
    }
    if (fieldType === 'date') {
      return formatDate(value);
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  };

  return (
    <Layout>
      <Container fluid>
        <PageHeader
          title={
            <span>
              {t('visits.title')}
              {isSyncing && (
                <span className="ms-2 text-muted small">
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  {t('googleCalendar.syncing', 'Synchronisation...')}
                </span>
              )}
            </span>
          }
          actions={[
            {
              label: t('visits.tableView'),
              onClick: () => setViewMode('table'),
              variant: viewMode === 'table' ? 'primary' : 'outline-primary',
              icon: 'bi-table',
              className: 'd-none d-md-inline-block'
            },
            {
              label: t('visits.timelineView'),
              onClick: () => setViewMode('timeline'),
              variant: viewMode === 'timeline' ? 'primary' : 'outline-primary',
              icon: 'bi-clock-history',
              className: 'd-none d-md-inline-block'
            },
            {
              label: t('common.export', 'Export'),
              onClick: () => setShowExportModal(true),
              variant: 'outline-secondary',
              icon: 'bi-download'
            },
            {
              label: t('visits.createVisit'),
              onClick: handleCreateClick,
              variant: 'primary',
              icon: 'bi-plus-circle'
            }
          ]}
        />

        <PageError error={error} onDismiss={() => setError(null)} />

        {/* Filters */}
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col xs={12} md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('visits.searchPatient')}</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>🔍</InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder={t('visits.searchByPatientName')}
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('visits.patient')}</Form.Label>
                  <Form.Select
                    value={filters.patient_id}
                    onChange={(e) => handleFilterChange('patient_id', e.target.value)}
                  >
                    <option value="">{t('visits.allPatients')}</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('visits.status')}</Form.Label>
                  <Form.Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="">{t('visits.allStatus')}</option>
                    <option value="SCHEDULED">{t('visits.scheduled')}</option>
                    <option value="COMPLETED">{t('visits.completed')}</option>
                    <option value="CANCELLED">{t('visits.cancelled')}</option>
                    <option value="NO_SHOW">{t('visits.noShow')}</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={2} className="d-flex align-items-end">
                <Button
                  variant="outline-secondary"
                  className="mb-3 w-100"
                  onClick={() => setFilters({ search: '', status: '', patient_id: '', page: 1, limit: 20 })}
                >
                  {t('visits.clearFilters')}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Content based on view mode */}
        {viewMode === 'table' ? (
          /* Visits Table */
          <Card>
            <Card.Body>
              {loading ? (
                <LoadingSpinner message={t('visits.loadingVisits')} />
              ) : visits.length === 0 ? (
                <EmptyState
                  icon="bi-calendar-x"
                  title={t('visits.noVisitsFound')}
                  message={t('visits.adjustFilters')}
                  action={{
                    label: t('visits.createVisit'),
                    onClick: handleCreateClick,
                    icon: 'bi-plus-circle'
                  }}
                />
              ) : isMobile ? (
                /* Mobile Card View */
                <div className="visit-cards-container">
                  {visits.map(visit => (
                    <Card
                      key={visit.id}
                      className="visit-card mb-3"
                      onClick={() => handleViewClick(visit.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="mb-1">
                              <strong>{formatDate(visit.visit_date)} {formatTime(visit.visit_date)}</strong>
                            </h6>
                            {visit.patient && (
                              <div className="text-muted small">
                                👤 {visit.patient.first_name} {visit.patient.last_name}
                              </div>
                            )}
                          </div>
                          {getStatusBadge(visit.status)}
                        </div>

                        <div className="mb-2">
                          {visit.dietitian && (
                            <div className="small mb-1">
                              👨‍⚕️ {visit.dietitian.first_name} {visit.dietitian.last_name}
                            </div>
                          )}
                          {visit.visit_type && (
                            <div className="small mb-1">
                              📋 {visit.visit_type}
                            </div>
                          )}
                          {visit.duration_minutes && (
                            <div className="small text-muted mb-1">
                              ⏱️ {visit.duration_minutes} min
                            </div>
                          )}
                          {customFieldDefinitions.map(field => {
                            const value = visit.custom_field_values?.[field.field_name];
                            if (value === null || value === undefined || value === '') return null;
                            return (
                              <div key={field.id} className="small text-muted mb-1">
                                <strong>{field.field_label}:</strong> {formatCustomFieldValue(value, field.field_type)}
                              </div>
                            );
                          })}
                        </div>

                        {canEdit(visit) && (
                          <div className="action-buttons mt-3" onClick={(e) => e.stopPropagation()}>
                            <ActionButton
                              action="edit"
                              onClick={() => handleEditClick(visit.id)}
                              title={t('common.edit', 'Edit')}
                            />
                            <ActionButton
                              action="delete"
                              onClick={() => handleDelete(visit.id)}
                              title={t('common.delete', 'Delete')}
                            />
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Desktop Table View */
                <>
                  <div className="table-responsive">
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>{t('visits.dateAndTime')}</th>
                          <th>{t('visits.patient')}</th>
                          <th>{t('visits.dietitian')}</th>
                          <th>{t('visits.type')}</th>
                          <th>{t('visits.status')}</th>
                          <th>{t('visits.duration')}</th>
                          {customFieldDefinitions.map(field => (
                            <th key={field.id}>{field.field_label}</th>
                          ))}
                          <th>{t('visits.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visits.map(visit => (
                          <tr
                            key={visit.id}
                            onClick={() => handleViewClick(visit.id)}
                            style={{ cursor: 'pointer' }}
                            className="visit-row"
                          >
                            <td>
                              <div>{formatDate(visit.visit_date)}</div>
                              <small className="text-muted">{formatTime(visit.visit_date)}</small>
                            </td>
                            <td>
                              {visit.patient ? (
                                <>
                                  <div>{visit.patient.first_name} {visit.patient.last_name}</div>
                                  <small className="text-muted">{visit.patient.email}</small>
                                </>
                              ) : '-'}
                            </td>
                            <td>
                              {visit.dietitian ? (
                                <>
                                  <div>{visit.dietitian.first_name} {visit.dietitian.last_name}</div>
                                  <small className="text-muted">{visit.dietitian.username}</small>
                                </>
                              ) : '-'}
                            </td>
                            <td>{visit.visit_type || '-'}</td>
                            <td>{getStatusBadge(visit.status)}</td>
                            <td>{visit.duration_minutes ? `${visit.duration_minutes} min` : '-'}</td>
                            {customFieldDefinitions.map(field => (
                              <td key={field.id}>
                                {formatCustomFieldValue(
                                  visit.custom_field_values?.[field.field_name],
                                  field.field_type
                                )}
                              </td>
                            ))}
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="action-buttons">
                                {canEdit(visit) && (
                                  <>
                                    <ActionButton
                                      action="edit"
                                      onClick={() => handleEditClick(visit.id)}
                                      title={t('common.edit', 'Edit')}
                                    />
                                    <ActionButton
                                      action="delete"
                                      onClick={() => handleDelete(visit.id)}
                                      title={t('common.delete', 'Delete')}
                                    />
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}

              {/* Pagination (shared between mobile and desktop) */}
              {!loading && visits.length > 0 && (
                <Pagination
                  currentPage={filters.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.total}
                  itemsPerPage={filters.limit}
                  onPageChange={(page) => handleFilterChange('page', page)}
                  showInfo
                  className="mt-3"
                />
              )}
            </Card.Body>
          </Card>
        ) : (
          /* Timeline View */
          <Card>
            <Card.Body>
              {loading ? (
                <LoadingSpinner message={t('visits.loadingVisits')} />
              ) : visits.length === 0 ? (
                <EmptyState
                  icon="bi-calendar-x"
                  title={t('visits.noVisitsFound')}
                  message={t('visits.adjustFilters')}
                  action={{
                    label: t('visits.createVisit'),
                    onClick: handleCreateClick,
                    icon: 'bi-plus-circle'
                  }}
                />
              ) : (
                <div className="visit-timeline">
                  {visits
                    .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))
                    .map((visit, index) => (
                      <div key={visit.id} className="timeline-item">
                        <div className="timeline-marker">
                          <div className={`timeline-dot ${visit.status.toLowerCase()}`}></div>
                          {index < visits.length - 1 && <div className="timeline-line"></div>}
                        </div>
                        <div className="timeline-content">
                          <Card
                            className="timeline-card"
                            onClick={() => handleViewClick(visit.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <Card.Body>
                              <Row>
                                <Col xs={12} md={8}>
                                  <div className="d-flex align-items-center mb-2 flex-wrap gap-2">
                                    <h5 className="mb-0">
                                      📅 {formatDate(visit.visit_date)}
                                    </h5>
                                    {getStatusBadge(visit.status)}
                                  </div>
                                  <div className="timeline-meta">
                                    <strong>{t('visits.patient')}:</strong> {visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : t('visits.unknown')} |
                                    <strong> {t('visits.dietitian')}:</strong> {visit.dietitian ? `${visit.dietitian.first_name} ${visit.dietitian.last_name}` : t('visits.unknown')} |
                                    <strong> {t('visits.type')}:</strong> {visit.visit_type || t('visits.generalVisit')} |
                                    <strong> {t('visits.duration')}:</strong> {visit.duration_minutes ? `${visit.duration_minutes} ${t('visits.min')}` : t('visits.na')}
                                  </div>
                                  {visit.chief_complaint && (
                                    <div className="mt-2">
                                      <strong>{t('visits.chiefComplaint')}:</strong> {visit.chief_complaint}
                                    </div>
                                  )}
                                  {visit.assessment && (
                                    <div className="mt-2">
                                      <strong>{t('visits.assessment')}:</strong> {visit.assessment}
                                    </div>
                                  )}
                                </Col>
                                <Col xs={12} md={4} className="text-md-end mt-3 mt-md-0">
                                  <div
                                    className="timeline-actions action-buttons justify-content-start justify-content-md-end"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {canEdit(visit) && (
                                      <>
                                        <ActionButton
                                          action="edit"
                                          onClick={() => handleEditClick(visit.id)}
                                          title={t('common.edit', 'Edit')}
                                        />
                                        <ActionButton
                                          action="delete"
                                          onClick={() => handleDelete(visit.id)}
                                          title={t('common.delete', 'Delete')}
                                        />
                                      </>
                                    )}
                                  </div>
                                  <div className="timeline-time mt-2">
                                    <small className="text-muted">
                                      {formatTime(visit.visit_date)}
                                    </small>
                                  </div>
                                </Col>
                              </Row>
                            </Card.Body>
                          </Card>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        <ExportModal
          show={showExportModal}
          onHide={() => setShowExportModal(false)}
          dataType="visits"
        />

        <ConfirmModal
          show={showDeleteConfirm}
          onHide={() => {
            setShowDeleteConfirm(false);
            setVisitToDelete(null);
          }}
          onConfirm={confirmDeleteVisit}
          title={t('common.confirmation', 'Confirmation')}
          message={t('visits.confirmDelete')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />

        <CreateVisitModal
          show={showCreateModal}
          onHide={() => {
            closeCreateModal();
            setCreateModalPatient(null);
          }}
          onSuccess={() => fetchVisits()}
          selectedPatient={createModalPatient}
        />
      </Container>
    </Layout>
  );
};

export default VisitsPage;
