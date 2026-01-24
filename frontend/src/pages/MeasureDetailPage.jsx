/**
 * MeasureDetailPage Component
 * DEV ONLY - Raw data dump for a measure definition
 * Shows all recorded patient measures in table format
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Table, Alert, Spinner, Badge, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import api from '../services/api';
import { formatDateTime } from '../utils/dateUtils';

const MeasureDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [measureDefinition, setMeasureDefinition] = useState(null);
  const [measures, setMeasures] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch measure definition
      const defResponse = await api.get(`/api/measures/${id}`);
      setMeasureDefinition(defResponse.data.data || defResponse.data);

      // Fetch all measures for this definition (no filters)
      const measuresResponse = await api.get(`/api/patient-measures/all`, {
        params: {
          measure_definition_id: id,
          limit: 10000 // Large limit to get all records
        }
      });

      const measuresData = measuresResponse.data.data || measuresResponse.data || [];
      setMeasures(Array.isArray(measuresData) ? measuresData : []);
    } catch (err) {
      console.error('Error fetching measure data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getMeasureValue = (measure) => {
    if (measure.numeric_value !== null && measure.numeric_value !== undefined) {
      return measure.numeric_value;
    }
    if (measure.text_value !== null && measure.text_value !== undefined) {
      return measure.text_value;
    }
    if (measure.boolean_value !== null && measure.boolean_value !== undefined) {
      return measure.boolean_value ? 'Yes' : 'No';
    }
    return '—';
  };

  if (loading) {
    return (
      <Layout>
        <Container fluid className="py-4">
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2">Loading measure data...</div>
          </div>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container fluid className="py-4">
          <Alert variant="danger">
            <Alert.Heading>Error</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={() => navigate('/settings/measures')}>
              ← Back to Measures
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid className="py-4">
        {/* Header */}
        <div className="mb-4">
          <Button
            variant="outline-secondary"
            onClick={() => navigate('/settings/measures')}
            className="mb-3"
          >
            ← Back to Measures
          </Button>

          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h1 className="mb-1">
                🔍 {measureDefinition?.display_name || 'Measure Detail'}
              </h1>
              <p className="text-muted mb-0">
                Raw data dump - Development only
              </p>
            </div>
            <Badge bg="warning" text="dark" className="px-3 py-2">
              DEV MODE
            </Badge>
          </div>
        </div>

        {/* Measure Definition Info */}
        {measureDefinition && (
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">📊 Measure Definition</h5>
            </Card.Header>
            <Card.Body>
              <div className="row">
                <div className="col-md-6">
                  <p><strong>ID:</strong> <code>{measureDefinition.id}</code></p>
                  <p><strong>Internal Name:</strong> <code>{measureDefinition.internal_name}</code></p>
                  <p><strong>Display Name:</strong> {measureDefinition.display_name}</p>
                  <p><strong>Type:</strong> <Badge bg="info">{measureDefinition.measure_type}</Badge></p>
                </div>
                <div className="col-md-6">
                  <p><strong>Category:</strong> {measureDefinition.category || '—'}</p>
                  <p><strong>Unit:</strong> {measureDefinition.unit || '—'}</p>
                  <p><strong>Active:</strong> {measureDefinition.is_active ? '✅ Yes' : '❌ No'}</p>
                  <p><strong>Description:</strong> {measureDefinition.description || '—'}</p>
                </div>
              </div>
              {measureDefinition.min_value !== null || measureDefinition.max_value !== null ? (
                <p className="mb-0">
                  <strong>Range:</strong> {measureDefinition.min_value || '—'} to {measureDefinition.max_value || '—'}
                </p>
              ) : null}
            </Card.Body>
          </Card>
        )}

        {/* Raw Data Table */}
        <Card>
          <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">💾 Raw Database Dump</h5>
            <Badge bg="light" text="dark">{measures.length} records</Badge>
          </Card.Header>
          <Card.Body className="p-0">
            {measures.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <h4>No data found</h4>
                <p>No measures have been recorded for this definition yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table striped bordered hover size="sm" className="mb-0">
                  <thead className="table-secondary">
                    <tr>
                      <th>ID</th>
                      <th>Patient ID</th>
                      <th>Patient Name</th>
                      <th>Value</th>
                      <th>Numeric Value</th>
                      <th>Text Value</th>
                      <th>Boolean Value</th>
                      <th>Measured At</th>
                      <th>Visit ID</th>
                      <th>Recorded By</th>
                      <th>Notes</th>
                      <th>Created At</th>
                      <th>Updated At</th>
                      <th>Deleted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measures.map(measure => (
                      <tr key={measure.id}>
                        <td><code style={{ fontSize: '0.8rem' }}>{measure.id}</code></td>
                        <td><code style={{ fontSize: '0.8rem' }}>{measure.patient_id}</code></td>
                        <td>
                          {measure.patient ? (
                            <a href={`/patients/${measure.patient_id}`}>
                              {measure.patient.first_name} {measure.patient.last_name}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td><strong>{getMeasureValue(measure)}</strong></td>
                        <td>{measure.numeric_value !== null ? measure.numeric_value : '—'}</td>
                        <td>{measure.text_value || '—'}</td>
                        <td>{measure.boolean_value !== null ? (measure.boolean_value ? '✅' : '❌') : '—'}</td>
                        <td>{formatDateTime(measure.measured_at)}</td>
                        <td>
                          {measure.visit_id ? (
                            <a href={`/visits/${measure.visit_id}`}>
                              <code style={{ fontSize: '0.8rem' }}>{measure.visit_id}</code>
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{measure.recorder?.username || '—'}</td>
                        <td style={{ maxWidth: '200px', fontSize: '0.85rem' }}>
                          {measure.notes || '—'}
                        </td>
                        <td>{formatDateTime(measure.created_at)}</td>
                        <td>{formatDateTime(measure.updated_at)}</td>
                        <td>{measure.deleted_at ? formatDateTime(measure.deleted_at) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Raw JSON Dump (Optional - for debugging) */}
        <Card className="mt-3">
          <Card.Header className="bg-secondary text-white">
            <h6 className="mb-0">🔧 Raw JSON (First 3 records)</h6>
          </Card.Header>
          <Card.Body>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '15px',
              borderRadius: '4px',
              fontSize: '0.85rem',
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              {JSON.stringify(measures.slice(0, 3), null, 2)}
            </pre>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default MeasureDetailPage;
