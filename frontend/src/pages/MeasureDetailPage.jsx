/**
 * MeasureDetailPage Component
 * DEV ONLY - Raw data dump for a measure definition
 * Shows all recorded patient measures in table format
 * Admin can edit/delete individual measures
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Table, Alert, Spinner, Badge, Button, Form, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaTrash } from 'react-icons/fa';
import Layout from '../components/layout/Layout';
import api from '../services/api';
import { formatDateTime } from '../utils/dateUtils';
import { updatePatientMeasure, deletePatientMeasure } from '../services/measureService';
import { useAuth } from '../contexts/AuthContext';

const MeasureDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [measureDefinition, setMeasureDefinition] = useState(null);
  const [measures, setMeasures] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(20);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingMeasure, setDeletingMeasure] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

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

  const getRawMeasureValue = (measure) => {
    if (measure.numeric_value !== null && measure.numeric_value !== undefined) {
      return measure.numeric_value;
    }
    if (measure.text_value !== null && measure.text_value !== undefined) {
      return measure.text_value;
    }
    if (measure.boolean_value !== null && measure.boolean_value !== undefined) {
      return measure.boolean_value;
    }
    return '';
  };

  // Edit handlers
  const handleEditClick = (measure) => {
    setEditingMeasure(measure);
    setEditValue(getRawMeasureValue(measure));
    setEditNotes(measure.notes || '');
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editingMeasure || !measureDefinition) return;

    setSaving(true);
    try {
      const payload = { notes: editNotes };

      // Set the appropriate value field based on measure type
      switch (measureDefinition.measure_type) {
        case 'numeric':
        case 'calculated':
          payload.numeric_value = parseFloat(editValue);
          break;
        case 'text':
          payload.text_value = editValue;
          break;
        case 'boolean':
          payload.boolean_value = editValue === 'true' || editValue === true;
          break;
        default:
          payload.numeric_value = parseFloat(editValue);
      }

      await updatePatientMeasure(editingMeasure.id, payload);
      setShowEditModal(false);
      setEditingMeasure(null);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error updating measure:', err);
      setError(err.response?.data?.error || 'Failed to update measure');
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (measure) => {
    setDeletingMeasure(measure);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMeasure) return;

    setDeleting(true);
    try {
      await deletePatientMeasure(deletingMeasure.id);
      setShowDeleteModal(false);
      setDeletingMeasure(null);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error deleting measure:', err);
      setError(err.response?.data?.error || 'Failed to delete measure');
    } finally {
      setDeleting(false);
    }
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

  if (error && !measures.length) {
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
        {/* Error alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

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
                {measureDefinition?.display_name || 'Measure Detail'}
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
              <h5 className="mb-0">Measure Definition</h5>
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
            <h5 className="mb-0">Raw Database Dump</h5>
            <div className="d-flex align-items-center gap-3">
              <Form.Group className="mb-0 d-flex align-items-center gap-2">
                <Form.Label className="mb-0 text-white">Show:</Form.Label>
                <Form.Select
                  size="sm"
                  value={displayLimit}
                  onChange={(e) => setDisplayLimit(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  style={{ width: 'auto' }}
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="all">All</option>
                </Form.Select>
              </Form.Group>
              <Badge bg="light" text="dark">{measures.length} total records</Badge>
            </div>
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
                      {isAdmin && <th style={{ width: '80px' }}>Actions</th>}
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
                    {(displayLimit === 'all' ? measures : measures.slice(0, displayLimit)).map(measure => (
                      <tr key={measure.id}>
                        {isAdmin && (
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                title={t('actions.edit', 'Edit')}
                                onClick={() => handleEditClick(measure)}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                title={t('actions.delete', 'Delete')}
                                onClick={() => handleDeleteClick(measure)}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        )}
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
            <h6 className="mb-0">Raw JSON (First 3 records)</h6>
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

        {/* Edit Modal */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{t('measures.editMeasure', 'Edit Measure')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {editingMeasure && measureDefinition && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>
                    {t('measures.value', 'Value')}
                    {measureDefinition.unit && ` (${measureDefinition.unit})`}
                  </Form.Label>
                  {measureDefinition.measure_type === 'boolean' ? (
                    <Form.Select
                      value={editValue === true || editValue === 'true' ? 'true' : 'false'}
                      onChange={(e) => setEditValue(e.target.value)}
                    >
                      <option value="true">{t('common.yes', 'Yes')}</option>
                      <option value="false">{t('common.no', 'No')}</option>
                    </Form.Select>
                  ) : measureDefinition.measure_type === 'text' ? (
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                    />
                  ) : (
                    <Form.Control
                      type="number"
                      step="any"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                    />
                  )}
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('measures.notes', 'Notes')}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={t('measures.notesPlaceholder', 'Optional notes...')}
                  />
                </Form.Group>
                <div className="text-muted small">
                  <strong>Patient:</strong> {editingMeasure.patient ? `${editingMeasure.patient.first_name} ${editingMeasure.patient.last_name}` : editingMeasure.patient_id}<br />
                  <strong>Measured At:</strong> {formatDateTime(editingMeasure.measured_at)}
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" onClick={handleEditSave} disabled={saving}>
              {saving ? <Spinner animation="border" size="sm" /> : t('common.save', 'Save')}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{t('measures.deleteMeasure', 'Delete Measure')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {deletingMeasure && (
              <>
                <p>{t('measures.confirmDelete', 'Are you sure you want to delete this measure?')}</p>
                <div className="bg-light p-3 rounded">
                  <strong>{t('measures.value', 'Value')}:</strong> {getMeasureValue(deletingMeasure)}<br />
                  <strong>Patient:</strong> {deletingMeasure.patient ? `${deletingMeasure.patient.first_name} ${deletingMeasure.patient.last_name}` : deletingMeasure.patient_id}<br />
                  <strong>Measured At:</strong> {formatDateTime(deletingMeasure.measured_at)}
                </div>
                <Alert variant="warning" className="mt-3 mb-0">
                  {t('common.actionCannotBeUndone', 'This action cannot be undone.')}
                </Alert>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? <Spinner animation="border" size="sm" /> : t('common.delete', 'Delete')}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default MeasureDetailPage;
