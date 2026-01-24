/**
 * CustomFieldInput Component
 * Dynamic input component that renders the appropriate field type
 * based on field definition
 */

import { Form } from 'react-bootstrap';
import PropTypes from 'prop-types';

const CustomFieldInput = ({ fieldDefinition, value, onChange, disabled = false, error = null }) => {
  const {
    field_name,
    field_label,
    field_type,
    is_required,
    validation_rules,
    select_options,
    help_text
  } = fieldDefinition;

  const handleChange = (e) => {
    let newValue;

    switch (field_type) {
      case 'boolean':
        newValue = e.target.checked;
        break;
      case 'number':
        newValue = e.target.value ? parseFloat(e.target.value) : null;
        break;
      default:
        newValue = e.target.value;
    }

    onChange(fieldDefinition.definition_id, newValue);
  };

  const renderInput = () => {
    switch (field_type) {
      case 'text':
        return (
          <Form.Control
            type="text"
            id={field_name}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            isInvalid={!!error}
            maxLength={validation_rules?.maxLength}
            placeholder={help_text || `Enter ${field_label.toLowerCase()}`}
          />
        );

      case 'textarea':
        return (
          <Form.Control
            as="textarea"
            rows={validation_rules?.rows || 3}
            id={field_name}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            isInvalid={!!error}
            maxLength={validation_rules?.maxLength}
            placeholder={help_text || `Enter ${field_label.toLowerCase()}`}
          />
        );

      case 'number':
        return (
          <Form.Control
            type="number"
            step="any"
            id={field_name}
            value={value !== null && value !== undefined ? value : ''}
            onChange={handleChange}
            disabled={disabled}
            isInvalid={!!error}
            min={validation_rules?.min}
            max={validation_rules?.max}
            placeholder={help_text || `Enter ${field_label.toLowerCase()}`}
          />
        );

      case 'date':
        // Get date format from validation_rules, default to DD/MM/YYYY
        const dateFormat = validation_rules?.dateFormat || 'DD/MM/YYYY';
        const placeholder = dateFormat.toLowerCase();

        // Convert stored ISO format (YYYY-MM-DD) to display format
        const formatDateForDisplay = (isoDate) => {
          if (!isoDate) return '';
          const parts = isoDate.split('-');
          if (parts.length !== 3) return isoDate;

          const [year, month, day] = parts;
          switch (dateFormat) {
            case 'MM/DD/YYYY':
              return `${month}/${day}/${year}`;
            case 'YYYY-MM-DD':
              return isoDate;
            case 'DD/MM/YYYY':
            default:
              return `${day}/${month}/${year}`;
          }
        };

        // Convert display format to ISO format (YYYY-MM-DD) for storage
        const parseDisplayDate = (displayDate) => {
          if (!displayDate) return '';
          const cleaned = displayDate.replace(/[^\d]/g, ''); // Remove non-digits

          if (cleaned.length !== 8) return displayDate; // Invalid format

          let year, month, day;
          switch (dateFormat) {
            case 'MM/DD/YYYY':
              month = cleaned.substring(0, 2);
              day = cleaned.substring(2, 4);
              year = cleaned.substring(4, 8);
              break;
            case 'YYYY-MM-DD':
              year = cleaned.substring(0, 4);
              month = cleaned.substring(4, 6);
              day = cleaned.substring(6, 8);
              break;
            case 'DD/MM/YYYY':
            default:
              day = cleaned.substring(0, 2);
              month = cleaned.substring(2, 4);
              year = cleaned.substring(4, 8);
          }

          return `${year}-${month}-${day}`;
        };

        const handleDateChange = (e) => {
          const inputValue = e.target.value;
          const isoDate = parseDisplayDate(inputValue);
          onChange(fieldDefinition.definition_id, isoDate);
        };

        return (
          <Form.Control
            type="text"
            id={field_name}
            value={formatDateForDisplay(value) || ''}
            onChange={handleDateChange}
            disabled={disabled}
            isInvalid={!!error}
            placeholder={placeholder}
            maxLength={10}
          />
        );

      case 'select':
        return (
          <Form.Select
            id={field_name}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            isInvalid={!!error}
          >
            <option value="">-- Select {field_label} --</option>
            {select_options && select_options.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </Form.Select>
        );

      case 'boolean':
        return (
          <Form.Check
            type="checkbox"
            id={field_name}
            label={field_label}
            checked={value === true}
            onChange={handleChange}
            disabled={disabled}
            isInvalid={!!error}
          />
        );

      case 'calculated':
        // Calculated fields are always read-only and display computed values
        const displayValue = value !== null && value !== undefined ? value : '—';
        const decimalPlaces = fieldDefinition.decimal_places || 2;
        const formattedValue = typeof value === 'number' ? value.toFixed(decimalPlaces) : displayValue;

        return (
          <div className="position-relative">
            <Form.Control
              type="text"
              id={field_name}
              value={formattedValue}
              readOnly
              disabled={true}
              style={{
                backgroundColor: '#f8f9fa',
                cursor: 'not-allowed',
                fontWeight: '500'
              }}
              title={fieldDefinition.formula ? `Formula: ${fieldDefinition.formula}` : 'Calculated field'}
            />
            <span
              className="position-absolute"
              style={{
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px',
                pointerEvents: 'none'
              }}
            >
              🧮
            </span>
          </div>
        );

      default:
        return (
          <Form.Control
            type="text"
            id={field_name}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            isInvalid={!!error}
          />
        );
    }
  };

  // For boolean type, the label is part of the checkbox, so we don't show it separately
  if (field_type === 'boolean') {
    return (
      <Form.Group className="mb-3">
        {renderInput()}
        {help_text && <Form.Text className="text-muted d-block mt-1">{help_text}</Form.Text>}
        {error && <Form.Control.Feedback type="invalid" className="d-block">{error}</Form.Control.Feedback>}
      </Form.Group>
    );
  }

  // Build help text with date format if applicable
  let displayHelpText = help_text;
  if (field_type === 'date') {
    const dateFormat = validation_rules?.dateFormat || 'DD/MM/YYYY';
    displayHelpText = help_text
      ? `${help_text} (Format: ${dateFormat})`
      : `Format: ${dateFormat}`;
  }

  return (
    <Form.Group className="mb-3">
      <Form.Label htmlFor={field_name}>
        {field_label}
        {is_required && <span className="text-danger ms-1">*</span>}
      </Form.Label>
      {renderInput()}
      {displayHelpText && <Form.Text className="text-muted">{displayHelpText}</Form.Text>}
      {error && <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>}
    </Form.Group>
  );
};

CustomFieldInput.propTypes = {
  fieldDefinition: PropTypes.shape({
    definition_id: PropTypes.string.isRequired,
    field_name: PropTypes.string.isRequired,
    field_label: PropTypes.string.isRequired,
    field_type: PropTypes.oneOf(['text', 'textarea', 'number', 'date', 'select', 'boolean']).isRequired,
    is_required: PropTypes.bool,
    validation_rules: PropTypes.object,
    select_options: PropTypes.arrayOf(PropTypes.string),
    help_text: PropTypes.string
  }).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  error: PropTypes.string
};

export default CustomFieldInput;
