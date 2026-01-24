/**
 * PatientMeasuresTable Component
 * Displays patient measures in a table with filtering, sorting, and pagination
 * Sprint 3: US-5.3.1 - Define Custom Measures
 */

import { useState, useEffect } from 'react';
import { Table, Button, Form, Badge, Pagination, Card, Row, Col, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  getPatientMeasures,
  getMeasureDefinitions,
  deletePatientMeasure,
  formatMeasureValue
} from '../services/measureService';
import { formatDateTime } from '../utils/dateUtils';
import { getCategoryBadgeVariant, getCategoryDisplayName } from '../utils/measureUtils';
import LogMeasureModal from './LogMeasureModal';

const PatientMeasuresTable = ({ patientId, refreshTrigger }) => {
  const { t, i18n } = useTranslation();

  // State
  const [measures, setMeasures] = useState([]);
  const [measureDefinitions, setMeasureDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [selectedMeasureType, setSelectedMeasureType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState(null);

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Load measure definitions
  useEffect(() => {
    fetchMeasureDefinitions();
  }, []);

  // Load measures when filters change or refresh trigger changes
  useEffect(() => {
    if (startDate && endDate) {
      fetchMeasures();
    }
  }, [patientId, selectedMeasureType, startDate, endDate, refreshTrigger]);

  const fetchMeasureDefinitions = async () => {
    try {
      const definitions = await getMeasureDefinitions({ is_active: true });
      setMeasureDefinitions(definitions);
    } catch (err) {
      console.error('Error fetching measure definitions:', err);
      setError(t('measures.errorFetchingDefinitions', 'Failed to load measure definitions'));
    }
  };

  const fetchMeasures = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        start_date: startDate,
        end_date: endDate
      };

      if (selectedMeasureType) {
        filters.measure_definition_id = selectedMeasureType;
      }

      const data = await getPatientMeasures(patientId, filters);

      // Sort by measured_at descending (most recent first)
      const sortedData = (data || []).sort((a, b) => {
        return new Date(b.measured_at) - new Date(a.measured_at);
      });

      setMeasures(sortedData);
    } catch (err) {
      console.error('Error fetching patient measures:', err);
      setError(t('measures.errorFetchingMeasures', 'Failed to load patient measures'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (measureId) => {
    if (!window.confirm(t('measures.confirmDelete', 'Are you sure you want to delete this measure?'))) {
      return;
    }

    try {
      await deletePatientMeasure(measureId);
      fetchMeasures(); // Refresh the list
    } catch (err) {
      console.error('Error deleting measure:', err);
      alert(t('measures.errorDeleting', 'Failed to delete measure: ') + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (measure) => {
    setEditingMeasure(measure);
    setShowEditModal(true);
    // TODO: Open LogMeasureModal in edit mode when it's created
    console.log('Edit measure:', measure);
  };

  // Pagination
  const totalPages = Math.ceil(measures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMeasures = measures.slice(startIndex, endIndex);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMeasureType, startDate, endDate]);

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{t('common.loading')}</span>
          </div>
          <div className="mt-2">{t('common.loading')}</div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      {/* Filter Controls */}
      <Card className="mb-3">
        <Card.Body>
          {/* Add Measure Button */}
          <div className="d-flex justify-content-end mb-3">
            <Button variant="primary" onClick={() => setShowLogModal(true)}>
              + {t('measures.logMeasure', 'Log Measure')}
            </Button>
          </div>

          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('measures.measureType', 'Measure Type')}</Form.Label>
                <Form.Select
                  value={selectedMeasureType}
                  onChange={(e) => setSelectedMeasureType(e.target.value)}
                >
                  <option value="">{t('common.all', 'All')}</option>
                  {measureDefinitions.map(def => (
                    <option key={def.id} value={def.id}>
                      {def.display_name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('common.startDate', 'Start Date')}</Form.Label>
                <Form.Control
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('common.endDate', 'End Date')}</Form.Label>
                <Form.Control
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
          {error && (
            <div className="alert alert-danger mt-3 mb-0">
              {error}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Measures Table */}
      <Card>
        <Card.Body>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th>{t('measures.dateTime', 'Date/Time')}</th>
                  <th>{t('measures.measure', 'Measure')}</th>
                  <th>{t('measures.value', 'Value')}</th>
                  <th>{t('visits.visit', 'Visit')}</th>
                  <th>{t('measures.recordedBy', 'Recorded By')}</th>
                  <th>{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {currentMeasures.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      <div className="text-muted">
                        {measures.length === 0 ? (
                          <div>
                            <strong>{t('measures.noMeasures', 'No measures found')}</strong>
                            <br />
                            <small>
                              {selectedMeasureType || (startDate && endDate)
                                ? t('measures.tryAdjustingFilters', 'Try adjusting your filters')
                                : t('measures.noMeasuresRecorded', 'No measures have been recorded yet')}
                            </small>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentMeasures.map(measure => (
                    <tr key={measure.id}>
                      <td>{formatDateTime(measure.measured_at, i18n.language)}</td>
                      <td>
                        <div>
                          <strong>{measure.measureDefinition?.display_name || '-'}</strong>
                          {measure.measureDefinition?.category && (
                            <div className="mt-1">
                              <Badge bg={getCategoryBadgeVariant(measure.measureDefinition.category)}>
                                {getCategoryDisplayName(measure.measureDefinition.category, t)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong>
                          {formatMeasureValue(measure, measure.measureDefinition)}
                        </strong>
                      </td>
                      <td>
                        {measure.visit_id ? (
                          <a href={`/visits/${measure.visit_id}`}>
                            {t('visits.viewVisit', 'View Visit')}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{measure.recorder?.username || '-'}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEdit(measure)}
                            title={t('common.edit', 'Edit')}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(measure.id)}
                            title={t('common.delete', 'Delete')}
                          >
                            🗑️
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* Results Count */}
          {measures.length > 0 && (
            <div className="text-muted small mt-2">
              {t('common.showingResults', {
                count: currentMeasures.length,
                total: measures.length,
                defaultValue: 'Showing {{count}} of {{total}} results'
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination>
                <Pagination.First
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                />
                <Pagination.Prev
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                />

                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + index;
                  if (pageNumber > totalPages) return null;

                  return (
                    <Pagination.Item
                      key={pageNumber}
                      active={pageNumber === currentPage}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </Pagination.Item>
                  );
                })}

                <Pagination.Next
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                />
                <Pagination.Last
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Log New Measure Modal */}
      <LogMeasureModal
        show={showLogModal}
        onHide={() => setShowLogModal(false)}
        patientId={patientId}
        onSuccess={() => {
          fetchMeasures();
          setShowLogModal(false);
        }}
      />

      {/* TODO: Add edit functionality to LogMeasureModal */}
      {/* {showEditModal && (
        <LogMeasureModal
          show={showEditModal}
          onHide={() => {
            setShowEditModal(false);
            setEditingMeasure(null);
          }}
          patientId={patientId}
          measure={editingMeasure}
          onSuccess={() => {
            fetchMeasures();
            setShowEditModal(false);
            setEditingMeasure(null);
          }}
        />
      )} */}
    </div>
  );
};

export default PatientMeasuresTable;
