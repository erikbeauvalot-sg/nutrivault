/**
 * Patients Page Component
 * Wrapper for patient management with table view and modal-based CRUD
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Button, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import PatientList from '../components/PatientList';
import PatientDetailModal from '../components/PatientDetailModal';
import CreatePatientModal from '../components/CreatePatientModal';
import EditPatientModal from '../components/EditPatientModal';
import ExportModal from '../components/ExportModal';
import api from '../services/api';

const PatientsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [viewingPatientId, setViewingPatientId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/patients');
      // Handle both POC format and new API format
      const patientsData = response.data.data || response.data;
      setPatients(Array.isArray(patientsData) ? patientsData : []);
      setError(null);
    } catch (err) {
      setError('Failed to load patients: ' + (err.response?.data?.error || err.message));
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async (patientData) => {
    try {
      const response = await api.post('/api/patients', patientData);
      const newPatient = response.data.data || response.data;
      setPatients([newPatient, ...patients]);
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to create patient: ' + (err.response?.data?.error || err.message));
      return false;
    }
  };

  const handleUpdatePatient = async (id, patientData) => {
    try {
      const response = await api.put(`/api/patients/${id}`, patientData);
      const updatedPatient = response.data.data || response.data;
      setPatients(patients.map(p => p.id === id ? updatedPatient : p));
      setEditingPatient(null);
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to update patient: ' + (err.response?.data?.error || err.message));
      return false;
    }
  };

  const handleDeletePatient = async (id) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) {
      return;
    }

    try {
      await api.delete(`/api/patients/${id}`);
      setPatients(patients.filter(p => p.id !== id));
      setError(null);
    } catch (err) {
      setError('Failed to delete patient: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEditPatient = (patient) => {
    setEditingPatient(patient);
    setShowEditModal(true);
  };

  const handleViewPatient = (patient) => {
    setViewingPatientId(patient.id);
    setShowViewModal(true);
  };

  const handleScheduleVisit = (patient) => {
    // Navigate to visits page with patient pre-selected
    navigate('/visits', { state: { selectedPatient: patient } });
  };

  const handleCloseViewModal = () => {
    setViewingPatientId(null);
    setShowViewModal(false);
  };

  const handleShowCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingPatient(null);
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
        <Row className="mb-4">
          <Col>
            <h1 className="mb-0">Patient Management</h1>
          </Col>
          <Col xs="auto">
            <Button
              variant="outline-secondary"
              onClick={() => setShowExportModal(true)}
              className="d-flex align-items-center me-2"
            >
              <i className="bi bi-download me-2"></i>
              {t('common.export', 'Export')}
            </Button>
            {canCreatePatients && (
              <Button
                variant="primary"
                onClick={handleShowCreateModal}
                className="d-flex align-items-center"
              >
                <i className="bi bi-plus-circle me-2"></i>
                Create Patient
              </Button>
            )}
          </Col>
        </Row>

        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <strong>Error:</strong> {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError(null)}
              aria-label="Close"
            ></button>
          </div>
        )}

        <div className="bg-white p-4 rounded shadow-sm">
          <PatientList
            patients={patients}
            loading={loading}
            onEdit={canEditPatients ? handleEditPatient : null}
            onDelete={canDeletePatients ? handleDeletePatient : null}
            onView={handleViewPatient}
            onScheduleVisit={handleScheduleVisit}
          />
        </div>
      </Container>

      {/* Modals */}
      <CreatePatientModal
        show={showCreateModal}
        onHide={handleCloseCreateModal}
        onSubmit={handleCreatePatient}
      />

      <EditPatientModal
        show={showEditModal}
        onHide={handleCloseEditModal}
        onSubmit={handleUpdatePatient}
        patient={editingPatient}
      />

      <PatientDetailModal
        patientId={viewingPatientId}
        show={showViewModal}
        onHide={handleCloseViewModal}
        onScheduleVisit={handleScheduleVisit}
      />

      <ExportModal
        show={showExportModal}
        onHide={() => setShowExportModal(false)}
        dataType="patients"
      />
    </Layout>
  );
};

export default PatientsPage;
