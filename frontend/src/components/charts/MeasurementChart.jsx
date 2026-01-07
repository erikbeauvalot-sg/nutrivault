import { useEffect, useState } from 'react';
import { Card, Spinner, Alert, Form, Row, Col } from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import { getPatientMeasurementHistory } from '../../services/visitService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const MeasurementChart = ({ patientId }) => {
  const [measurementType, setMeasurementType] = useState('weight');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const measurementTypes = [
    { value: 'weight', label: 'Weight', unit: 'kg' },
    { value: 'height', label: 'Height', unit: 'cm' },
    { value: 'bmi', label: 'BMI', unit: 'kg/m²' },
    { value: 'blood_pressure_systolic', label: 'Blood Pressure (Systolic)', unit: 'mmHg' },
    { value: 'blood_pressure_diastolic', label: 'Blood Pressure (Diastolic)', unit: 'mmHg' },
    { value: 'waist_circumference', label: 'Waist Circumference', unit: 'cm' },
    { value: 'body_fat_percentage', label: 'Body Fat %', unit: '%' },
    { value: 'glucose', label: 'Blood Glucose', unit: 'mg/dL' },
  ];

  useEffect(() => {
    if (patientId && measurementType) {
      fetchMeasurementHistory();
    }
  }, [patientId, measurementType]);

  const fetchMeasurementHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getPatientMeasurementHistory(patientId, measurementType);
      const measurements = response.data || [];
      
      if (measurements.length === 0) {
        setChartData(null);
        return;
      }

      // Sort by date
      measurements.sort((a, b) => new Date(a.visitDate) - new Date(b.visitDate));

      // Format data for Chart.js
      const labels = measurements.map((m) =>
        format(new Date(m.visitDate), 'MMM dd, yyyy')
      );
      const values = measurements.map((m) => parseFloat(m.value));

      const selectedType = measurementTypes.find((t) => t.value === measurementType);
      
      setChartData({
        labels,
        datasets: [
          {
            label: `${selectedType.label} (${selectedType.unit})`,
            data: values,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.3,
            fill: true,
          },
        ],
      });
    } catch (err) {
      console.error('Error fetching measurement history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Measurement History Over Time',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function (value) {
            return value.toFixed(1);
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Measurement Trends</h5>
        <Row className="g-2">
          <Col xs="auto">
            <Form.Select
              size="sm"
              value={measurementType}
              onChange={(e) => setMeasurementType(e.target.value)}
              style={{ width: 'auto' }}
            >
              {measurementTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Form.Select>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body>
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading chart...</span>
            </Spinner>
            <p className="mt-3">Loading measurement history...</p>
          </div>
        )}

        {error && !loading && (
          <Alert variant="warning">
            <p className="mb-0">Failed to load measurement history: {error}</p>
          </Alert>
        )}

        {!loading && !error && !chartData && (
          <Alert variant="info">
            <p className="mb-0">
              No measurement data available for {measurementTypes.find((t) => t.value === measurementType)?.label}.
            </p>
          </Alert>
        )}

        {!loading && !error && chartData && (
          <div style={{ position: 'relative', height: '400px' }}>
            <Line options={options} data={chartData} />
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default MeasurementChart;
