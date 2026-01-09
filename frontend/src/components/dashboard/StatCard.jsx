import PropTypes from 'prop-types';

/**
 * StatCard Component
 * Displays a key metric with icon, label, value, and optional change indicator
 * Uses AdminLTE small-box styling
 */
function StatCard({ icon, label, value, change, changeType, variant = 'info', loading = false }) {
  // Ensure value is a valid renderable type
  const displayValue = loading ? '...' : (typeof value === 'number' || typeof value === 'string' ? value : '0');
  const bgClass = `bg-${variant}`;

  return (
    <div className={`small-box ${bgClass}`}>
      <div className="inner">
        <h3>{displayValue}</h3>
        <p>{label}</p>
      </div>
      <div className="icon">
        {icon}
      </div>
      {change !== undefined && !loading && (
        <div className="small-box-footer">
          {changeType === 'positive' && 'More info '}
          {changeType === 'negative' && 'More info '}
          {changeType === 'neutral' && 'More info '}
          <i className="fas fa-arrow-circle-right" />
        </div>
      )}
    </div>
  );
}

StatCard.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  change: PropTypes.string,
  changeType: PropTypes.oneOf(['positive', 'negative', 'neutral']),
  variant: PropTypes.oneOf(['info', 'success', 'warning', 'danger', 'primary', 'secondary']),
  loading: PropTypes.bool
};

export default StatCard;
