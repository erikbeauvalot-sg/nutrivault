/**
 * CustomFieldDisplay Component
 * Read-only display component for custom field values
 * Shows formatted values based on field type
 */

import { Badge } from 'react-bootstrap';
import PropTypes from 'prop-types';

const CustomFieldDisplay = ({ fieldDefinition, value }) => {
  const {
    field_label,
    field_type,
    select_options,
    validation_rules
  } = fieldDefinition;

  const formatValue = () => {
    // Handle empty values
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted">-</span>;
    }

    switch (field_type) {
      case 'boolean':
        return value === true || value === 'true' ?
          <Badge bg="success">Oui</Badge> :
          <Badge bg="secondary">Non</Badge>;

      case 'date':
        // Format date based on validation_rules.dateFormat
        const dateFormat = validation_rules?.dateFormat || 'DD/MM/YYYY';
        if (!value) return <span className="text-muted">-</span>;

        const parts = value.split('-');
        if (parts.length !== 3) return value;

        const [year, month, day] = parts;
        switch (dateFormat) {
          case 'MM/DD/YYYY':
            return `${month}/${day}/${year}`;
          case 'YYYY-MM-DD':
            return value;
          case 'DD/MM/YYYY':
          default:
            return `${day}/${month}/${year}`;
        }

      case 'select':
        return <Badge bg="primary">{value}</Badge>;

      case 'number':
        return <strong>{value}</strong>;

      case 'textarea':
        return (
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {value}
          </div>
        );

      case 'text':
      default:
        return <span>{value}</span>;
    }
  };

  return (
    <div className="mb-3">
      <div className="text-muted small mb-1">{field_label}</div>
      <div>{formatValue()}</div>
    </div>
  );
};

CustomFieldDisplay.propTypes = {
  fieldDefinition: PropTypes.shape({
    field_label: PropTypes.string.isRequired,
    field_type: PropTypes.oneOf(['text', 'textarea', 'number', 'date', 'select', 'boolean']).isRequired,
    validation_rules: PropTypes.object,
    select_options: PropTypes.arrayOf(PropTypes.string)
  }).isRequired,
  value: PropTypes.any
};

export default CustomFieldDisplay;
