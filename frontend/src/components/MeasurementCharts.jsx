/**
 * MeasurementCharts Component
 * Displays measurement trends over time using line charts
 */

import { useState, useEffect } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

const MeasurementCharts = ({ visits }) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Extract all measurements from visits
  const extractMeasurementData = () => {
    const data = [];

    visits.forEach(visit => {
      if (visit.measurements && visit.measurements.length > 0) {
        visit.measurements.forEach(measurement => {
          // Use measurement's created_at or fall back to visit_date
          const measurementDate = measurement.created_at || visit.visit_date;
          const date = new Date(measurementDate);

          // Calculate BMI if weight and height are available but BMI is not
          let bmi = measurement.bmi || null;
          if (!bmi && measurement.weight_kg && measurement.height_cm) {
            const heightInMeters = measurement.height_cm / 100;
            bmi = parseFloat((measurement.weight_kg / (heightInMeters * heightInMeters)).toFixed(2));
          }

          data.push({
            date: date,
            visitDate: date.toLocaleDateString(),
            visitTime: date.toLocaleString(),
            weight_kg: measurement.weight_kg || null,
            height_cm: measurement.height_cm || null,
            bmi: bmi,
            bmiCalculated: !measurement.bmi && bmi ? true : false, // Flag to indicate calculated BMI
            bp_systolic: measurement.blood_pressure_systolic || null,
            bp_diastolic: measurement.blood_pressure_diastolic || null,
            waist_cm: measurement.waist_circumference_cm || null,
            body_fat: measurement.body_fat_percentage || null,
            muscle_mass: measurement.muscle_mass_percentage || null
          });
        });
      }
    });

    // Sort by date (oldest to newest)
    return data.sort((a, b) => a.date - b.date);
  };

  const measurementData = extractMeasurementData();

  // Debug log to verify data extraction
  const calculatedBMICount = measurementData.filter(d => d.bmiCalculated).length;
  const storedBMICount = measurementData.filter(d => d.bmi && !d.bmiCalculated).length;

  // console.log('📊 Measurement data extracted:', {
  //   totalVisits: visits.length,
  //   visitsWithMeasurements: visits.filter(v => v.measurements?.length > 0).length,
  //   totalMeasurements: measurementData.length,
  //   bmiStats: {
  //     stored: storedBMICount,
  //     calculated: calculatedBMICount,
  //     total: storedBMICount + calculatedBMICount
  //   },
  //   measurements: measurementData
  // });

  if (measurementData.length === 0) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <h5 className="text-muted">No measurement data available</h5>
          <p className="text-muted">Measurements will appear here once recorded during visits</p>
          <p className="text-muted small">Total visits: {visits.length}</p>
        </Card.Body>
      </Card>
    );
  }

  const formatTooltip = (value, name) => {
    if (value === null) return ['-', name];
    return [value.toFixed(2), name];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white border rounded p-2 shadow-sm">
          <p className="mb-1 small fw-bold">{dataPoint.visitTime}</p>
          {payload.map((entry, index) => (
            <p key={index} className="mb-0 small" style={{ color: entry.color }}>
              {entry.name}: {entry.value !== null ? entry.value.toFixed(2) : '-'}
              {entry.dataKey === 'bmi' && dataPoint.bmiCalculated && (
                <span className="text-muted"> (calculated)</span>
              )}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const hasData = (field) => measurementData.some(d => d[field] !== null);

  // Common chart props for responsive behavior
  const chartHeight = isMobile ? 200 : 250;
  const xAxisProps = {
    dataKey: 'visitDate',
    tick: { fontSize: isMobile ? 10 : 12 },
    angle: isMobile ? -45 : 0,
    textAnchor: isMobile ? 'end' : 'middle',
    height: isMobile ? 50 : 30,
    interval: isMobile ? 'preserveStartEnd' : 0,
    tickFormatter: (value) => {
      if (isMobile && value) {
        // Format as short date on mobile: "12/01"
        const parts = value.split('/');
        return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : value;
      }
      return value;
    }
  };
  const yAxisProps = {
    tick: { fontSize: isMobile ? 10 : 12 },
    width: isMobile ? 35 : 60
  };
  const chartMargin = isMobile ? { left: -20, right: 5 } : undefined;

  return (
    <div>
      <Row>
        {/* Weight Chart */}
        {hasData('weight_kg') && (
          <Col xs={12} md={6} className="mb-3">
            <Card>
              <Card.Header className="bg-primary text-white py-2">
                <h6 className="mb-0" style={{ fontSize: isMobile ? '0.9em' : '1em' }}>⚖️ {t('visits.weight')} (kg)</h6>
              </Card.Header>
              <Card.Body className={isMobile ? 'p-2' : ''}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <LineChart data={measurementData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <Tooltip content={<CustomTooltip />} />
                    {!isMobile && <Legend />}
                    <Line
                      type="monotone"
                      dataKey="weight_kg"
                      stroke="#0d6efd"
                      strokeWidth={isMobile ? 1.5 : 2}
                      dot={{ r: isMobile ? 2 : 4 }}
                      name={t('visits.weight')}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* BMI Chart */}
        {hasData('bmi') && (
          <Col xs={12} md={6} className="mb-3">
            <Card>
              <Card.Header className="bg-success text-white py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0" style={{ fontSize: isMobile ? '0.9em' : '1em' }}>📊 {t('patients.bmi')}</h6>
                  {calculatedBMICount > 0 && (
                    <small className="mb-0" style={{ fontSize: isMobile ? '0.65rem' : '0.75rem', opacity: 0.9 }}>
                      {calculatedBMICount} {t('patients.autoCalculated')}
                    </small>
                  )}
                </div>
              </Card.Header>
              <Card.Body className={isMobile ? 'p-2' : ''}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <LineChart data={measurementData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <Tooltip content={<CustomTooltip />} />
                    {!isMobile && <Legend />}
                    <Line
                      type="monotone"
                      dataKey="bmi"
                      stroke="#198754"
                      strokeWidth={isMobile ? 1.5 : 2}
                      dot={{ r: isMobile ? 2 : 4 }}
                      name={t('patients.bmi')}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Blood Pressure Chart */}
        {(hasData('bp_systolic') || hasData('bp_diastolic')) && (
          <Col xs={12} md={6} className="mb-3">
            <Card>
              <Card.Header className="bg-danger text-white py-2">
                <h6 className="mb-0" style={{ fontSize: isMobile ? '0.9em' : '1em' }}>❤️ {t('visits.bloodPressure', 'Blood Pressure')} (mmHg)</h6>
              </Card.Header>
              <Card.Body className={isMobile ? 'p-2' : ''}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <LineChart data={measurementData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <Tooltip content={<CustomTooltip />} />
                    {!isMobile && <Legend />}
                    {hasData('bp_systolic') && (
                      <Line
                        type="monotone"
                        dataKey="bp_systolic"
                        stroke="#dc3545"
                        strokeWidth={isMobile ? 1.5 : 2}
                        dot={{ r: isMobile ? 2 : 4 }}
                        name={t('visits.systolic', 'Systolic')}
                        connectNulls
                      />
                    )}
                    {hasData('bp_diastolic') && (
                      <Line
                        type="monotone"
                        dataKey="bp_diastolic"
                        stroke="#fd7e14"
                        strokeWidth={isMobile ? 1.5 : 2}
                        dot={{ r: isMobile ? 2 : 4 }}
                        name={t('visits.diastolic', 'Diastolic')}
                        connectNulls
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Waist Circumference Chart */}
        {hasData('waist_cm') && (
          <Col xs={12} md={6} className="mb-3">
            <Card>
              <Card.Header className="bg-warning py-2">
                <h6 className="mb-0" style={{ fontSize: isMobile ? '0.9em' : '1em' }}>📐 {t('visits.waistCircumference', 'Waist Circumference')} (cm)</h6>
              </Card.Header>
              <Card.Body className={isMobile ? 'p-2' : ''}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <LineChart data={measurementData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <Tooltip content={<CustomTooltip />} />
                    {!isMobile && <Legend />}
                    <Line
                      type="monotone"
                      dataKey="waist_cm"
                      stroke="#ffc107"
                      strokeWidth={isMobile ? 1.5 : 2}
                      dot={{ r: isMobile ? 2 : 4 }}
                      name={t('visits.waistCircumference', 'Waist')}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Body Fat Percentage Chart */}
        {hasData('body_fat') && (
          <Col xs={12} md={6} className="mb-3">
            <Card>
              <Card.Header className="bg-secondary text-white py-2">
                <h6 className="mb-0" style={{ fontSize: isMobile ? '0.9em' : '1em' }}>💪 {t('visits.bodyFat', 'Body Fat')} (%)</h6>
              </Card.Header>
              <Card.Body className={isMobile ? 'p-2' : ''}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <LineChart data={measurementData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <Tooltip content={<CustomTooltip />} />
                    {!isMobile && <Legend />}
                    <Line
                      type="monotone"
                      dataKey="body_fat"
                      stroke="#6c757d"
                      strokeWidth={isMobile ? 1.5 : 2}
                      dot={{ r: isMobile ? 2 : 4 }}
                      name={t('visits.bodyFat', 'Body Fat')}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Muscle Mass Percentage Chart */}
        {hasData('muscle_mass') && (
          <Col xs={12} md={6} className="mb-3">
            <Card>
              <Card.Header style={{ backgroundColor: '#6610f2', color: 'white' }} className="py-2">
                <h6 className="mb-0" style={{ fontSize: isMobile ? '0.9em' : '1em' }}>🏋️ {t('visits.muscleMass', 'Muscle Mass')} (%)</h6>
              </Card.Header>
              <Card.Body className={isMobile ? 'p-2' : ''}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <LineChart data={measurementData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <Tooltip content={<CustomTooltip />} />
                    {!isMobile && <Legend />}
                    <Line
                      type="monotone"
                      dataKey="muscle_mass"
                      stroke="#6610f2"
                      strokeWidth={isMobile ? 1.5 : 2}
                      dot={{ r: isMobile ? 2 : 4 }}
                      name={t('visits.muscleMass', 'Muscle Mass')}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default MeasurementCharts;
