/**
 * Edit Patient Page
 * Form to edit an existing patient
 */

import { useState, useEffect } from 'react';
import { Container, Card, Alert, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PatientForm from '../../components/forms/PatientForm';
import patientService from '../../services/patientService';

export function EditPatientPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPatient();
  }, [id]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await patientService.getPatient(id);
      setPatient(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      setError(null);

      await patientService.updatePatient(id, data);
      
      // Navigate to patient details with success message
      navigate(`/patients/${id}`, {
        state: { message: 'Patient updated successfully', variant: 'success' }
      });
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/patients/${id}`);
  };

  if (loading) {
    return (
      <Container>
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (error && !patient) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container>
      <h1 className="mb-4">Edit Patient</h1>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <PatientForm
            initialData={patient}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </Card.Body>
      </Card>
    </Container>
  );
}

export default EditPatientPage;
