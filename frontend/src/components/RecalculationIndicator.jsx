/**
 * RecalculationIndicator Component
 * Shows a loading state while calculated fields are being recalculated
 * Displays during save operations when calculated fields need to be updated
 */

import { Alert, Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';

const RecalculationIndicator = ({ show, fieldCount }) => {
  if (!show) return null;

  return (
    <Alert variant="info" className="mb-3 d-flex align-items-center">
      <Spinner animation="border" size="sm" className="me-2" />
      <div>
        <strong>🧮 Recalculating fields...</strong>
        {fieldCount > 0 && (
          <span className="ms-2">
            ({fieldCount} calculated field{fieldCount > 1 ? 's' : ''})
          </span>
        )}
        <div className="small text-muted mt-1">
          Calculated fields are being updated based on the new values
        </div>
      </div>
    </Alert>
  );
};

RecalculationIndicator.propTypes = {
  show: PropTypes.bool.isRequired,
  fieldCount: PropTypes.number
};

RecalculationIndicator.defaultProps = {
  fieldCount: 0
};

export default RecalculationIndicator;
