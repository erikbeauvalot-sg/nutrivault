/**
 * Patient List Page
 * Displays all patients with search, filter, and pagination
 */

import { useState, useEffect } from 'react';
import { Container, Table, Button, Form, InputGroup, Spinner, Alert, Pagination } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { Search, Plus } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import patientService from '../../services/patientService';

export function PatientListPage() {
  const location = useLocation();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 25;

  useEffect(() => {
    loadPatients();
  }, [currentPage, search]);

  useEffect(() => {
    // Show toast on success navigation
    if (location.state?.message) {
      toast.success(location.state.message);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {};
      if (search) {
        filters.search = search;
      }

      const response = await patientService.getPatients(filters, currentPage, itemsPerPage);
      setPatients(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalCount(response.pagination?.totalCount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    // First page
    if (startPage > 1) {
      items.push(
        <Pagination.First key="first" onClick={() => handlePageChange(1)} />
      );
      items.push(
        <Pagination.Prev key="prev" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
      );
    }

    // Page numbers
    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === currentPage}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Pagination.Item>
      );
    }

    // Last page
    if (endPage < totalPages) {
      items.push(
        <Pagination.Next key="next" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
      );
      items.push(
        <Pagination.Last key="last" onClick={() => handlePageChange(totalPages)} />
      );
    }

    return <Pagination className="justify-content-center mt-4">{items}</Pagination>;
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Patients</h1>
        <Button as={Link} to="/patients/new" variant="primary">
          <Plus size={20} className="me-2" />
          Add New Patient
        </Button>
      </div>

      <div className="mb-3">
        <InputGroup>
          <InputGroup.Text>
            <Search />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={handleSearchChange}
          />
        </InputGroup>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : patients.length === 0 ? (
        <Alert variant="info">
          {search ? 'No patients found matching your search.' : 'No patients yet. Click "Add New Patient" to get started.'}
        </Alert>
      ) : (
        <>
          <div className="mb-2 text-muted">
            Showing {patients.length} of {totalCount} patients
          </div>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Date of Birth</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <Link to={`/patients/${patient.id}`}>
                      {patient.firstName} {patient.lastName}
                    </Link>
                  </td>
                  <td>{patient.email || '-'}</td>
                  <td>{patient.phone || '-'}</td>
                  <td>{formatDate(patient.dateOfBirth)}</td>
                  <td>{formatDate(patient.createdAt)}</td>
                  <td>
                    <Button
                      as={Link}
                      to={`/patients/${patient.id}/edit`}
                      variant="outline-primary"
                      size="sm"
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {renderPagination()}
        </>
      )}
    </Container>
  );
}

export default PatientListPage;
