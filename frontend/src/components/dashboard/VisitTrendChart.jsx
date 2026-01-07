import { Card, Spinner } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import PropTypes from 'prop-types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * VisitTrendChart Component
 * Displays visit trend for the past 6 months using Chart.js
 */
function VisitTrendChart({ data, loading }) {
  const chartData = {
    labels: data?.labels || [],
    datasets: [
      {
        label: 'Visits',
        data: data?.values || [],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          callback: function(value) {
            if (Math.floor(value) === value) {
              return value;
            }
          }
        }
      }
    }
  };

  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="bg-white">
        <h5 className="mb-0">Visit Trend (Last 6 Months)</h5>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <div className="mt-2 text-muted">Loading chart...</div>
          </div>
        ) : (
          <div style={{ height: '300px' }}>
            <Bar data={chartData} options={options} />
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

VisitTrendChart.propTypes = {
  data: PropTypes.shape({
    labels: PropTypes.arrayOf(PropTypes.string),
    values: PropTypes.arrayOf(PropTypes.number)
  }),
  loading: PropTypes.bool
};

export default VisitTrendChart;
