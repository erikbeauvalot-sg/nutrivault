/**
 * MeasureHistory Component
 * Time-series visualization for patient measures with trend analysis
 * Sprint 3: US-5.3.1 - Define Custom Measures
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts
 */

import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Card, Form, Row, Col, Alert, Spinner, Badge, Button, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getMeasureDefinitions, getMeasureTrend, getAllMeasureTranslations } from '../services/measureService';
import {
  formatTrendIndicator,
  formatStatisticsSummary,
  mergeChartData,
  getMAColor
} from '../utils/statisticsUtils';
import {
  exportChartAsImage,
  exportDataAsCSV,
  generatePDFReport,
  formatChartDataForExport
} from '../utils/chartExportUtils';
import { fetchMeasureTranslations, applyMeasureTranslations } from '../utils/measureTranslations';
import AnnotationModal from './AnnotationModal';
import api from '../services/api';

const MeasureHistory = ({ patientId }) => {
  const { t, i18n } = useTranslation();

  // State
  const [measureDefinitions, setMeasureDefinitions] = useState([]);
  const [measureTranslations, setMeasureTranslations] = useState({});
  const [selectedMeasureId, setSelectedMeasureId] = useState('');
  const [selectedDefinition, setSelectedDefinition] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [dateRange, setDateRange] = useState({
    start_date: getDefaultStartDate(),
    end_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('line');

  // Trend visualization controls
  const [showMA7, setShowMA7] = useState(true);
  const [showMA30, setShowMA30] = useState(true);
  const [showMA90, setShowMA90] = useState(false);
  const [showTrendLine, setShowTrendLine] = useState(true);

  // Annotations state (Phase 3)
  const [annotations, setAnnotations] = useState([]);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState(null);

  // Export ref (Phase 4)
  const chartContainerRef = useRef(null);

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
      loadAnnotations();
    }
  }, [selectedMeasureId, dateRange]);

  // Re-apply translations when language changes
  useEffect(() => {
    if (Object.keys(measureTranslations).length > 0 && measureDefinitions.length > 0) {
      const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
      const translatedDefinitions = measureDefinitions.map(def =>
        applyMeasureTranslations(def, measureTranslations[def.id]?.[currentLanguage] || {})
      );
      setMeasureDefinitions(translatedDefinitions);

      // Update selected definition if it exists
      if (selectedDefinition) {
        const updatedSelected = applyMeasureTranslations(
          selectedDefinition,
          measureTranslations[selectedDefinition.id]?.[currentLanguage] || {}
        );
        setSelectedDefinition(updatedSelected);
      }
    }
  }, [i18n.resolvedLanguage, i18n.language]);

  const loadMeasureDefinitions = async () => {
    try {
      setLoading(true);
      const definitions = await getMeasureDefinitions({
        is_active: true,
        measure_type: 'numeric' // Only numeric measures can be graphed
      });

      // Fetch translations for all measure definitions
      if (definitions && definitions.length > 0) {
        const measureIds = definitions.map(d => d.id);
        const translations = await fetchMeasureTranslations(measureIds, getAllMeasureTranslations);
        setMeasureTranslations(translations);

        // Apply translations based on current language
        const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
        const translatedDefinitions = definitions.map(def =>
          applyMeasureTranslations(def, translations[def.id]?.[currentLanguage] || {})
        );
        setMeasureDefinitions(translatedDefinitions);

        // Auto-select first measure if available
        setSelectedMeasureId(translatedDefinitions[0].id);
        setSelectedDefinition(translatedDefinitions[0]);
      } else {
        setMeasureDefinitions(definitions || []);
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
      const response = await getMeasureTrend(patientId, selectedMeasureId, {
        ...dateRange,
        includeMA: true,
        includeTrendLine: true
      });

      // Store trend data
      setTrendData(response);

      // Merge data with MAs and trend line for chart
      const rawData = response?.data || [];
      const merged = mergeChartData(
        rawData,
        response?.movingAverages || {},
        response?.trendLine || null
      );

      setChartData(merged);
      setError(null);
    } catch (err) {
      console.error('Error loading measure trend:', err);
      setError(t('measures.errorLoadingHistory'));
    } finally {
      setLoading(false);
    }
  };

  const loadAnnotations = async () => {
    if (!selectedMeasureId) return;

    try {
      const response = await api.get(`/api/patients/${patientId}/annotations`, {
        params: {
          measure_definition_id: selectedMeasureId,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date
        }
      });

      setAnnotations(response.data.data || []);
    } catch (err) {
      console.error('Error loading annotations:', err);
      // Don't show error - annotations are optional
    }
  };

  const handleCreateAnnotation = () => {
    setEditingAnnotation(null);
    setShowAnnotationModal(true);
  };

  const handleAnnotationSaved = () => {
    loadAnnotations();
  };

  // Export functions (Phase 4)
  const handleExportPNG = async () => {
    try {
      await exportChartAsImage(
        chartContainerRef.current,
        `${selectedDefinition?.name || 'measure'}-chart`,
        'png'
      );
    } catch (error) {
      setError('Failed to export chart as PNG');
    }
  };

  const handleExportSVG = async () => {
    try {
      await exportChartAsImage(
        chartContainerRef.current,
        `${selectedDefinition?.name || 'measure'}-chart`,
        'svg'
      );
    } catch (error) {
      setError('Failed to export chart as SVG');
    }
  };

  const handleExportCSV = () => {
    try {
      const formattedData = formatChartDataForExport(chartData, selectedDefinition);
      exportDataAsCSV(
        formattedData,
        `${selectedDefinition?.name || 'measure'}-data`
      );
    } catch (error) {
      setError('Failed to export data as CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      await generatePDFReport({
        chartElement: chartContainerRef.current,
        title: `${selectedDefinition?.display_name || 'Measure'} Report`,
        patientData: {
          name: 'Patient', // Can be enhanced with actual patient data
          id: patientId
        },
        measureData: {
          name: selectedDefinition?.display_name,
          unit: selectedDefinition?.unit,
          count: chartData.length
        },
        statistics: trendData?.statistics,
        trend: trendData?.trend,
        filename: `${selectedDefinition?.name || 'measure'}-report`
      });
    } catch (error) {
      setError('Failed to generate PDF report');
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
      const unit = selectedDefinition?.unit || '';
      const decimals = selectedDefinition?.decimal_places || 2;

      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9em' }}>{data.date}</p>
          <p style={{ margin: '5px 0', color: '#3b82f6', fontWeight: 'bold' }}>
            {t('measures.value')}: {data.value?.toFixed(decimals)} {unit}
            {data.isOutlier && <span style={{ color: '#ef4444', marginLeft: '5px' }}>⚠️</span>}
          </p>
          {showMA7 && data.ma7 && (
            <p style={{ margin: '3px 0', color: getMAColor(7), fontSize: '0.85em' }}>
              MA7: {data.ma7.toFixed(decimals)} {unit}
            </p>
          )}
          {showMA30 && data.ma30 && (
            <p style={{ margin: '3px 0', color: getMAColor(30), fontSize: '0.85em' }}>
              MA30: {data.ma30.toFixed(decimals)} {unit}
            </p>
          )}
          {showMA90 && data.ma90 && (
            <p style={{ margin: '3px 0', color: getMAColor(90), fontSize: '0.85em' }}>
              MA90: {data.ma90.toFixed(decimals)} {unit}
            </p>
          )}
          {showTrendLine && data.trendLine && (
            <p style={{ margin: '3px 0', color: '#ef4444', fontSize: '0.85em' }}>
              Trend: {data.trendLine.toFixed(decimals)} {unit}
            </p>
          )}
          {data.notes && (
            <p style={{ margin: '5px 0 0 0', fontSize: '0.8em', color: '#666', borderTop: '1px solid #eee', paddingTop: '5px' }}>
              📝 {data.notes}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Get trend indicator
  const trendIndicator = trendData?.trend ? formatTrendIndicator(trendData.trend) : null;

  // Get formatted statistics
  const formattedStats = trendData?.statistics
    ? formatStatisticsSummary(trendData.statistics, selectedDefinition?.unit || '')
    : null;

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

        {/* Export Options (Phase 4) */}
        {chartData.length > 0 && (
          <Row className="mb-3">
            <Col>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm" id="export-dropdown">
                  ⬇ {t('common.export')}
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Item onClick={handleExportPNG}>
                    🖼️ Export Chart as PNG
                  </Dropdown.Item>
                  <Dropdown.Item onClick={handleExportSVG}>
                    🎨 Export Chart as SVG
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleExportCSV}>
                    📊 Export Data as CSV
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleExportPDF}>
                    📄 Generate PDF Report
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>
        )}

        {/* Trend Indicator */}
        {trendIndicator && trendData?.data?.length > 0 && (
          <Alert variant={trendIndicator.color === 'green' ? 'success' : trendIndicator.color === 'red' ? 'danger' : 'info'} className="mb-3">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <strong style={{ fontSize: '1.1em' }}>{trendIndicator.formattedText}</strong>
                {trendData.trend.velocity !== 0 && (
                  <span style={{ marginLeft: '15px', fontSize: '0.9em' }}>
                    Velocity: {trendData.trend.velocity > 0 ? '+' : ''}{trendData.trend.velocity.toFixed(2)} {selectedDefinition?.unit}/day
                  </span>
                )}
              </div>
              {trendData.trend.rSquared > 0 && (
                <Badge bg="secondary" className="p-2">
                  R² = {trendData.trend.rSquared.toFixed(3)}
                </Badge>
              )}
            </div>
          </Alert>
        )}

        {/* Moving Average Toggles */}
        {trendData?.movingAverages && (
          <Row className="mb-3">
            <Col>
              <div className="d-flex gap-3 align-items-center">
                <strong style={{ fontSize: '0.9em' }}>Display Options:</strong>
                <Form.Check
                  type="checkbox"
                  id="showMA7"
                  label={<span style={{ color: getMAColor(7) }}>MA 7-day</span>}
                  checked={showMA7}
                  onChange={(e) => setShowMA7(e.target.checked)}
                  disabled={!trendData.movingAverages.ma7 || trendData.movingAverages.ma7.length === 0}
                />
                <Form.Check
                  type="checkbox"
                  id="showMA30"
                  label={<span style={{ color: getMAColor(30) }}>MA 30-day</span>}
                  checked={showMA30}
                  onChange={(e) => setShowMA30(e.target.checked)}
                  disabled={!trendData.movingAverages.ma30 || trendData.movingAverages.ma30.length === 0}
                />
                <Form.Check
                  type="checkbox"
                  id="showMA90"
                  label={<span style={{ color: getMAColor(90) }}>MA 90-day</span>}
                  checked={showMA90}
                  onChange={(e) => setShowMA90(e.target.checked)}
                  disabled={!trendData.movingAverages.ma90 || trendData.movingAverages.ma90.length === 0}
                />
                <Form.Check
                  type="checkbox"
                  id="showTrendLine"
                  label={<span style={{ color: '#ef4444' }}>Trend Line</span>}
                  checked={showTrendLine}
                  onChange={(e) => setShowTrendLine(e.target.checked)}
                  disabled={!trendData.trendLine}
                />
              </div>
            </Col>
          </Row>
        )}

        {/* Enhanced Statistics */}
        {formattedStats && (
          <Card className="mb-3 bg-light">
            <Card.Body>
              <h6 className="mb-3">📊 Statistical Summary</h6>
              <Row>
                {formattedStats.map(stat => (
                  <Col key={stat.key} xs={6} md={2} className="mb-2">
                    <div style={{ fontSize: '0.85em', color: '#666' }}>{stat.label}</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1em' }}>{stat.value}</div>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Chart */}
        {loading ? (
          <div className="text-center p-5">
            <Spinner animation="border" /> {t('common.loading')}
          </div>
        ) : chartData.length === 0 ? (
          <Alert variant="info">
            {t('measures.noDataInRange')}
          </Alert>
        ) : (
          <div ref={chartContainerRef}>
            <ResponsiveContainer width="100%" height={450}>
            {chartType === 'area' ? (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
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
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  name={selectedDefinition?.display_name || t('measures.value')}
                  strokeWidth={2}
                />
                {showMA7 && (
                  <Area
                    type="monotone"
                    dataKey="ma7"
                    stroke={getMAColor(7)}
                    fill="none"
                    strokeDasharray="5 5"
                    name="MA 7-day"
                    strokeWidth={2}
                  />
                )}
                {showMA30 && (
                  <Area
                    type="monotone"
                    dataKey="ma30"
                    stroke={getMAColor(30)}
                    fill="none"
                    strokeDasharray="5 5"
                    name="MA 30-day"
                    strokeWidth={2}
                  />
                )}
                {showMA90 && (
                  <Area
                    type="monotone"
                    dataKey="ma90"
                    stroke={getMAColor(90)}
                    fill="none"
                    strokeDasharray="5 5"
                    name="MA 90-day"
                    strokeWidth={2}
                  />
                )}
                {showTrendLine && (
                  <Area
                    type="monotone"
                    dataKey="trendLine"
                    stroke="#ef4444"
                    fill="none"
                    strokeDasharray="3 3"
                    name="Trend Line"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
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
                {/* Main value line */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.isOutlier) {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill="#ef4444"
                          stroke="#dc2626"
                          strokeWidth={2}
                        />
                      );
                    }
                    return <circle cx={cx} cy={cy} r={4} fill="#3b82f6" />;
                  }}
                  activeDot={{ r: 6 }}
                  name={selectedDefinition?.display_name || t('measures.value')}
                />
                {/* Moving Average 7 */}
                {showMA7 && (
                  <Line
                    type="monotone"
                    dataKey="ma7"
                    stroke={getMAColor(7)}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="MA 7-day"
                  />
                )}
                {/* Moving Average 30 */}
                {showMA30 && (
                  <Line
                    type="monotone"
                    dataKey="ma30"
                    stroke={getMAColor(30)}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="MA 30-day"
                  />
                )}
                {/* Moving Average 90 */}
                {showMA90 && (
                  <Line
                    type="monotone"
                    dataKey="ma90"
                    stroke={getMAColor(90)}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="MA 90-day"
                  />
                )}
                {/* Trend Line */}
                {showTrendLine && (
                  <Line
                    type="monotone"
                    dataKey="trendLine"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={false}
                    name="Trend Line"
                  />
                )}
                {/* Annotation Markers (Phase 3) */}
                {annotations.map(annotation => {
                  const annotDate = new Date(annotation.event_date).toLocaleDateString();
                  return (
                    <ReferenceLine
                      key={annotation.id}
                      x={annotDate}
                      stroke={annotation.color || '#FF5733'}
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      label={{
                        value: annotation.title,
                        position: 'top',
                        fill: annotation.color || '#FF5733',
                        fontSize: 10
                      }}
                    />
                  );
                })}
              </LineChart>
            )}
          </ResponsiveContainer>

          {/* Annotation List */}
          {annotations.length > 0 && (
            <div className="mt-3">
              <h6>📌 Annotations</h6>
              <div className="d-flex flex-wrap gap-2">
                {annotations.map(annotation => (
                  <Badge
                    key={annotation.id}
                    style={{
                      backgroundColor: annotation.color || '#FF5733',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setEditingAnnotation(annotation);
                      setShowAnnotationModal(true);
                    }}
                  >
                    {new Date(annotation.event_date).toLocaleDateString()}: {annotation.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Add Annotation Button */}
          <div className="mt-3">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleCreateAnnotation}
            >
              + {t('annotations.addAnnotation')}
            </Button>
          </div>
        </div>
        )}
      </Card.Body>

      {/* Annotation Modal (Phase 3) */}
      <AnnotationModal
        show={showAnnotationModal}
        onHide={() => setShowAnnotationModal(false)}
        patientId={patientId}
        annotation={editingAnnotation}
        measureDefinitionId={selectedMeasureId}
        onSave={handleAnnotationSaved}
      />
    </Card>
  );
};

MeasureHistory.propTypes = {
  patientId: PropTypes.string.isRequired
};

export default MeasureHistory;
