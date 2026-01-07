import { Card } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * StatCard Component
 * Displays a key metric with icon, label, value, and optional change indicator
 */
function StatCard({ icon, label, value, change, changeType, variant = 'primary', loading = false }) {
  return (
    <Card className={`border-start border-${variant} border-4 shadow-sm`}>
      <Card.Body>
        <div className="d-flex align-items-center">
          <div className={`me-3 text-${variant}`} style={{ fontSize: '2.5rem' }}>
            {icon}
          </div>
          <div className="flex-grow-1">
            <div className="text-muted text-uppercase small mb-1">{label}</div>
            {loading ? (
              <div className="spinner-border spinner-border-sm text-muted" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            ) : (
              <div className="h4 mb-0 fw-bold">{value}</div>
            )}
            {change !== undefined && !loading && (
              <div className={`small text-${changeType === 'positive' ? 'success' : changeType === 'negative' ? 'danger' : 'muted'}`}>
                {changeType === 'positive' && '↑ '}
                {changeType === 'negative' && '↓ '}
                {change}
              </div>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

StatCard.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  change: PropTypes.string,
  changeType: PropTypes.oneOf(['positive', 'negative', 'neutral']),
  variant: PropTypes.oneOf(['primary', 'success', 'info', 'warning', 'danger', 'secondary']),
  loading: PropTypes.bool
};

export default StatCard;
