import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Spinner,
  Alert,
  Badge,
  Pagination,
} from 'react-bootstrap';
import { Calendar2, PersonFill, PlusCircle, ArrowLeft } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { getPatient } from '../../services/patientService';
import { getPatientVisits } from '../../services/visitService';
import MeasurementChart from '../../components/charts/MeasurementChart';
import { format } from 'date-fns';

const PatientVisitHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVisits, setTotalVisits] = useState(0);
  const itemsPerPage = 25;

  useEffect(() => {
    fetchData();
  }, [id, currentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch patient and visits in parallel
      const [patientResponse, visitsResponse] = await Promise.all([
        getPatient(id),
        getPatientVisits(id, { page: currentPage, limit: itemsPerPage }),
      ]);
      
      setPatient(patientResponse.data);
      setVisits(visitsResponse.data || []);
      setTotalPages(visitsResponse.pagination?.totalPages || 1);
      setTotalVisits(visitsResponse.pagination?.totalItems || 0);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      Scheduled: 'primary',
      Completed: 'success',
      Cancelled: 'danger',
      'In Progress': 'warning',
    };
    return <Badge bg={statusMap[status] || 'secondary'}>{status}</Badge>;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
    } catch (err) {
      return dateString;
    }
  };

  // Pagination renderer
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return (
      <Pagination className="justify-content-center">
        <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
        <Pagination.Prev onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} />
        
        {startPage > 1 && (
          <>
            <Pagination.Item onClick={() => setCurrentPage(1)}>1</Pagination.Item>
            {startPage > 2 && <Pagination.Ellipsis disabled />}
          </>
        )}
        
        {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
          <Pagination.Item
            key={page}
            active={page === currentPage}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </Pagination.Item>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <Pagination.Ellipsis disabled />}
            <Pagination.Item onClick={() => setCurrentPage(totalPages)}>{totalPages}</Pagination.Item>
          </>
        )}
        
        <Pagination.Next onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} />
        <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
      </Pagination>
    );
  };

  if (loading && !patient) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading visit history...</p>
        </div>
      </Container>
    );
  }

  if (error && !patient) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Data</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={() => navigate('/patients')}>
            Back to Patients
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button
                variant="link"
                className="ps-0"
                onClick={() => navigate(`/patients/${id}`)}
              >
                <ArrowLeft className="me-2" />
                Back to Patient Details
              </Button>
              <h2>
                <Calendar2 className="me-2" />
                Visit History
              </h2>
              {patient && (
                <h4 className="text-muted">
                  <PersonFill className="me-2" />
                  {patient.firstName} {patient.lastName}
                </h4>
              )}
            </div>
            <Link to="/visits/create">
              <Button variant="primary">
                <PlusCircle className="me-2" />
                Schedule Visit
              </Button>
            </Link>
          </div>
        </Col>
      </Row>

      {/* Patient Summary Card */}
      {patient && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Body>
                <Row>
                  <Col md={3}>
                    <strong>Email:</strong> {patient.email || 'N/A'}
                  </Col>
                  <Col md={3}>
                    <strong>Phone:</strong> {patient.phone || 'N/A'}
                  </Col>
                  <Col md={3}>
                    <strong>Date of Birth:</strong>{' '}
                    {patient.dateOfBirth
                      ? format(new Date(patient.dateOfBirth), 'MMM dd, yyyy')
                      : 'N/A'}
                  </Col>
                  <Col md={3}>
                    <strong>Total Visits:</strong> {totalVisits}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Measurement History Chart */}
      {patient && (
        <Row className="mb-4">
          <Col>
            <MeasurementChart patientId={id} />
          </Col>
        </Row>
      )}

      {/* Results Info */}
      <Row className="mb-3">
        <Col>
          <p className="text-muted">
            Showing {visits.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
            {Math.min(currentPage * itemsPerPage, totalVisits)} of {totalVisits} visits
          </p>
        </Col>
      </Row>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      {/* Visits Table */}
      {!loading && (
        <>
          <Row>
            <Col>
              <Card>
                <Card.Body>
                  <Table responsive striped bordered hover>
                    <thead>
                      <tr>
                        <th>Visit Date</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Dietitian</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visits.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4">
                            <Calendar2 size={48} className="text-muted mb-3" />
                            <p className="text-muted">No visits found for this patient</p>
                            <Link to="/visits/create">
                              <Button variant="primary" size="sm">
                                Schedule First Visit
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ) : (
                        visits.map((visit) => (
                          <tr key={visit.id}>
                            <td>{formatDateTime(visit.visitDate)}</td>
                            <td>{visit.visitType}</td>
                            <td>{getStatusBadge(visit.status)}</td>
                            <td>
                              {visit.User?.firstName} {visit.User?.lastName}
                            </td>
                            <td>
                              {visit.notes
                                ? visit.notes.substring(0, 50) + (visit.notes.length > 50 ? '...' : '')
                                : 'No notes'}
                            </td>
                            <td>
                              <Link to={`/visits/${visit.id}`}>
                                <Button variant="info" size="sm" className="me-2">
                                  View
                                </Button>
                              </Link>
                              {visit.status !== 'Completed' && visit.status !== 'Cancelled' && (
                                <Link to={`/visits/${visit.id}/edit`}>
                                  <Button variant="warning" size="sm">
                                    Edit
                                  </Button>
                                </Link>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Pagination */}
          {visits.length > 0 && (
            <Row className="mt-3">
              <Col>{renderPagination()}</Col>
            </Row>
          )}
        </>
      )}
    </Container>
  );
};

export default PatientVisitHistory;

