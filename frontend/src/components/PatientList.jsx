import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Badge, Form, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner, Pagination, SwipeableListItem } from './common';
import { useIsMobile } from '../hooks';
import ActionButton from './ActionButton';
import './PatientList.css';

/** Deterministic color from initials */
const AVATAR_COLORS = [
  '#5b8c6a', '#7a6b4e', '#4a7c8f', '#8f6a4a',
  '#6a5b8c', '#8c5b6a', '#4a8f6d', '#7c6a3e',
];

function getInitials(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?';
}

function getAvatarColor(first, last) {
  const code = ((first || '') + (last || '')).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function PatientList({
  patients,
  loading,
  onEdit,
  onDelete,
  onViewDetails,
  onScheduleVisit,
  searchTerm = '',
  statusFilter = 'all',
  currentPage = 1,
  totalPages = 1,
  totalPatients = 0,
  onSearchChange,
  onStatusFilterChange,
  onPageChange
}) {
  const { t, i18n } = useTranslation();
  const [sortField, setSortField] = useState('last_name');
  const [sortDirection, setSortDirection] = useState('asc');
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const itemsPerPage = 10;

  const displayPatients = patients;

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

  const handleRowClick = (patient) => {
    if (onViewDetails) {
      onViewDetails(patient);
    } else {
      navigate(`/patients/${patient.id}`);
    }
  };

  if (loading) {
    return <LoadingSpinner message={t('common.loading')} />;
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
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            />
          </InputGroup>

          <Form.Select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange && onStatusFilterChange(e.target.value)}
            className="patient-status-filter"
          >
            <option value="all">{t('common.all', 'All')}</option>
            <option value="active">{t('common.active', 'Active')}</option>
            <option value="inactive">{t('common.inactive', 'Inactive')}</option>
          </Form.Select>
        </div>

        <div className="text-muted patient-results-count">
          {t('patients.showingResults', {
            count: displayPatients.length,
            total: totalPatients,
            defaultValue: 'Showing {{count}} of {{total}} patients'
          })}
        </div>
      </div>

      {isMobile ? (
        /* ── Mobile: Compact unified rows with swipe-to-delete ── */
        displayPatients.length === 0 ? (
          <div className="patient-empty-state">
            <div className="text-muted text-center py-4">
              {patients.length > 0 ? (
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
          </div>
        ) : (
          <div className="patient-rows">
            {displayPatients.map(patient => {
              const initials = getInitials(patient.first_name, patient.last_name);
              const avatarBg = getAvatarColor(patient.first_name, patient.last_name);

              const row = (
                <div
                  className={`patient-row-compact${patient.is_linked === false ? ' patient-row-unlinked' : ''}`}
                  onClick={() => handleRowClick(patient)}
                >
                  <div className="patient-avatar" style={{ backgroundColor: avatarBg }}>
                    {initials}
                  </div>
                  <div className="patient-name">
                    {patient.first_name} {patient.last_name}
                  </div>
                  <div className="patient-phone">
                    {patient.phone || '-'}
                  </div>
                  <div
                    className={`patient-status-dot ${patient.is_active ? 'active' : 'inactive'}`}
                    title={patient.is_active ? t('common.active') : t('common.inactive')}
                  />
                </div>
              );

              if (onDelete) {
                return (
                  <SwipeableListItem
                    key={patient.id}
                    onSwipeAction={() => onDelete(patient.id)}
                    actionLabel={t('common.delete', 'Delete')}
                    actionIcon="🗑️"
                  >
                    {row}
                  </SwipeableListItem>
                );
              }

              return <div key={patient.id}>{row}</div>;
            })}
          </div>
        )
      ) : (
        /* ── Desktop: Original table view ── */
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
                {displayPatients.length > 0 && displayPatients[0].custom_fields?.map(field => (
                  <th key={field.definition_id}>
                    {field.field_label}
                  </th>
                ))}
                <th onClick={() => handleSort('is_active')} style={{ cursor: 'pointer' }}>
                  {t('patients.status', 'Status')} {getSortIcon('is_active')}
                </th>
                <th>{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {displayPatients.length === 0 ? (
                <tr>
                  <td colSpan={5 + (patients.length > 0 && patients[0].custom_fields?.length || 0)} className="text-center py-4">
                    <div className="text-muted">
                      {displayPatients.length === 0 && patients.length > 0 ? (
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
                displayPatients.map(patient => (
                  <tr
                    key={patient.id}
                    onClick={() => handleRowClick(patient)}
                    style={{ cursor: onViewDetails ? 'pointer' : 'default', opacity: patient.is_linked === false ? 0.7 : 1 }}
                    className="patient-row"
                  >
                    <td>
                      <div>
                        <strong>{patient.first_name} {patient.last_name}</strong>
                        {patient.is_linked === false && (
                          <Badge bg="light" text="dark" className="ms-2 border" style={{ fontSize: '0.65em' }}>
                            {t('patients.notLinked', 'Non lié')}
                          </Badge>
                        )}
                        {patient.assigned_dietitian && (
                          <div className="text-muted small">
                            {patient.assigned_dietitian.first_name} {patient.assigned_dietitian.last_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{patient.email || '-'}</td>
                    <td>{patient.phone || '-'}</td>
                    {patient.custom_fields?.map(field => (
                      <td key={field.definition_id}>
                        {field.value || '-'}
                      </td>
                    ))}
                    <td>
                      <Badge bg={patient.is_active ? 'success' : 'secondary'}>
                        {patient.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons">
                        {onScheduleVisit && (
                          <ActionButton
                            action="schedule"
                            onClick={() => onScheduleVisit(patient)}
                            title={t('visits.scheduleVisit')}
                          />
                        )}
                        {onEdit && (
                          <ActionButton
                            action="edit"
                            onClick={() => onEdit(patient)}
                            title={t('common.edit')}
                          />
                        )}
                        {onDelete && (
                          <ActionButton
                            action="delete"
                            onClick={() => onDelete(patient.id)}
                            title={t('common.delete')}
                          />
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
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalPatients}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => onPageChange && onPageChange(page)}
        showInfo
        className="mt-3"
      />
    </div>
  );
}

export default PatientList;
