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
import ExportModal from '../components/ExportModal';
import api from '../services/api';

const PatientsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const handleCreatePatient = () => {
    navigate('/patients/create');
  };

  const handleEditPatient = (patient) => {
    navigate(`/patients/${patient.id}/edit`);
  };

  const handleScheduleVisit = (patient) => {
    // Navigate to visits page with patient pre-selected
    navigate('/visits', { state: { selectedPatient: patient } });
  };

  const handleViewDetails = (patient) => {
    // Navigate to patient detail page
    navigate(`/patients/${patient.id}`);
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
            <h1 className="mb-0">{t('patients.management')}</h1>
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
                onClick={handleCreatePatient}
                className="d-flex align-items-center"
              >
                <i className="bi bi-plus-circle me-2"></i>
                {t('patients.createPatient')}
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
            onViewDetails={handleViewDetails}
            onScheduleVisit={handleScheduleVisit}
          />
        </div>
      </Container>

      {/* Modals */}
      <ExportModal
        show={showExportModal}
        onHide={() => setShowExportModal(false)}
        dataType="patients"
      />
    </Layout>
  );
};

export default PatientsPage;
