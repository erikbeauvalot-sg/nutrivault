/**
 * Create Patient Page
 * Form to create a new patient
 */

import { useState } from 'react';
import { Container, Card, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PatientForm from '../../components/forms/PatientForm';
import patientService from '../../services/patientService';

export function CreatePatientPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      setError(null);

      await patientService.createPatient(data);
      
      // Navigate to patient list with success message
      navigate('/patients', {
        state: { message: 'Patient created successfully', variant: 'success' }
      });
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/patients');
  };

  return (
    <Container>
      <h1 className="mb-4">Create New Patient</h1>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <PatientForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </Card.Body>
      </Card>
    </Container>
  );
}

export default CreatePatientPage;
