/**
 * MeasurementCharts Component
 * Displays measurement trends over time using line charts
 */

import { Card, Row, Col } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

const MeasurementCharts = ({ visits }) => {
  const { t } = useTranslation();

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

  console.log('📊 Measurement data extracted:', {
    totalVisits: visits.length,
    visitsWithMeasurements: visits.filter(v => v.measurements?.length > 0).length,
    totalMeasurements: measurementData.length,
    bmiStats: {
      stored: storedBMICount,
      calculated: calculatedBMICount,
      total: storedBMICount + calculatedBMICount
    },
    measurements: measurementData
  });

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

  return (
    <div>
      <Row>
        {/* Weight Chart */}
        {hasData('weight_kg') && (
          <Col md={6} className="mb-4">
            <Card>
              <Card.Header className="bg-primary text-white">
                <h6 className="mb-0">⚖️ {t('visits.weight')} (kg)</h6>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={measurementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="visitDate" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="weight_kg"
                      stroke="#0d6efd"
                      strokeWidth={2}
                      name="Weight (kg)"
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
          <Col md={6} className="mb-4">
            <Card>
              <Card.Header className="bg-success text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">📊 BMI</h6>
                  {calculatedBMICount > 0 && (
                    <small className="mb-0" style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                      {calculatedBMICount} auto-calculated
                    </small>
                  )}
                </div>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={measurementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="visitDate" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="bmi"
                      stroke="#198754"
                      strokeWidth={2}
                      name="BMI"
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
          <Col md={6} className="mb-4">
            <Card>
              <Card.Header className="bg-danger text-white">
                <h6 className="mb-0">❤️ Blood Pressure (mmHg)</h6>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={measurementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="visitDate" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {hasData('bp_systolic') && (
                      <Line
                        type="monotone"
                        dataKey="bp_systolic"
                        stroke="#dc3545"
                        strokeWidth={2}
                        name="Systolic"
                        connectNulls
                      />
                    )}
                    {hasData('bp_diastolic') && (
                      <Line
                        type="monotone"
                        dataKey="bp_diastolic"
                        stroke="#fd7e14"
                        strokeWidth={2}
                        name="Diastolic"
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
          <Col md={6} className="mb-4">
            <Card>
              <Card.Header className="bg-warning">
                <h6 className="mb-0">📐 Waist Circumference (cm)</h6>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={measurementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="visitDate" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="waist_cm"
                      stroke="#ffc107"
                      strokeWidth={2}
                      name="Waist (cm)"
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
          <Col md={6} className="mb-4">
            <Card>
              <Card.Header className="bg-secondary text-white">
                <h6 className="mb-0">💪 Body Fat (%)</h6>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={measurementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="visitDate" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="body_fat"
                      stroke="#6c757d"
                      strokeWidth={2}
                      name="Body Fat (%)"
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
          <Col md={6} className="mb-4">
            <Card>
              <Card.Header style={{ backgroundColor: '#6610f2', color: 'white' }}>
                <h6 className="mb-0">🏋️ Muscle Mass (%)</h6>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={measurementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="visitDate" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="muscle_mass"
                      stroke="#6610f2"
                      strokeWidth={2}
                      name="Muscle Mass (%)"
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
