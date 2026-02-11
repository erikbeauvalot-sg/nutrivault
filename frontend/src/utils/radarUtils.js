/**
 * Normalize a value to 0-10 scale for radar display
 */
export const normalizeValue = (value, field) => {
  if (value === null || value === undefined || value === '') return null;

  const fieldType = field.field_type;

  // Numeric types
  if (fieldType === 'number' || fieldType === 'decimal' || fieldType === 'integer' || fieldType === 'slider') {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;
    const rules = field.validation_rules || {};
    const min = rules.min !== undefined ? rules.min : 0;
    const max = rules.max !== undefined ? rules.max : 10;
    if (max === min) return 5;
    const normalized = ((numValue - min) / (max - min)) * 10;
    return Math.max(0, Math.min(10, normalized));
  }

  // Rating type
  if (fieldType === 'rating') {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;
    const rules = field.validation_rules || {};
    const maxRating = rules.max || 5;
    return (numValue / maxRating) * 10;
  }

  // Select/radio
  if (fieldType === 'select' || fieldType === 'radio') {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) return Math.max(0, Math.min(10, numValue));
    const options = field.select_options || [];
    const optionsList = Array.isArray(options) ? options : [];
    const index = optionsList.findIndex(opt =>
      (typeof opt === 'string' && opt === value) ||
      (typeof opt === 'object' && (opt.value === value || opt.label === value))
    );
    if (index >= 0 && optionsList.length > 1) return (index / (optionsList.length - 1)) * 10;
  }

  // Boolean
  if (fieldType === 'boolean' || fieldType === 'checkbox') {
    return value === true || value === 'true' || value === 1 || value === '1' ? 10 : 0;
  }

  // Embedded fields: use measure_range for normalization
  if (fieldType === 'embedded' && field.measure_range) {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;
    const min = field.measure_range.min_value ?? 0;
    const max = field.measure_range.max_value ?? 10;
    if (max === min) return 5;
    const normalized = ((numValue - min) / (max - min)) * 10;
    return Math.max(0, Math.min(10, normalized));
  }

  // Fallback: try parsing as number
  const numValue = parseFloat(value);
  if (!isNaN(numValue)) return Math.max(0, Math.min(10, numValue));

  return null;
};
