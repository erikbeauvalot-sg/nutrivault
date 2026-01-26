/**
 * CustomFieldDisplay Component
 * Read-only display component for custom field values
 * Shows formatted values based on field type
 */

import { Badge } from 'react-bootstrap';
import PropTypes from 'prop-types';

const CustomFieldDisplay = ({ fieldDefinition, value, searchQuery = '', highlightText = null }) => {
  const {
    field_label,
    field_type,
    select_options,
    validation_rules
  } = fieldDefinition;

  // Default highlightText function if not provided
  const defaultHighlightText = (text, query) => {
    if (!text || !query.trim()) return text;
    const parts = text.toString().split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} style={{ backgroundColor: '#fff3cd', padding: '0 2px', fontWeight: 'bold' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const highlight = highlightText || defaultHighlightText;

  const formatValue = () => {
    // Handle empty values
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted">-</span>;
    }

    switch (field_type) {
      case 'calculated':
        // Display calculated fields with special formatting
        // Use ?? instead of || so that 0 decimal places is respected
        const decimalPlaces = fieldDefinition.decimal_places ?? 2;
        const formattedValue = typeof value === 'number' ? value.toFixed(decimalPlaces) : value;
        return (
          <span style={{ fontWeight: '500' }}>
            🧮 {formattedValue}
          </span>
        );

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
        // Handle value that might be stored as object {value, label} or just string
        // Also look up the label from select_options if available
        let displayLabel = value;
        if (typeof value === 'object' && value !== null) {
          displayLabel = value.label || value.value || JSON.stringify(value);
        } else if (select_options && Array.isArray(select_options)) {
          // Try to find matching label from options
          const matchingOption = select_options.find(opt => {
            if (typeof opt === 'string') return opt === value;
            return opt.value === value;
          });
          if (matchingOption) {
            displayLabel = typeof matchingOption === 'string' ? matchingOption : matchingOption.label;
          }
        }
        return <Badge bg="primary">{displayLabel}</Badge>;

      case 'number':
        return <strong>{value}</strong>;

      case 'textarea':
        return (
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {searchQuery ? highlight(value, searchQuery) : value}
          </div>
        );

      case 'text':
      default:
        return <span>{searchQuery ? highlight(value, searchQuery) : value}</span>;
    }
  };

  return (
    <div className="mb-3">
      <div className="text-muted small mb-1">
        {searchQuery ? highlight(field_label, searchQuery) : field_label}
      </div>
      <div>{formatValue()}</div>
    </div>
  );
};

CustomFieldDisplay.propTypes = {
  fieldDefinition: PropTypes.shape({
    field_label: PropTypes.string.isRequired,
    field_type: PropTypes.oneOf(['text', 'textarea', 'number', 'date', 'select', 'boolean', 'calculated']).isRequired,
    validation_rules: PropTypes.object,
    select_options: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })
      ])
    ),
    decimal_places: PropTypes.number
  }).isRequired,
  value: PropTypes.any,
  searchQuery: PropTypes.string,
  highlightText: PropTypes.func
};

export default CustomFieldDisplay;
