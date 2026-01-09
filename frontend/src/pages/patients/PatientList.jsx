/**
 * Patient List Page
 * Displays all patients with search, filter, and pagination
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
      console.log('[PatientList] Patients response:', response);
      // Response is {patients: [], total: number, limit: number, offset: number}
      setPatients(response.patients || []);
      const total = response.total || 0;
      setTotalPages(Math.ceil(total / itemsPerPage));
      setTotalCount(total);
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
        <li key="first" className="page-item">
          <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); handlePageChange(1); }}>
            First
          </a>
        </li>
      );
      items.push(
        <li key="prev" className="page-item">
          <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} style={{ pointerEvents: currentPage === 1 ? 'none' : 'auto', opacity: currentPage === 1 ? 0.5 : 1 }}>
            Previous
          </a>
        </li>
      );
    }

    // Page numbers
    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
          <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); handlePageChange(page); }}>
            {page}
          </a>
        </li>
      );
    }

    // Last page
    if (endPage < totalPages) {
      items.push(
        <li key="next" className="page-item">
          <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} style={{ pointerEvents: currentPage === totalPages ? 'none' : 'auto', opacity: currentPage === totalPages ? 0.5 : 1 }}>
            Next
          </a>
        </li>
      );
      items.push(
        <li key="last" className="page-item">
          <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); handlePageChange(totalPages); }}>
            Last
          </a>
        </li>
      );
    }

    return (
      <nav aria-label="Patient pagination" className="mt-4">
        <ul className="pagination justify-content-center">
          {items}
        </ul>
      </nav>
    );
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Patients</h1>
        <a href="/patients/new" className="btn btn-primary">
          <i className="fas fa-plus me-2"></i>
          Add New Patient
        </a>
      </div>

      <div className="mb-3">
        <div className="input-group">
          <div className="input-group-prepend">
            <span className="input-group-text">
              <i className="fas fa-search"></i>
            </span>
          </div>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : patients.length === 0 ? (
        <div className="alert alert-info">
          {search ? 'No patients found matching your search.' : 'No patients yet. Click "Add New Patient" to get started.'}
        </div>
      ) : (
        <>
          <div className="mb-2 text-muted">
            Showing {patients.length} of {totalCount} patients
          </div>
          <table className="table table-bordered table-striped table-hover">
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
                    <a href={`/patients/${patient.id}`}>
                      {patient.firstName} {patient.lastName}
                    </a>
                  </td>
                  <td>{patient.email || '-'}</td>
                  <td>{patient.phone || '-'}</td>
                  <td>{formatDate(patient.dateOfBirth)}</td>
                  <td>{formatDate(patient.createdAt)}</td>
                  <td>
                    <a
                      href={`/patients/${patient.id}/edit`}
                      className="btn btn-primary btn-sm"
                    >
                      Edit
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {renderPagination()}
        </>
      )}
    </div>
  );
}

export default PatientListPage;
