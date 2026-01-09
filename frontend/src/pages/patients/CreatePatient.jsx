/**
 * Create Patient Page
 * Form to create a new patient
 */

import { useState } from 'react';
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
    <div className="container-fluid">
      <h1 className="mb-4">Create New Patient</h1>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <PatientForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}

export default CreatePatientPage;
