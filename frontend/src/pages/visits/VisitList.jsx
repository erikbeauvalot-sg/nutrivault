import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Table, Button, Form, Spinner, Badge, Pagination, Alert } from 'react-bootstrap';
import { Calendar2, PersonFill, PlusCircle, Search } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { getVisits } from '../../services/visitService';
import { format } from 'date-fns';

const VisitList = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVisits, setTotalVisits] = useState(0);
  const itemsPerPage = 25;
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Fetch visits
  useEffect(() => {
    fetchVisits();
  }, [currentPage, searchTerm, filterType, filterStatus, filterStartDate, filterEndDate]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: currentPage,
        limit: itemsPerPage,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (filterType) params.visitType = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
      
      const response = await getVisits(params);
      setVisits(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalVisits(response.pagination?.totalItems || 0);
    } catch (err) {
      console.error('Error fetching visits:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleFilterChange = (filterName, value) => {
    if (filterName === 'type') setFilterType(value);
    if (filterName === 'status') setFilterStatus(value);
    if (filterName === 'startDate') setFilterStartDate(value);
    if (filterName === 'endDate') setFilterEndDate(value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('');
    setFilterStatus('');
    setFilterStartDate('');
    setFilterEndDate('');
    setCurrentPage(1);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (err) {
      return dateString;
    }
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

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>
              <Calendar2 className="me-2" />
              Visits
            </h2>
            <Link to="/visits/create">
              <Button variant="primary">
                <PlusCircle className="me-2" />
                Schedule Visit
              </Button>
            </Link>
          </div>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Row className="mb-4">
        <Col md={12}>
          <div className="bg-light p-3 rounded">
            <Row>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Search</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type="text"
                      placeholder="Search visits..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                    <Search className="position-absolute top-50 end-0 translate-middle-y me-2" />
                  </div>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Visit Type</Form.Label>
                  <Form.Select
                    value={filterType}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="Initial Consultation">Initial Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Nutrition Assessment">Nutrition Assessment</option>
                    <option value="Meal Planning">Meal Planning</option>
                    <option value="Weight Management">Weight Management</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={filterStatus}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="In Progress">In Progress</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={1} className="d-flex align-items-end">
                <Button variant="outline-secondary" onClick={clearFilters} className="w-100">
                  Clear
                </Button>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>

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

      {/* Error State */}
      {error && !loading && (
        <Alert variant="danger">
          <Alert.Heading>Error Loading Visits</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchVisits}>
            Try Again
          </Button>
        </Alert>
      )}

      {/* Visits Table */}
      {!loading && !error && (
        <>
          <Row>
            <Col>
              <Table responsive striped bordered hover>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Visit Date</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Dietitian</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <PersonFill size={48} className="text-muted mb-3" />
                        <p className="text-muted">No visits found</p>
                        <Link to="/visits/create">
                          <Button variant="primary" size="sm">
                            Schedule Your First Visit
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    visits.map((visit) => (
                      <tr key={visit.id}>
                        <td>
                          <Link to={`/patients/${visit.patientId}`}>
                            {visit.Patient?.firstName} {visit.Patient?.lastName}
                          </Link>
                        </td>
                        <td>{formatDateTime(visit.visitDate)}</td>
                        <td>{visit.visitType}</td>
                        <td>{getStatusBadge(visit.status)}</td>
                        <td>
                          {visit.User?.firstName} {visit.User?.lastName}
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
            </Col>
          </Row>

          {/* Pagination */}
          {visits.length > 0 && (
            <Row>
              <Col>{renderPagination()}</Col>
            </Row>
          )}
        </>
      )}
    </Container>
  );
};

export default VisitList;
