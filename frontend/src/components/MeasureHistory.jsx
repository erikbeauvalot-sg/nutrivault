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
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
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
import { formatDate } from '../utils/dateUtils';
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
    end_date: getDefaultEndDate()
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('line');

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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

  // Handle resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get default start date (90 days ago)
  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date.toISOString().split('T')[0];
  }

  // Get default end date (tomorrow to include today's values)
  function getDefaultEndDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
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
        const translatedDefinitions = definitions
          .filter(def => !def.name?.startsWith('cle_'))
          .map(def =>
            applyMeasureTranslations(def, translations[def.id]?.[currentLanguage] || {})
          );
        setMeasureDefinitions(translatedDefinitions);

        // Auto-select weight measure, or first available
        const weightMeasure = translatedDefinitions.find(d => d.name === 'weight');
        const defaultMeasure = weightMeasure || translatedDefinitions[0];
        if (defaultMeasure) {
          setSelectedMeasureId(defaultMeasure.id);
          setSelectedDefinition(defaultMeasure);
        }
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
      const response = await api.get(`/patients/${patientId}/annotations`, {
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
      // Use ?? instead of || so that 0 decimal places is respected
      const decimals = selectedDefinition?.decimal_places ?? 2;

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

  // Get reference areas for normal ranges and alert thresholds
  const getReferenceAreas = () => {
    if (!selectedDefinition) return null;

    const areas = [];
    const def = selectedDefinition;

    // Determine Y-axis domain for proper zone rendering
    const minValue = def.min_value ? parseFloat(def.min_value) : (chartData.length > 0 ? Math.min(...chartData.map(d => d.value)) * 0.9 : 0);
    const maxValue = def.max_value ? parseFloat(def.max_value) : (chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) * 1.1 : 100);

    // Critical low zone (red)
    if (def.alert_threshold_min) {
      areas.push(
        <ReferenceArea
          key="critical-low"
          y1={minValue}
          y2={parseFloat(def.alert_threshold_min)}
          fill="#dc3545"
          fillOpacity={0.1}
          ifOverflow="extendDomain"
        />
      );
    }

    // Warning low zone (yellow)
    if (def.normal_range_min && def.alert_threshold_min) {
      areas.push(
        <ReferenceArea
          key="warning-low"
          y1={parseFloat(def.alert_threshold_min)}
          y2={parseFloat(def.normal_range_min)}
          fill="#ffc107"
          fillOpacity={0.15}
          ifOverflow="extendDomain"
        />
      );
    } else if (def.normal_range_min && !def.alert_threshold_min) {
      // If no critical threshold, warning zone starts from min
      areas.push(
        <ReferenceArea
          key="warning-low"
          y1={minValue}
          y2={parseFloat(def.normal_range_min)}
          fill="#ffc107"
          fillOpacity={0.15}
          ifOverflow="extendDomain"
        />
      );
    }

    // Normal zone (green)
    if (def.normal_range_min && def.normal_range_max) {
      areas.push(
        <ReferenceArea
          key="normal"
          y1={parseFloat(def.normal_range_min)}
          y2={parseFloat(def.normal_range_max)}
          fill="#28a745"
          fillOpacity={0.1}
          ifOverflow="extendDomain"
        />
      );
    }

    // Warning high zone (yellow)
    if (def.normal_range_max && def.alert_threshold_max) {
      areas.push(
        <ReferenceArea
          key="warning-high"
          y1={parseFloat(def.normal_range_max)}
          y2={parseFloat(def.alert_threshold_max)}
          fill="#ffc107"
          fillOpacity={0.15}
          ifOverflow="extendDomain"
        />
      );
    } else if (def.normal_range_max && !def.alert_threshold_max) {
      // If no critical threshold, warning zone extends to max
      areas.push(
        <ReferenceArea
          key="warning-high"
          y1={parseFloat(def.normal_range_max)}
          y2={maxValue}
          fill="#ffc107"
          fillOpacity={0.15}
          ifOverflow="extendDomain"
        />
      );
    }

    // Critical high zone (red)
    if (def.alert_threshold_max) {
      areas.push(
        <ReferenceArea
          key="critical-high"
          y1={parseFloat(def.alert_threshold_max)}
          y2={maxValue}
          fill="#dc3545"
          fillOpacity={0.1}
          ifOverflow="extendDomain"
        />
      );
    }

    return areas;
  };

  // Get trend indicator with translation
  const rawTrendIndicator = trendData?.trend ? formatTrendIndicator(trendData.trend) : null;

  // Adjust trend indicator based on trend_preference
  const getTrendIndicator = () => {
    if (!rawTrendIndicator) return null;

    const direction = trendData?.trend?.direction || 'stable';
    const trendPreference = selectedDefinition?.trend_preference || 'increase';

    // Determine if this is a "good" trend based on preference
    let adjustedColor = rawTrendIndicator.color;
    let isPositive = null; // null = neutral

    if (direction === 'increasing') {
      if (trendPreference === 'increase') {
        adjustedColor = 'green';
        isPositive = true;
      } else if (trendPreference === 'decrease') {
        adjustedColor = 'red';
        isPositive = false;
      } else {
        adjustedColor = 'blue';
      }
    } else if (direction === 'decreasing') {
      if (trendPreference === 'decrease') {
        adjustedColor = 'green';
        isPositive = true;
      } else if (trendPreference === 'increase') {
        adjustedColor = 'red';
        isPositive = false;
      } else {
        adjustedColor = 'blue';
      }
    } else {
      adjustedColor = 'blue';
    }

    return {
      ...rawTrendIndicator,
      color: adjustedColor,
      isPositive
    };
  };

  const trendIndicator = getTrendIndicator();

  // Translate trend text
  const getTranslatedTrendText = () => {
    if (!trendIndicator) return '';
    const direction = trendData?.trend?.direction || 'stable';
    const translatedDirection = t(`measures.trend.${direction}`, trendIndicator.text);
    const sign = trendIndicator.sign || '';
    const percentage = trendIndicator.percentage || '0';
    return `${trendIndicator.emoji} ${sign}${percentage}% ${translatedDirection}`;
  };

  // Get formatted statistics with translations
  const rawStats = trendData?.statistics
    ? formatStatisticsSummary(trendData.statistics, selectedDefinition?.unit || '')
    : null;

  // Translate stat labels
  const formattedStats = rawStats?.map(stat => ({
    ...stat,
    label: t(`measures.stats.${stat.key}`, stat.label)
  }));

  // Calculate Y-axis domain with 20% padding
  const getYAxisDomain = () => {
    if (chartData.length === 0) return ['auto', 'auto'];

    const values = chartData
      .map(d => d.value)
      .filter(v => v !== null && v !== undefined);

    if (values.length === 0) return ['auto', 'auto'];

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const padding = range * 0.2; // 20% padding

    // If range is 0 (all same values), use 10% of the value as padding
    const actualPadding = range === 0 ? Math.abs(minValue) * 0.1 || 1 : padding;

    return [
      Math.floor((minValue - actualPadding) * 100) / 100,
      Math.ceil((maxValue + actualPadding) * 100) / 100
    ];
  };

  const yAxisDomain = getYAxisDomain();

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
        {/* Controls - Responsive layout */}
        <Row className="mb-3 g-2">
          <Col xs={12} md={4}>
            <Form.Group>
              <Form.Label>{t('measures.selectMeasure')}</Form.Label>
              <Form.Select
                value={selectedMeasureId}
                onChange={handleMeasureChange}
                size={isMobile ? 'sm' : undefined}
              >
                {measureDefinitions.map(measure => (
                  <option key={measure.id} value={measure.id}>
                    {measure.display_name} {measure.unit ? `(${measure.unit})` : ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={6} md={3}>
            <Form.Group>
              <Form.Label>{t('measures.startDate')}</Form.Label>
              <Form.Control
                type="date"
                value={dateRange.start_date}
                onChange={(e) => handleDateRangeChange('start_date', e.target.value)}
                size={isMobile ? 'sm' : undefined}
              />
            </Form.Group>
          </Col>
          <Col xs={6} md={3}>
            <Form.Group>
              <Form.Label>{t('measures.endDate')}</Form.Label>
              <Form.Control
                type="date"
                value={dateRange.end_date}
                onChange={(e) => handleDateRangeChange('end_date', e.target.value)}
                size={isMobile ? 'sm' : undefined}
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={2}>
            <Form.Group>
              <Form.Label>{t('measures.chartType')}</Form.Label>
              <Form.Select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                size={isMobile ? 'sm' : undefined}
              >
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

        {/* Trend Indicator - Responsive */}
        {trendIndicator && trendData?.data?.length > 0 && (
          <Alert variant={trendIndicator.color === 'green' ? 'success' : trendIndicator.color === 'red' ? 'danger' : 'info'} className="mb-3 py-2">
            <div className={`d-flex ${isMobile ? 'flex-column' : 'align-items-center justify-content-between'}`}>
              <div>
                <strong style={{ fontSize: isMobile ? '0.95em' : '1.1em' }}>{getTranslatedTrendText()}</strong>
                {trendData.trend.velocity !== 0 && (
                  <span style={{ marginLeft: isMobile ? '0' : '15px', fontSize: isMobile ? '0.8em' : '0.9em', display: isMobile ? 'block' : 'inline' }}>
                    {t('measures.velocity', 'Velocity')}: {trendData.trend.velocity > 0 ? '+' : ''}{trendData.trend.velocity.toFixed(2)} {selectedDefinition?.unit}/{t('measures.day', 'day')}
                  </span>
                )}
              </div>
              {trendData.trend.rSquared > 0 && (
                <Badge bg="secondary" className={isMobile ? 'mt-1 align-self-start' : 'p-2'} style={{ fontSize: isMobile ? '0.7em' : undefined }}>
                  R² = {trendData.trend.rSquared.toFixed(3)}
                </Badge>
              )}
            </div>
          </Alert>
        )}

        {/* Moving Average Toggles - Responsive */}
        {trendData?.movingAverages && (
          <Row className="mb-3">
            <Col>
              {isMobile ? (
                <div>
                  <strong style={{ fontSize: '0.85em', display: 'block', marginBottom: '8px' }}>{t('measures.displayOptions', 'Display Options')}:</strong>
                  <div className="d-flex flex-wrap gap-2">
                    <Form.Check
                      type="checkbox"
                      id="showMA7"
                      label={<small style={{ color: getMAColor(7) }}>{t('measures.chart.ma7', 'MM 7j')}</small>}
                      checked={showMA7}
                      onChange={(e) => setShowMA7(e.target.checked)}
                      disabled={!trendData.movingAverages.ma7 || trendData.movingAverages.ma7.length === 0}
                    />
                    <Form.Check
                      type="checkbox"
                      id="showMA30"
                      label={<small style={{ color: getMAColor(30) }}>{t('measures.chart.ma30', 'MM 30j')}</small>}
                      checked={showMA30}
                      onChange={(e) => setShowMA30(e.target.checked)}
                      disabled={!trendData.movingAverages.ma30 || trendData.movingAverages.ma30.length === 0}
                    />
                    <Form.Check
                      type="checkbox"
                      id="showMA90"
                      label={<small style={{ color: getMAColor(90) }}>{t('measures.chart.ma90', 'MM 90j')}</small>}
                      checked={showMA90}
                      onChange={(e) => setShowMA90(e.target.checked)}
                      disabled={!trendData.movingAverages.ma90 || trendData.movingAverages.ma90.length === 0}
                    />
                    <Form.Check
                      type="checkbox"
                      id="showTrendLine"
                      label={<small style={{ color: '#ef4444' }}>{t('measures.chart.trendLine', 'Tendance')}</small>}
                      checked={showTrendLine}
                      onChange={(e) => setShowTrendLine(e.target.checked)}
                      disabled={!trendData.trendLine}
                    />
                  </div>
                </div>
              ) : (
                <div className="d-flex gap-3 align-items-center">
                  <strong style={{ fontSize: '0.9em' }}>{t('measures.displayOptions', 'Display Options')}:</strong>
                  <Form.Check
                    type="checkbox"
                    id="showMA7"
                    label={<span style={{ color: getMAColor(7) }}>{t('measures.chart.ma7Long', 'Moyenne Mobile 7 jours')}</span>}
                    checked={showMA7}
                    onChange={(e) => setShowMA7(e.target.checked)}
                    disabled={!trendData.movingAverages.ma7 || trendData.movingAverages.ma7.length === 0}
                  />
                  <Form.Check
                    type="checkbox"
                    id="showMA30"
                    label={<span style={{ color: getMAColor(30) }}>{t('measures.chart.ma30Long', 'Moyenne Mobile 30 jours')}</span>}
                    checked={showMA30}
                    onChange={(e) => setShowMA30(e.target.checked)}
                    disabled={!trendData.movingAverages.ma30 || trendData.movingAverages.ma30.length === 0}
                  />
                  <Form.Check
                    type="checkbox"
                    id="showMA90"
                    label={<span style={{ color: getMAColor(90) }}>{t('measures.chart.ma90Long', 'Moyenne Mobile 90 jours')}</span>}
                    checked={showMA90}
                    onChange={(e) => setShowMA90(e.target.checked)}
                    disabled={!trendData.movingAverages.ma90 || trendData.movingAverages.ma90.length === 0}
                  />
                  <Form.Check
                    type="checkbox"
                    id="showTrendLine"
                    label={<span style={{ color: '#ef4444' }}>{t('measures.chart.trendLineLong', 'Ligne de Tendance')}</span>}
                    checked={showTrendLine}
                    onChange={(e) => setShowTrendLine(e.target.checked)}
                    disabled={!trendData.trendLine}
                  />
                </div>
              )}
            </Col>
          </Row>
        )}

        {/* Enhanced Statistics - Responsive */}
        {formattedStats && (
          <Card className="mb-3 bg-light">
            <Card.Body className={isMobile ? 'p-2' : ''}>
              <h6 className={isMobile ? 'mb-2' : 'mb-3'} style={{ fontSize: isMobile ? '0.9em' : '1em' }}>
                📊 {t('measures.statisticalSummary', 'Statistical Summary')}
              </h6>
              <Row className="g-1">
                {formattedStats.map(stat => (
                  <Col key={stat.key} xs={4} md={2} className="mb-1">
                    <div style={{ fontSize: isMobile ? '0.7em' : '0.85em', color: '#666' }}>{stat.label}</div>
                    <div style={{ fontWeight: 'bold', fontSize: isMobile ? '0.8em' : '1em' }}>{stat.value}</div>
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
            <ResponsiveContainer width="100%" height={isMobile ? 280 : 450}>
            {chartType === 'area' ? (
              <AreaChart data={chartData} margin={isMobile ? { left: -15, right: 5 } : undefined}>
                {getReferenceAreas()}
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 60 : 30}
                  interval={isMobile ? 'preserveStartEnd' : 0}
                  tickFormatter={(value) => {
                    if (isMobile) {
                      // Format as short date on mobile: "12/01"
                      const parts = value.split('/');
                      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : value;
                    }
                    return value;
                  }}
                />
                <YAxis
                  label={isMobile ? undefined : {
                    value: selectedDefinition?.unit || '',
                    angle: -90,
                    position: 'insideLeft'
                  }}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  width={isMobile ? 40 : 60}
                  domain={yAxisDomain}
                />
                <Tooltip content={<CustomTooltip />} />
                {!isMobile && <Legend />}
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
                    name={t('measures.chart.ma7Long', 'Moyenne Mobile 7 jours')}
                    strokeWidth={isMobile ? 1 : 2}
                  />
                )}
                {showMA30 && (
                  <Area
                    type="monotone"
                    dataKey="ma30"
                    stroke={getMAColor(30)}
                    fill="none"
                    strokeDasharray="5 5"
                    name={t('measures.chart.ma30Long', 'Moyenne Mobile 30 jours')}
                    strokeWidth={isMobile ? 1 : 2}
                  />
                )}
                {showMA90 && (
                  <Area
                    type="monotone"
                    dataKey="ma90"
                    stroke={getMAColor(90)}
                    fill="none"
                    strokeDasharray="5 5"
                    name={t('measures.chart.ma90Long', 'Moyenne Mobile 90 jours')}
                    strokeWidth={isMobile ? 1 : 2}
                  />
                )}
                {showTrendLine && (
                  <Area
                    type="monotone"
                    dataKey="trendLine"
                    stroke="#ef4444"
                    fill="none"
                    strokeDasharray="3 3"
                    name={t('measures.chart.trendLineLong', 'Ligne de Tendance')}
                    strokeWidth={isMobile ? 1 : 2}
                  />
                )}
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={isMobile ? { left: -15, right: 5 } : undefined}>
                {getReferenceAreas()}
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 60 : 30}
                  interval={isMobile ? 'preserveStartEnd' : 0}
                  tickFormatter={(value) => {
                    if (isMobile) {
                      // Format as short date on mobile: "12/01"
                      const parts = value.split('/');
                      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : value;
                    }
                    return value;
                  }}
                />
                <YAxis
                  label={isMobile ? undefined : {
                    value: selectedDefinition?.unit || '',
                    angle: -90,
                    position: 'insideLeft'
                  }}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  width={isMobile ? 40 : 60}
                  domain={yAxisDomain}
                />
                <Tooltip content={<CustomTooltip />} />
                {!isMobile && <Legend />}
                {/* Main value line */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={isMobile ? 1.5 : 2}
                  dot={isMobile ? { r: 2 } : (props) => {
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
                  activeDot={{ r: isMobile ? 4 : 6 }}
                  name={selectedDefinition?.display_name || t('measures.value')}
                />
                {/* Moving Average 7 */}
                {showMA7 && (
                  <Line
                    type="monotone"
                    dataKey="ma7"
                    stroke={getMAColor(7)}
                    strokeWidth={isMobile ? 1 : 2}
                    strokeDasharray="5 5"
                    dot={false}
                    name={t('measures.chart.ma7Long', 'Moyenne Mobile 7 jours')}
                  />
                )}
                {/* Moving Average 30 */}
                {showMA30 && (
                  <Line
                    type="monotone"
                    dataKey="ma30"
                    stroke={getMAColor(30)}
                    strokeWidth={isMobile ? 1 : 2}
                    strokeDasharray="5 5"
                    dot={false}
                    name={t('measures.chart.ma30Long', 'Moyenne Mobile 30 jours')}
                  />
                )}
                {/* Moving Average 90 */}
                {showMA90 && (
                  <Line
                    type="monotone"
                    dataKey="ma90"
                    stroke={getMAColor(90)}
                    strokeWidth={isMobile ? 1 : 2}
                    strokeDasharray="5 5"
                    dot={false}
                    name={t('measures.chart.ma90Long', 'Moyenne Mobile 90 jours')}
                  />
                )}
                {/* Trend Line */}
                {showTrendLine && (
                  <Line
                    type="monotone"
                    dataKey="trendLine"
                    stroke="#ef4444"
                    strokeWidth={isMobile ? 1 : 2}
                    strokeDasharray="3 3"
                    dot={false}
                    name={t('measures.chart.trendLineLong', 'Ligne de Tendance')}
                  />
                )}
                {/* Annotation Markers (Phase 3) */}
                {annotations.map(annotation => {
                  const annotDate = formatDate(annotation.event_date, i18n.language);
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

          {/* Range Zone Legend - Responsive */}
          {selectedDefinition?.normal_range_min && selectedDefinition?.normal_range_max && (
            <div className={`mt-3 d-flex ${isMobile ? 'flex-wrap' : ''} justify-content-center gap-${isMobile ? '2' : '4'}`} style={{ fontSize: isMobile ? '0.75em' : '0.85em' }}>
              {selectedDefinition.alert_threshold_min && (
                <div className="d-flex align-items-center gap-1">
                  <div style={{ width: isMobile ? '14px' : '20px', height: isMobile ? '10px' : '12px', backgroundColor: '#dc3545', opacity: 0.3 }}></div>
                  <span>{t('measures.criticalLow', 'Critical Low')}</span>
                </div>
              )}
              <div className="d-flex align-items-center gap-1">
                <div style={{ width: isMobile ? '14px' : '20px', height: isMobile ? '10px' : '12px', backgroundColor: '#ffc107', opacity: 0.4 }}></div>
                <span>{t('measures.warning', 'Warning')}</span>
              </div>
              <div className="d-flex align-items-center gap-1">
                <div style={{ width: isMobile ? '14px' : '20px', height: isMobile ? '10px' : '12px', backgroundColor: '#28a745', opacity: 0.3 }}></div>
                <span>
                  {t('measures.normal', 'Normal')} {!isMobile && `(${parseFloat(selectedDefinition.normal_range_min).toFixed(1)} - ${parseFloat(selectedDefinition.normal_range_max).toFixed(1)} ${selectedDefinition.unit})`}
                </span>
              </div>
              {selectedDefinition.alert_threshold_max && (
                <div className="d-flex align-items-center gap-1">
                  <div style={{ width: isMobile ? '14px' : '20px', height: isMobile ? '10px' : '12px', backgroundColor: '#dc3545', opacity: 0.3 }}></div>
                  <span>{t('measures.criticalHigh', 'Critical High')}</span>
                </div>
              )}
            </div>
          )}

          {/* Annotation List - Responsive */}
          {annotations.length > 0 && (
            <div className="mt-3">
              <h6 style={{ fontSize: isMobile ? '0.9em' : '1em' }}>📌 {t('annotations.annotations', 'Annotations')}</h6>
              <div className="d-flex flex-wrap gap-2">
                {annotations.map(annotation => (
                  <Badge
                    key={annotation.id}
                    style={{
                      backgroundColor: annotation.color || '#FF5733',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.75em' : undefined
                    }}
                    onClick={() => {
                      setEditingAnnotation(annotation);
                      setShowAnnotationModal(true);
                    }}
                  >
                    {formatDate(annotation.event_date, i18n.language)}: {annotation.title}
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
