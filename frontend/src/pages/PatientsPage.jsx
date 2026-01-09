/**
 * Patients Page Component
 * Wrapper for existing POC patient management components with new layout
 */

import { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import Layout from '../components/layout/Layout';
import PatientForm from '../components/PatientForm';
import PatientList from '../components/PatientList';
import api from '../services/api';

const PatientsPage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingPatient(null);
  };

  return (
    <Layout>
      <Container fluid>
        <h1 className="mb-4">Patient Management</h1>

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

        <div className="bg-white p-4 rounded shadow-sm mb-4">
          <PatientForm
            onSubmit={editingPatient ? handleUpdatePatient : handleCreatePatient}
            editingPatient={editingPatient}
            onCancel={handleCancelEdit}
          />
        </div>

        <div className="bg-white p-4 rounded shadow-sm">
          <PatientList
            patients={patients}
            loading={loading}
            onEdit={handleEditPatient}
            onDelete={handleDeletePatient}
          />
        </div>
      </Container>
    </Layout>
  );
};

export default PatientsPage;
