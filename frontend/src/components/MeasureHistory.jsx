/**
 * MeasureHistory Component
 * Time-series visualization for patient measures
 * Sprint 3: US-5.3.1 - Define Custom Measures
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, Form, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getMeasureDefinitions, getMeasureHistory } from '../services/measureService';
import { formatDateTime } from '../utils/dateUtils';

const MeasureHistory = ({ patientId }) => {
  const { t } = useTranslation();

  // State
  const [measureDefinitions, setMeasureDefinitions] = useState([]);
  const [selectedMeasureId, setSelectedMeasureId] = useState('');
  const [selectedDefinition, setSelectedDefinition] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [dateRange, setDateRange] = useState({
    start_date: getDefaultStartDate(),
    end_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('line');

  // Get default start date (90 days ago)
  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date.toISOString().split('T')[0];
  }

  // Load measure definitions
  useEffect(() => {
    loadMeasureDefinitions();
  }, []);

  // Load history when measure or date range changes
  useEffect(() => {
    if (selectedMeasureId) {
      loadHistory();
    }
  }, [selectedMeasureId, dateRange]);

  const loadMeasureDefinitions = async () => {
    try {
      setLoading(true);
      const definitions = await getMeasureDefinitions({
        is_active: true,
        measure_type: 'numeric' // Only numeric measures can be graphed
      });
      setMeasureDefinitions(definitions || []);

      // Auto-select first measure if available
      if (definitions && definitions.length > 0) {
        setSelectedMeasureId(definitions[0].id);
        setSelectedDefinition(definitions[0]);
      }

      setError(null);
    } catch (err) {
      console.error('Error loading measure definitions:', err);
      setError(t('measures.errorLoadingDefinitions'));
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!selectedMeasureId) return;

    try {
      setLoading(true);
      const response = await getMeasureHistory(patientId, selectedMeasureId, dateRange);

      // Ensure history is an array (handle both response formats)
      const history = Array.isArray(response) ? response : (response?.data || []);

      // Transform data for Recharts
      const chartData = (history || []).map(measure => ({
        date: new Date(measure.measured_at || measure.date).getTime(),
        dateLabel: formatDateTime(measure.measured_at || measure.date),
        value: parseFloat(measure.numeric_value || measure.value),
        notes: measure.notes
      }));

      setHistoryData(chartData);
      setError(null);
    } catch (err) {
      console.error('Error loading measure history:', err);
      setError(t('measures.errorLoadingHistory'));
    } finally {
      setLoading(false);
    }
  };

  const handleMeasureChange = (e) => {
    const measureId = e.target.value;
    setSelectedMeasureId(measureId);

    const definition = measureDefinitions.find(d => d.id === measureId);
    setSelectedDefinition(definition);
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.dateLabel}</p>
          <p style={{ margin: '5px 0', color: '#8884d8' }}>
            {t('measures.value')}: {data.value.toFixed(selectedDefinition?.decimal_places || 2)} {selectedDefinition?.unit || ''}
          </p>
          {data.notes && (
            <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>
              {t('measures.notes')}: {data.notes}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate statistics
  const getStatistics = () => {
    if (historyData.length === 0) return null;

    const values = historyData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const latest = values[values.length - 1];

    return { min, max, avg, latest, count: values.length };
  };

  const stats = getStatistics();

  if (loading && !selectedMeasureId) {
    return (
      <Card>
        <Card.Body className="text-center">
          <Spinner animation="border" size="sm" /> {t('common.loading')}
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (measureDefinitions.length === 0) {
    return (
      <Alert variant="info">
        {t('measures.noNumericMeasures')}
      </Alert>
    );
  }

  return (
    <Card>
      <Card.Header>
        <h5>{t('measures.measureHistory')}</h5>
      </Card.Header>
      <Card.Body>
        {/* Controls */}
        <Row className="mb-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label>{t('measures.selectMeasure')}</Form.Label>
              <Form.Select
                value={selectedMeasureId}
                onChange={handleMeasureChange}
              >
                {measureDefinitions.map(measure => (
                  <option key={measure.id} value={measure.id}>
                    {measure.display_name} {measure.unit ? `(${measure.unit})` : ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>{t('measures.startDate')}</Form.Label>
              <Form.Control
                type="date"
                value={dateRange.start_date}
                onChange={(e) => handleDateRangeChange('start_date', e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>{t('measures.endDate')}</Form.Label>
              <Form.Control
                type="date"
                value={dateRange.end_date}
                onChange={(e) => handleDateRangeChange('end_date', e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>{t('measures.chartType')}</Form.Label>
              <Form.Select value={chartType} onChange={(e) => setChartType(e.target.value)}>
                <option value="line">{t('measures.line')}</option>
                <option value="area">{t('measures.area')}</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* Statistics */}
        {stats && (
          <Row className="mb-3">
            <Col>
              <div className="d-flex gap-3 flex-wrap">
                <Badge bg="primary" className="p-2">
                  {t('measures.count')}: {stats.count}
                </Badge>
                <Badge bg="success" className="p-2">
                  {t('measures.latest')}: {stats.latest.toFixed(selectedDefinition?.decimal_places || 2)} {selectedDefinition?.unit || ''}
                </Badge>
                <Badge bg="info" className="p-2">
                  {t('measures.average')}: {stats.avg.toFixed(selectedDefinition?.decimal_places || 2)} {selectedDefinition?.unit || ''}
                </Badge>
                <Badge bg="warning" className="p-2">
                  {t('measures.min')}: {stats.min.toFixed(selectedDefinition?.decimal_places || 2)} {selectedDefinition?.unit || ''}
                </Badge>
                <Badge bg="danger" className="p-2">
                  {t('measures.max')}: {stats.max.toFixed(selectedDefinition?.decimal_places || 2)} {selectedDefinition?.unit || ''}
                </Badge>
              </div>
            </Col>
          </Row>
        )}

        {/* Chart */}
        {loading ? (
          <div className="text-center p-5">
            <Spinner animation="border" /> {t('common.loading')}
          </div>
        ) : historyData.length === 0 ? (
          <Alert variant="info">
            {t('measures.noDataInRange')}
          </Alert>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'area' ? (
              <AreaChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                />
                <YAxis
                  label={{
                    value: selectedDefinition?.unit || '',
                    angle: -90,
                    position: 'insideLeft'
                  }}
                  domain={[
                    selectedDefinition?.min_value ? parseFloat(selectedDefinition.min_value) : 'auto',
                    selectedDefinition?.max_value ? parseFloat(selectedDefinition.max_value) : 'auto'
                  ]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                  name={selectedDefinition?.display_name || t('measures.value')}
                />
              </AreaChart>
            ) : (
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                />
                <YAxis
                  label={{
                    value: selectedDefinition?.unit || '',
                    angle: -90,
                    position: 'insideLeft'
                  }}
                  domain={[
                    selectedDefinition?.min_value ? parseFloat(selectedDefinition.min_value) : 'auto',
                    selectedDefinition?.max_value ? parseFloat(selectedDefinition.max_value) : 'auto'
                  ]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name={selectedDefinition?.display_name || t('measures.value')}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </Card.Body>
    </Card>
  );
};

MeasureHistory.propTypes = {
  patientId: PropTypes.string.isRequired
};

export default MeasureHistory;
