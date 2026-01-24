/**
 * CalculatedFieldsInfo Component
 * Informational alert explaining how calculated fields work
 * Shows only when there are calculated fields present
 */

import { Alert } from 'react-bootstrap';
import PropTypes from 'prop-types';

const CalculatedFieldsInfo = ({ calculatedFieldCount, variant = 'info', showDetails = true }) => {
  if (calculatedFieldCount === 0) return null;

  return (
    <Alert variant={variant} className="mb-3">
      <div className="d-flex align-items-start">
        <span className="me-2" style={{ fontSize: '20px' }}>🧮</span>
        <div>
          <strong>Calculated Fields ({calculatedFieldCount})</strong>
          {showDetails && (
            <>
              <div className="small mt-1">
                Calculated fields are automatically computed from other field values and update in real-time when their dependencies change.
              </div>
              <div className="small text-muted mt-1">
                ⚡ Auto-calculated • 🔄 Updates automatically • 🔒 Read-only
              </div>
            </>
          )}
        </div>
      </div>
    </Alert>
  );
};

CalculatedFieldsInfo.propTypes = {
  calculatedFieldCount: PropTypes.number.isRequired,
  variant: PropTypes.string,
  showDetails: PropTypes.bool
};

export default CalculatedFieldsInfo;
