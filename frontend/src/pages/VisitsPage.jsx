/**
 * VisitsPage Component
 * Visit management with list, filters, and basic actions
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import visitService from '../services/visitService';
import { getPatients } from '../services/patientService';

const VisitsPage = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    fetchPatients();
    fetchVisits();
  }, [filters]);

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
      setError(err.response?.data?.error || 'Failed to load visits');
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDelete = async (visitId) => {
    if (!window.confirm('Are you sure you want to delete this visit?')) return;

    try {
      await visitService.deleteVisit(visitId);
      fetchVisits();
    } catch (err) {
      console.error('Error deleting visit:', err);
      alert(err.response?.data?.error || 'Failed to delete visit');
    }
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
    if (user.role === 'ADMIN') return true;
    if (user.role === 'DIETITIAN' && visit.dietitian_id === user.id) return true;
    return false;
  };

  return (
    <Layout>
      <Container fluid>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>📅 Visits</h1>
          <Button variant="primary" size="lg">
            Create Visit (Coming Soon)
          </Button>
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

        {/* Visits Table */}
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
            ) : (
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
                        <tr key={visit.id}>
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
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              disabled
                            >
                              View
                            </Button>
                            {canEdit(visit) && (
                              <>
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  className="me-2"
                                  disabled
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDelete(visit.id)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
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
                )}
              </>
            )}
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default VisitsPage;
