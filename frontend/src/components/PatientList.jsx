import { useState, useEffect } from 'react';
import { Table, Button, Badge, Form, InputGroup, Pagination, Card, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import './PatientList.css';

function PatientList({ patients, loading, onEdit, onDelete, onViewDetails, onScheduleVisit }) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('last_name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const itemsPerPage = 10;

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter and sort patients
  const filteredAndSortedPatients = patients
    .filter(patient => {
      const matchesSearch = !searchTerm ||
        `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (patient.phone && patient.phone.includes(searchTerm));

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && patient.is_active) ||
        (statusFilter === 'inactive' && !patient.is_active);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
      if (bValue == null) return sortDirection === 'asc' ? 1 : -1;

      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = filteredAndSortedPatients.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{t('common.loading')}</span>
        </div>
        <div className="mt-2">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filter Controls */}
      <div className="patient-list-controls mb-3">
        <div className="patient-list-filters">
          <InputGroup className="patient-search-input">
            <InputGroup.Text>🔍</InputGroup.Text>
            <Form.Control
              type="text"
              placeholder={t('patients.searchPlaceholder', 'Search by name, email, or phone')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="patient-status-filter"
          >
            <option value="all">{t('common.all', 'All')}</option>
            <option value="active">{t('common.active', 'Active')}</option>
            <option value="inactive">{t('common.inactive', 'Inactive')}</option>
          </Form.Select>
        </div>

        <div className="text-muted patient-results-count">
          {t('patients.showingResults', {
            count: paginatedPatients.length,
            total: filteredAndSortedPatients.length,
            defaultValue: 'Showing {{count}} of {{total}} patients'
          })}
        </div>
      </div>

      {/* Mobile Card View / Desktop Table View */}
      {isMobile ? (
        // Mobile Card View
        <div className="patient-cards-container">
          {paginatedPatients.length === 0 ? (
            <Card className="text-center py-4">
              <Card.Body>
                <div className="text-muted">
                  {filteredAndSortedPatients.length === 0 && patients.length > 0 ? (
                    <div>
                      <strong>{t('patients.noResults', 'No patients match your search criteria')}</strong>
                      <br />
                      <small>{t('patients.tryDifferentSearch', 'Try adjusting your search or filters')}</small>
                    </div>
                  ) : (
                    <div>
                      <strong>{t('patients.noPatients', 'No patients found')}</strong>
                      <br />
                      <small>{t('patients.createFirstPatient', 'Create your first patient to get started')}</small>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          ) : (
            paginatedPatients.map(patient => (
              <Card
                key={patient.id}
                className="patient-card mb-3"
                onClick={() => onViewDetails && onViewDetails(patient)}
                style={{ cursor: onViewDetails ? 'pointer' : 'default' }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1">
                        <strong>{patient.first_name} {patient.last_name}</strong>
                      </h6>
                      {patient.assigned_dietitian && (
                        <div className="text-muted small">
                          👨‍⚕️ {patient.assigned_dietitian.first_name} {patient.assigned_dietitian.last_name}
                        </div>
                      )}
                    </div>
                    <Badge bg={patient.is_active ? 'success' : 'secondary'}>
                      {patient.is_active ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </div>

                  {patient.email && (
                    <div className="small mb-1">
                      📧 {patient.email}
                    </div>
                  )}
                  {patient.phone && (
                    <div className="small mb-2">
                      📞 {patient.phone}
                    </div>
                  )}
                  {patient.date_of_birth && (
                    <div className="small text-muted mb-2">
                      🎂 {new Date(patient.date_of_birth).toLocaleDateString()}
                    </div>
                  )}

                  <div className="d-flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    {onScheduleVisit && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => onScheduleVisit(patient)}
                        className="flex-fill"
                      >
                        📅 {t('visits.scheduleVisit')}
                      </Button>
                    )}
                    <Dropdown>
                      <Dropdown.Toggle variant="outline-secondary" size="sm">
                        ⋮
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        {onEdit && (
                          <Dropdown.Item onClick={() => onEdit(patient)}>
                            ✏️ {t('common.edit')}
                          </Dropdown.Item>
                        )}
                        {onDelete && (
                          <Dropdown.Item onClick={() => onDelete(patient.id)} className="text-danger">
                            🗑️ {t('common.delete')}
                          </Dropdown.Item>
                        )}
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                </Card.Body>
              </Card>
            ))
          )}
        </div>
      ) : (
        // Desktop Table View
        <div className="table-responsive">
          <Table striped bordered hover>
            <thead className="table-dark">
              <tr>
                <th onClick={() => handleSort('last_name')} style={{ cursor: 'pointer' }}>
                  {t('patients.name', 'Name')} {getSortIcon('last_name')}
                </th>
                <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                  {t('patients.email', 'Email')} {getSortIcon('email')}
                </th>
                <th onClick={() => handleSort('phone')} style={{ cursor: 'pointer' }}>
                  {t('patients.phone', 'Phone')} {getSortIcon('phone')}
                </th>
                <th onClick={() => handleSort('date_of_birth')} style={{ cursor: 'pointer' }}>
                  {t('patients.dateOfBirth', 'Date of Birth')} {getSortIcon('date_of_birth')}
                </th>
                <th onClick={() => handleSort('is_active')} style={{ cursor: 'pointer' }}>
                  {t('patients.status', 'Status')} {getSortIcon('is_active')}
                </th>
                <th>{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <div className="text-muted">
                      {filteredAndSortedPatients.length === 0 && patients.length > 0 ? (
                        <div>
                          <strong>{t('patients.noResults', 'No patients match your search criteria')}</strong>
                          <br />
                          <small>{t('patients.tryDifferentSearch', 'Try adjusting your search or filters')}</small>
                        </div>
                      ) : (
                        <div>
                          <strong>{t('patients.noPatients', 'No patients found')}</strong>
                          <br />
                          <small>{t('patients.createFirstPatient', 'Create your first patient to get started')}</small>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPatients.map(patient => (
                  <tr
                    key={patient.id}
                    onClick={() => onViewDetails && onViewDetails(patient)}
                    style={{ cursor: onViewDetails ? 'pointer' : 'default' }}
                    className="patient-row"
                  >
                    <td>
                      <div>
                        <strong>{patient.first_name} {patient.last_name}</strong>
                        {patient.assigned_dietitian && (
                          <div className="text-muted small">
                            👨‍⚕️ {patient.assigned_dietitian.first_name} {patient.assigned_dietitian.last_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{patient.email || '-'}</td>
                    <td>{patient.phone || '-'}</td>
                    <td>
                      {patient.date_of_birth
                        ? new Date(patient.date_of_birth).toLocaleDateString()
                        : '-'
                      }
                    </td>
                    <td>
                      <Badge bg={patient.is_active ? 'success' : 'secondary'}>
                        {patient.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="d-flex gap-1">
                        {onScheduleVisit && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => onScheduleVisit(patient)}
                            title={t('visits.scheduleVisit')}
                          >
                            📅
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => onEdit(patient)}
                            title={t('common.edit')}
                          >
                            ✏️
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => onDelete(patient.id)}
                            title={t('common.delete')}
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-3">
          <Pagination>
            <Pagination.First
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            />
            <Pagination.Prev
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            />

            {[...Array(Math.min(5, totalPages))].map((_, index) => {
              const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + index;
              if (pageNumber > totalPages) return null;

              return (
                <Pagination.Item
                  key={pageNumber}
                  active={pageNumber === currentPage}
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </Pagination.Item>
              );
            })}

            <Pagination.Next
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            />
            <Pagination.Last
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            />
          </Pagination>
        </div>
      )}
    </div>
  );
}

export default PatientList;