/**
 * VisitsPage Component
 * Visit management with list, filters, and basic actions
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Spinner, Alert, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import visitService from '../services/visitService';
import { getPatients } from '../services/patientService';
import ExportModal from '../components/ExportModal';
import './VisitsPage.css';

const VisitsPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
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
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'timeline'
  const [showExportModal, setShowExportModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchPatients();
    fetchVisits();
  }, [filters]);

  // Handle patient selection from navigation state (from patients page)
  useEffect(() => {
    if (location.state?.selectedPatient) {
      console.log('🎯 VisitsPage received patient from navigation:', {
        patientId: location.state.selectedPatient.id,
        patientName: `${location.state.selectedPatient.first_name} ${location.state.selectedPatient.last_name}`,
        assignedDietitian: location.state.selectedPatient.assigned_dietitian,
        hasAssignedDietitian: !!location.state.selectedPatient.assigned_dietitian?.id
      });

      // Navigate to create visit page with pre-selected patient
      navigate('/visits/create', { state: { selectedPatient: location.state.selectedPatient } });
    }
  }, [location.state, navigate]);

  const fetchPatients = async () => {
    try {
      const response = await getPatients();
      const patientsData = response.data.data || response.data;
      setPatients(Array.isArray(patientsData) ? patientsData : []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const response = await visitService.getVisits(filters);
      const data = response.data.data || response.data;
      setVisits(Array.isArray(data) ? data : []);
      setPagination(response.data.pagination || { total: 0, totalPages: 0 });
      setError(null);
    } catch (err) {
      console.error('Error fetching visits:', err);
      setError(err.response?.data?.error || t('visits.failedToLoad'));
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDelete = async (visitId) => {
    if (!window.confirm(t('visits.confirmDelete'))) return;

    try {
      await visitService.deleteVisit(visitId);
      fetchVisits();
    } catch (err) {
      console.error('Error deleting visit:', err);
      alert(err.response?.data?.error || t('errors.failedToDeleteVisit'));
    }
  };

  const handleCreateClick = () => {
    navigate('/visits/create');
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
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const canEdit = (visit) => {
    const canEditResult = user.role === 'ADMIN' || user.role === 'ASSISTANT' || (user.role === 'DIETITIAN' && visit.dietitian_id === user.id);
    return canEditResult;
  };

  return (
    <Layout>
      <Container fluid>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>📅 {t('visits.title')}</h1>
          <div>
            <Button
              variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
              size="lg"
              className="me-2"
              onClick={() => setViewMode('table')}
            >
              📋 {t('visits.tableView')}
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'primary' : 'outline-primary'}
              size="lg"
              className="me-2"
              onClick={() => setViewMode('timeline')}
            >
              ⏱️ {t('visits.timelineView')}
            </Button>
            <Button
              variant="outline-secondary"
              size="lg"
              className="me-2"
              onClick={() => setShowExportModal(true)}
            >
              <i className="bi bi-download me-2"></i>
              {t('common.export', 'Export')}
            </Button>
            <Button variant="primary" size="lg" onClick={handleCreateClick}>
              {t('visits.createVisit')}
            </Button>
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

        {/* Filters */}
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Search Patient</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>🔍</InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search by patient name..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Patient</Form.Label>
                  <Form.Select
                    value={filters.patient_id}
                    onChange={(e) => handleFilterChange('patient_id', e.target.value)}
                  >
                    <option value="">All Patients</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NO_SHOW">No Show</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={2} className="d-flex align-items-end">
                <Button
                  variant="outline-secondary"
                  className="mb-3 w-100"
                  onClick={() => setFilters({ search: '', status: '', patient_id: '', page: 1, limit: 20 })}
                >
                  Clear Filters
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
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3">Loading visits...</p>
                </div>
              ) : visits.length === 0 ? (
                <div className="text-center py-5">
                  <h3>No visits found</h3>
                  <p className="text-muted">Try adjusting your filters or create a new visit</p>
                </div>
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
                        </div>

                        {canEdit(visit) && (
                          <div className="d-flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEditClick(visit.id)}
                              className="flex-fill"
                            >
                              ✏️ {t('common.edit', 'Edit')}
                            </Button>
                            <Dropdown>
                              <Dropdown.Toggle variant="outline-secondary" size="sm">
                                ⋮
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleDelete(visit.id)} className="text-danger">
                                  🗑️ {t('common.delete', 'Delete')}
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
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
                          <th>Date & Time</th>
                          <th>Patient</th>
                          <th>Dietitian</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Duration</th>
                          <th>Actions</th>
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
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="d-flex gap-1">
                                {canEdit(visit) && (
                                  <>
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => handleEditClick(visit.id)}
                                      title={t('common.edit', 'Edit')}
                                    >
                                      ✏️
                                    </Button>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleDelete(visit.id)}
                                      title={t('common.delete', 'Delete')}
                                    >
                                      🗑️
                                    </Button>
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
              {!loading && visits.length > 0 && pagination.totalPages > 1 && (
                <div className="visits-pagination mt-3">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="text-muted small">
                      Showing page {filters.page} of {pagination.totalPages} ({pagination.total} total visits)
                    </div>
                    <div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        disabled={filters.page === 1}
                        onClick={() => handleFilterChange('page', filters.page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        disabled={filters.page >= pagination.totalPages}
                        onClick={() => handleFilterChange('page', filters.page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        ) : (
          /* Timeline View */
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3">Loading visit timeline...</p>
                </div>
              ) : visits.length === 0 ? (
                <div className="text-center py-5">
                  <h3>No visits found</h3>
                  <p className="text-muted">Try adjusting your filters or create a new visit</p>
                </div>
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
                                <Col md={8}>
                                  <div className="d-flex align-items-center mb-2">
                                    <h5 className="mb-0 me-3">
                                      📅 {formatDate(visit.visit_date)}
                                    </h5>
                                    {getStatusBadge(visit.status)}
                                  </div>
                                  <div className="timeline-meta">
                                    <strong>Patient:</strong> {visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : 'Unknown'} |
                                    <strong> Dietitian:</strong> {visit.dietitian ? `${visit.dietitian.first_name} ${visit.dietitian.last_name}` : 'Unknown'} |
                                    <strong> Type:</strong> {visit.visit_type || 'General'} |
                                    <strong> Duration:</strong> {visit.duration_minutes ? `${visit.duration_minutes} min` : 'N/A'}
                                  </div>
                                  {visit.chief_complaint && (
                                    <div className="mt-2">
                                      <strong>Chief Complaint:</strong> {visit.chief_complaint}
                                    </div>
                                  )}
                                  {visit.assessment && (
                                    <div className="mt-2">
                                      <strong>Assessment:</strong> {visit.assessment}
                                    </div>
                                  )}
                                </Col>
                                <Col md={4} className="text-end">
                                  <div
                                    className="timeline-actions d-flex gap-1 justify-content-end"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {canEdit(visit) && (
                                      <>
                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          onClick={() => handleEditClick(visit.id)}
                                          title={t('common.edit', 'Edit')}
                                        >
                                          ✏️
                                        </Button>
                                        <Button
                                          variant="outline-danger"
                                          size="sm"
                                          onClick={() => handleDelete(visit.id)}
                                          title={t('common.delete', 'Delete')}
                                        >
                                          🗑️
                                        </Button>
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
      </Container>
    </Layout>
  );
};

export default VisitsPage;
