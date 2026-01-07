import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { Calendar2 } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import VisitForm from '../../components/forms/VisitForm';
import { getVisit, updateVisit } from '../../services/visitService';
import { getPatients } from '../../services/patientService';

const EditVisit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both visit and patients in parallel
      const [visitResponse, patientsResponse] = await Promise.all([
        getVisit(id),
        getPatients({ limit: 1000 }),
      ]);
      
      setVisit(visitResponse.data);
      setPatients(patientsResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to load visit details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      await updateVisit(id, data);
      toast.success('Visit updated successfully!');
      navigate('/visits', { state: { message: 'Visit updated successfully!' } });
    } catch (error) {
      console.error('Error updating visit:', error);
      toast.error(error.message || 'Failed to update visit');
    }
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <Calendar2 className="me-2" />
            Edit Visit
          </h2>
        </Col>
      </Row>

      <Row>
        <Col lg={10} xl={8}>
          <Card>
            <Card.Body>
              {loading && (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                  <p className="mt-3">Loading visit details...</p>
                </div>
              )}

              {error && !loading && (
                <Alert variant="danger">
                  <Alert.Heading>Error Loading Visit</Alert.Heading>
                  <p>{error}</p>
                </Alert>
              )}

              {!loading && !error && visit && (
                <VisitForm
                  initialData={visit}
                  onSubmit={handleSubmit}
                  patients={patients}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EditVisit;

