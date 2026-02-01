/**
 * Patients Page Component
 * Wrapper for patient management with table view and modal-based CRUD
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { PageHeader, PageError } from '../components/common';
import PatientList from '../components/PatientList';
import ExportModal from '../components/ExportModal';
import QuickPatientModal from '../components/QuickPatientModal';
import ConfirmModal from '../components/ConfirmModal';
import { getPatients, deletePatient } from '../services/patientService';

const PatientsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showQuickPatientModal, setShowQuickPatientModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);

  // Initialize filters from URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlIsActive = searchParams.get('is_active');

    if (urlIsActive === 'true') {
      setStatusFilter('active');
    } else if (urlIsActive === 'false') {
      setStatusFilter('inactive');
    }
  }, [location.search]);

  useEffect(() => {
    fetchPatients();
  }, [searchTerm, statusFilter, currentPage]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      // Build filters object for patient service
      const filters = {};
      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }
      if (statusFilter !== 'all') {
        filters.is_active = statusFilter === 'active';
      }
      filters.page = currentPage;
      filters.limit = 10; // Match PatientList itemsPerPage

      const { data, pagination } = await getPatients(filters);

      setPatients(Array.isArray(data) ? data : []);
      setTotalPages(pagination?.totalPages || 1);
      setTotalPatients(pagination?.totalCount || data?.length || 0);
      setError(null);
    } catch (err) {
      setError(t('errors.failedToLoadPatients', { error: err.response?.data?.error || err.message }));
    } finally {
      setLoading(false);
    }
  };


  const handleDeletePatient = (id) => {
    setPatientToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePatient = async () => {
    if (!patientToDelete) return;

    try {
      await deletePatient(patientToDelete);
      setPatients(patients.filter(p => p.id !== patientToDelete));
      setError(null);
    } catch (err) {
      setError(t('errors.failedToDeletePatient', { error: err.response?.data?.error || err.message }));
    } finally {
      setPatientToDelete(null);
    }
  };

  const handleCreatePatient = () => {
    setShowQuickPatientModal(true);
  };

  const handlePatientCreated = () => {
    setShowQuickPatientModal(false);
    fetchPatients(); // Refresh the patient list
  };

  const handleEditPatient = (patient) => {
    navigate(`/patients/${patient.id}/edit`);
  };

  const handleViewDetails = (patient) => {
    navigate(`/patients/${patient.id}`);
  };

  const handleScheduleVisit = (patient) => {
    // Navigate directly to visit creation page with patient pre-selected
    navigate('/visits/create', { state: { selectedPatient: patient } });
  };

  const handleSearchChange = (search) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Check if user can create patients (ADMIN, DIETITIAN)
  const canCreatePatients = user?.role === 'ADMIN' || user?.role === 'DIETITIAN';

  // Check if user can edit patients (ADMIN, DIETITIAN)
  const canEditPatients = user?.role === 'ADMIN' || user?.role === 'DIETITIAN';

  // Check if user can delete patients (ADMIN, DIETITIAN)
  const canDeletePatients = user?.role === 'ADMIN' || user?.role === 'DIETITIAN';

  return (
    <Layout>
      <Container fluid>
        <PageHeader
          title={t('patients.management')}
          actions={[
            {
              label: t('common.export', 'Export'),
              onClick: () => setShowExportModal(true),
              variant: 'outline-secondary',
              icon: 'bi-download'
            },
            {
              label: t('patients.createPatient'),
              onClick: handleCreatePatient,
              variant: 'primary',
              icon: 'bi-plus-circle',
              hidden: !canCreatePatients
            }
          ]}
        />

        <PageError error={error} onDismiss={() => setError(null)} />

        <div className="bg-white p-4 rounded shadow-sm">
          <PatientList
            patients={patients}
            loading={loading}
            onEdit={canEditPatients ? handleEditPatient : null}
            onDelete={canDeletePatients ? handleDeletePatient : null}
            onViewDetails={handleViewDetails}
            onScheduleVisit={handleScheduleVisit}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            currentPage={currentPage}
            totalPages={totalPages}
            totalPatients={totalPatients}
            onSearchChange={handleSearchChange}
            onStatusFilterChange={handleStatusFilterChange}
            onPageChange={handlePageChange}
          />
        </div>
      </Container>

      {/* Modals */}
      <ExportModal
        show={showExportModal}
        onHide={() => setShowExportModal(false)}
        dataType="patients"
      />

      <QuickPatientModal
        show={showQuickPatientModal}
        onHide={() => setShowQuickPatientModal(false)}
        onSuccess={handlePatientCreated}
      />

      <ConfirmModal
        show={showDeleteConfirm}
        onHide={() => {
          setShowDeleteConfirm(false);
          setPatientToDelete(null);
        }}
        onConfirm={confirmDeletePatient}
        title={t('common.confirmation', 'Confirmation')}
        message={t('patients.confirmDelete')}
        confirmLabel={t('common.delete', 'Delete')}
        variant="danger"
      />
    </Layout>
  );
};

export default PatientsPage;
