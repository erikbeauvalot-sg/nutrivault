/**
 * CreateInvoice Page
 * Create a new invoice
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import InvoiceForm from '../../components/billing/InvoiceForm';
import { createInvoice } from '../../services/billingService';
import { getPatients } from '../../services/patientService';
import { getVisits } from '../../services/visitService';

export function CreateInvoice() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [patientsResponse, visitsResponse] = await Promise.all([
        getPatients({}, 1, 1000), // Load all patients
        getVisits({}, 1, 1000) // Load recent visits
      ]);
      setPatients(patientsResponse.patients || patientsResponse.data || []);
      setVisits(visitsResponse.visits || visitsResponse.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load required data');
      toast.error('Failed to load patients and visits');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      const response = await createInvoice(data);
      toast.success('Invoice created successfully');
      navigate(`/billing/${response.invoice?.id || response.data?.id}`);
    } catch (err) {
      console.error('Failed to create invoice:', err);
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/billing');
  };

  if (loading) {
    return (
      <Container className="py-4">
        <Card>
          <Card.Body className="text-center">
            <p>Loading...</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Create New Invoice</h2>
      
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <InvoiceForm
            patients={patients}
            visits={visits}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={submitting}
          />
        </Card.Body>
      </Card>
    </Container>
  );
}

export default CreateInvoice;
