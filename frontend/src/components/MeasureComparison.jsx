/**
 * MeasureComparison Component
 * Compare multiple measures with correlation analysis
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts (Phase 2)
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, Form, Row, Col, Alert, Spinner, Badge, Button, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getMeasureDefinitions } from '../services/measureService';
import api from '../services/api';

const MeasureComparison = ({ patientId }) => {
  const { t } = useTranslation();

  // State
  const [measureDefinitions, setMeasureDefinitions] = useState([]);
  const [selectedMeasures, setSelectedMeasures] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start_date: getDefaultStartDate(),
    end_date: new Date().toISOString().split('T')[0]
  });
  const [normalizeView, setNormalizeView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get default start date (180 days ago)
  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 180);
    return date.toISOString().split('T')[0];
  }

  // Load measure definitions
  useEffect(() => {
    loadMeasureDefinitions();
  }, []);

  // Load comparison when measures or date range changes
  useEffect(() => {
    if (selectedMeasures.length >= 2) {
      loadComparison();
    }
  }, [selectedMeasures, dateRange]);

  const loadMeasureDefinitions = async () => {
    try {
      const definitions = await getMeasureDefinitions({
        is_active: true,
        measure_type: 'numeric'
      });
      setMeasureDefinitions(definitions || []);
    } catch (err) {
      console.error('Error loading measure definitions:', err);
      setError(t('measures.errorLoadingDefinitions'));
    }
  };

  const loadComparison = async () => {
    if (selectedMeasures.length < 2) return;

    try {
      setLoading(true);
      const response = await api.post(`/api/patients/${patientId}/measures/compare`, {
        measureDefinitionIds: selectedMeasures,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        normalize: normalizeView
      });

      setComparisonData(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error loading comparison:', err);
      setError(t('measures.errorLoadingComparison'));
    } finally {
      setLoading(false);
    }
  };

  const handleMeasureToggle = (measureId) => {
    setSelectedMeasures(prev => {
      if (prev.includes(measureId)) {
        return prev.filter(id => id !== measureId);
      } else {
        if (prev.length >= 5) {
          setError('Maximum 5 measures can be compared');
          return prev;
        }
        return [...prev, measureId];
      }
    });
  };

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleNormalizeToggle = () => {
    setNormalizeView(!normalizeView);
    if (selectedMeasures.length >= 2) {
      loadComparison();
    }
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (!comparisonData || !comparisonData.measures) return [];

    const dataToUse = normalizeView && comparisonData.normalized
      ? comparisonData.normalized
      : comparisonData.measures;

    // Create a map of all dates
    const dateMap = new Map();

    dataToUse.forEach(measure => {
      const dataArray = normalizeView ? measure.normalizedData : measure.data;
      dataArray.forEach(point => {
        const dateStr = new Date(point.date).toLocaleDateString();
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, { date: dateStr });
        }
        dateMap.get(dateStr)[measure.name] = normalizeView ? point.normalizedValue : point.value;
      });
    });

    return Array.from(dateMap.values());
  };

  // Get colors for different measures
  const getColor = (index) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return colors[index % colors.length];
  };

  const chartData = prepareChartData();

  // Get correlation strength badge color
  const getCorrelationBadge = (strength) => {
    switch (strength) {
      case 'strong': return 'success';
      case 'moderate': return 'warning';
      case 'weak': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>{t('measures.compareMeasures')}</h5>
      </Card.Header>
      <Card.Body>
        {/* Controls */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>
                <strong>{t('measures.selectMeasuresToCompare')}</strong> (2-5 measures)
              </Form.Label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px', padding: '10px' }}>
                {measureDefinitions.map(measure => (
                  <Form.Check
                    key={measure.id}
                    type="checkbox"
                    id={`measure-${measure.id}`}
                    label={`${measure.display_name} (${measure.unit || 'no unit'})`}
                    checked={selectedMeasures.includes(measure.id)}
                    onChange={() => handleMeasureToggle(measure.id)}
                  />
                ))}
              </div>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Row>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('measures.startDate')}</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateRange.start_date}
                    onChange={(e) => handleDateChange('start_date', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('measures.endDate')}</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateRange.end_date}
                    onChange={(e) => handleDateChange('end_date', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mt-3">
              <Col>
                <Form.Check
                  type="switch"
                  id="normalize-switch"
                  label={t('measures.normalizedView') + ' (0-100 scale)'}
                  checked={normalizeView}
                  onChange={handleNormalizeToggle}
                  disabled={selectedMeasures.length < 2}
                />
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Selection Summary */}
        {selectedMeasures.length > 0 && (
          <div className="mb-3">
            <strong>{t('measures.selectedMeasures')}:</strong>{' '}
            <div className="d-flex gap-2 flex-wrap mt-2">
              {selectedMeasures.map((measureId, index) => {
                const measure = measureDefinitions.find(m => m.id === measureId);
                return measure ? (
                  <Badge key={measureId} bg="primary" style={{ backgroundColor: getColor(index) }}>
                    {measure.display_name}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}

        {error && <Alert variant="danger">{error}</Alert>}

        {selectedMeasures.length < 2 && (
          <Alert variant="info">
            {t('measures.selectAtLeast2Measures')}
          </Alert>
        )}

        {/* Chart */}
        {loading ? (
          <div className="text-center p-5">
            <Spinner animation="border" /> {t('common.loading')}
          </div>
        ) : selectedMeasures.length >= 2 && chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  label={{
                    value: normalizeView ? 'Normalized Value (0-100)' : 'Value',
                    angle: -90,
                    position: 'insideLeft'
                  }}
                />
                <Tooltip />
                <Legend />
                {comparisonData.measures.map((measure, index) => (
                  <Line
                    key={measure.measureDefinitionId}
                    type="monotone"
                    dataKey={measure.name}
                    stroke={getColor(index)}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={`${measure.displayName} ${!normalizeView ? `(${measure.unit})` : ''}`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {/* Correlations */}
            {comparisonData && comparisonData.correlations && comparisonData.correlations.length > 0 && (
              <Card className="mt-4 bg-light">
                <Card.Body>
                  <h6 className="mb-3">📊 {t('measures.correlationAnalysis')}</h6>
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>{t('measures.measure1')}</th>
                        <th>{t('measures.measure2')}</th>
                        <th>{t('measures.correlation')}</th>
                        <th>{t('measures.strength')}</th>
                        <th>{t('measures.direction')}</th>
                        <th>{t('measures.dataPoints')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.correlations.map((corr, index) => (
                        <tr key={index}>
                          <td>{corr.measure1}</td>
                          <td>{corr.measure2}</td>
                          <td>
                            <strong>{corr.correlation.toFixed(3)}</strong>
                          </td>
                          <td>
                            <Badge bg={getCorrelationBadge(corr.strength)}>
                              {corr.strength}
                            </Badge>
                          </td>
                          <td>
                            {corr.direction === 'positive' && '↗️ Positive'}
                            {corr.direction === 'negative' && '↘️ Negative'}
                            {corr.direction === 'none' && '➡️ None'}
                          </td>
                          <td>{corr.dataPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <small className="text-muted">
                    <strong>Correlation interpretation:</strong> Strong (|r| &gt; 0.7), Moderate (|r| &gt; 0.4), Weak (|r| ≤ 0.4)
                  </small>
                </Card.Body>
              </Card>
            )}

            {/* Data Summary */}
            <Card className="mt-3 bg-light">
              <Card.Body>
                <h6 className="mb-3">📈 {t('measures.dataSummary')}</h6>
                <Row>
                  {comparisonData.measures.map((measure, index) => (
                    <Col key={measure.measureDefinitionId} md={4} className="mb-3">
                      <div style={{ borderLeft: `4px solid ${getColor(index)}`, paddingLeft: '10px' }}>
                        <strong>{measure.displayName}</strong>
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                          {t('measures.dataPoints')}: {measure.count}
                        </div>
                        {normalizeView && comparisonData.normalized && (
                          <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px' }}>
                            Original range: {comparisonData.normalized[index]?.originalRange?.min?.toFixed(2)} - {comparisonData.normalized[index]?.originalRange?.max?.toFixed(2)} {measure.unit}
                          </div>
                        )}
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </>
        ) : selectedMeasures.length >= 2 ? (
          <Alert variant="info">
            {t('measures.noDataForComparison')}
          </Alert>
        ) : null}
      </Card.Body>
    </Card>
  );
};

MeasureComparison.propTypes = {
  patientId: PropTypes.string.isRequired
};

export default MeasureComparison;
