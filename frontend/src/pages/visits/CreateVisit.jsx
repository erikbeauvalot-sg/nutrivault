import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Calendar2 } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import VisitForm from '../../components/forms/VisitForm';
import { createVisit } from '../../services/visitService';
import { getPatients } from '../../services/patientService';

const CreateVisit = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await getPatients({ limit: 1000 }); // Fetch all patients for dropdown
      setPatients(response.data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      await createVisit(data);
      toast.success('Visit scheduled successfully!');
      navigate('/visits', { state: { message: 'Visit scheduled successfully!' } });
    } catch (error) {
      console.error('Error creating visit:', error);
      toast.error(error.message || 'Failed to schedule visit');
    }
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <Calendar2 className="me-2" />
            Schedule New Visit
          </h2>
        </Col>
      </Row>

      <Row>
        <Col lg={10} xl={8}>
          <Card>
            <Card.Body>
              {loading ? (
                <p className="text-center py-4">Loading patients...</p>
              ) : (
                <VisitForm onSubmit={handleSubmit} patients={patients} />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CreateVisit;

