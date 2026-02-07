/**
 * CustomFieldRadarChart Component
 * Displays custom field values as a radar/spider chart
 * Used when category display_layout.type === 'radar'
 */

import { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';
import { Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getMeasureDefinitions, getPatientMeasures } from '../services/measureService';

/**
 * Normalize a value to a 0-10 scale for radar chart display
 * @param {any} value - The field value
 * @param {object} field - The field definition
 * @param {object} measureDef - Optional measure definition for embedded fields
 * @returns {number|null} Normalized value or null if not applicable
 */
const normalizeValue = (value, field, measureDef = null) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const fieldType = field.field_type;

  // Handle embedded fields using measure definition min/max
  if (fieldType === 'embedded' && measureDef) {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;

    const min = measureDef.min_value !== null && measureDef.min_value !== undefined ? measureDef.min_value : 0;
    const max = measureDef.max_value !== null && measureDef.max_value !== undefined ? measureDef.max_value : 10;

    if (max === min) return 5;
    const normalized = ((numValue - min) / (max - min)) * 10;
    return Math.max(0, Math.min(10, normalized));
  }

  // Handle numeric types
  if (fieldType === 'number' || fieldType === 'decimal' || fieldType === 'integer') {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;

    // Check validation rules for min/max
    const rules = field.validation_rules || {};
    const min = rules.min !== undefined ? rules.min : 0;
    const max = rules.max !== undefined ? rules.max : 10;

    // Normalize to 0-10 scale
    if (max === min) return 5; // Avoid division by zero
    const normalized = ((numValue - min) / (max - min)) * 10;
    return Math.max(0, Math.min(10, normalized)); // Clamp to 0-10
  }

  // Handle slider type (usually 0-10 or 0-100)
  if (fieldType === 'slider') {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;

    const rules = field.validation_rules || {};
    const min = rules.min !== undefined ? rules.min : 0;
    const max = rules.max !== undefined ? rules.max : 10;

    if (max === min) return 5;
    const normalized = ((numValue - min) / (max - min)) * 10;
    return Math.max(0, Math.min(10, normalized));
  }

  // Handle rating type (usually 1-5 or 1-10)
  if (fieldType === 'rating') {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;

    const rules = field.validation_rules || {};
    const maxRating = rules.max || 5;
    return (numValue / maxRating) * 10;
  }

  // Handle select/radio with numeric-like options
  if (fieldType === 'select' || fieldType === 'radio') {
    // Try to parse as number first
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      // Assume 0-10 scale if it's a number
      return Math.max(0, Math.min(10, numValue));
    }

    // If options have numeric values, try to find the index
    const options = field.select_options || [];
    const index = options.findIndex(opt =>
      (typeof opt === 'string' && opt === value) ||
      (typeof opt === 'object' && (opt.value === value || opt.label === value))
    );
    if (index >= 0 && options.length > 1) {
      return (index / (options.length - 1)) * 10;
    }
  }

  // Handle boolean/checkbox
  if (fieldType === 'boolean' || fieldType === 'checkbox') {
    return value === true || value === 'true' || value === 1 || value === '1' ? 10 : 0;
  }

  // For other types, try to parse as number
  const numValue = parseFloat(value);
  if (!isNaN(numValue)) {
    return Math.max(0, Math.min(10, numValue));
  }

  return null;
};

/**
 * CustomFieldRadarChart - Renders a radar chart for category fields
 * @param {object} props
 * @param {object} props.category - Category object with fields
 * @param {object} props.fieldValues - Map of field definition_id to value
 * @param {object} props.options - Radar chart options from display_layout
 * @param {string} props.patientId - Patient ID for fetching embedded measure values
 */
const CustomFieldRadarChart = ({ category, fieldValues, options = {}, patientId = null }) => {
  const { t } = useTranslation();
  const [embeddedValues, setEmbeddedValues] = useState({});
  const [embeddedMeasureDefs, setEmbeddedMeasureDefs] = useState({});
  const [loadingEmbedded, setLoadingEmbedded] = useState(false);

  // Detect embedded fields and fetch their latest measure values
  useEffect(() => {
    if (!category?.fields || !patientId) return;

    const embeddedFields = category.fields.filter(f => f.field_type === 'embedded');
    if (embeddedFields.length === 0) return;

    const fetchEmbeddedValues = async () => {
      setLoadingEmbedded(true);
      try {
        const definitions = await getMeasureDefinitions({ is_active: true });
        const values = {};
        const defs = {};

        await Promise.all(embeddedFields.map(async (field) => {
          const measureName = field.select_options?.measure_name;
          if (!measureName) return;

          const definition = definitions.find(
            d => d.name?.toLowerCase() === measureName.toLowerCase() ||
                 d.display_name?.toLowerCase() === measureName.toLowerCase()
          );
          if (!definition) return;

          defs[field.definition_id] = definition;

          const measures = await getPatientMeasures(patientId, {
            measure_definition_id: definition.id,
            limit: 1
          });

          if (measures && measures.length > 0) {
            const m = measures[0];
            // Extract value based on measure type
            switch (definition.measure_type) {
              case 'numeric':
              case 'calculated':
                values[field.definition_id] = m.numeric_value;
                break;
              case 'text':
                values[field.definition_id] = m.text_value;
                break;
              case 'boolean':
                values[field.definition_id] = m.boolean_value;
                break;
              default:
                values[field.definition_id] = m.numeric_value;
            }
          }
        }));

        setEmbeddedValues(values);
        setEmbeddedMeasureDefs(defs);
      } catch (err) {
        console.error('Error fetching embedded measure values for radar:', err);
      } finally {
        setLoadingEmbedded(false);
      }
    };

    fetchEmbeddedValues();
  }, [category, patientId]);

  // Merge fieldValues with embeddedValues
  const mergedValues = useMemo(() => {
    return { ...fieldValues, ...embeddedValues };
  }, [fieldValues, embeddedValues]);

  // Build chart data from fields
  const chartData = useMemo(() => {
    if (!category?.fields || category.fields.length === 0) {
      return [];
    }

    return category.fields
      .filter(field => {
        // Exclude non-data fields
        const excludeTypes = ['separator', 'blank', 'heading', 'paragraph', 'file', 'image'];
        return !excludeTypes.includes(field.field_type);
      })
      .map(field => {
        const rawValue = mergedValues[field.definition_id];
        const measureDef = embeddedMeasureDefs[field.definition_id] || null;
        const normalizedValue = normalizeValue(rawValue, field, measureDef);

        return {
          field: field.field_label || field.field_name,
          value: normalizedValue !== null ? normalizedValue : 0,
          rawValue: rawValue,
          fullMark: 10,
          hasValue: normalizedValue !== null
        };
      });
  }, [category, mergedValues, embeddedMeasureDefs]);

  // Count fields with values
  const fieldsWithValues = chartData.filter(d => d.hasValue).length;
  const totalFields = chartData.length;

  // Show loading while fetching embedded values
  if (loadingEmbedded) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" className="me-2" />
        {t('common.loading', 'Loading...')}
      </div>
    );
  }

  // Don't render if no numeric-compatible fields
  if (chartData.length === 0) {
    return (
      <Alert variant="info">
        {t('customFields.noRadarCompatibleFields', 'No fields compatible with radar display in this category.')}
      </Alert>
    );
  }

  // Show message if no values entered yet
  if (fieldsWithValues === 0) {
    return (
      <Alert variant="info">
        {t('customFields.noValuesForRadar', 'No values entered yet. Edit the visit to add data.')}
      </Alert>
    );
  }

  const chartColor = category.color || '#3498db';
  const fillOpacity = options.fillOpacity || 0.3;
  const showLabels = options.showLabels !== false;

  // Custom tick component for multi-line labels positioned outside the chart
  const renderPolarAngleAxisTick = ({ payload, x, y, cx, cy, ...rest }) => {
    const label = payload.value || '';
    const maxCharsPerLine = 12;

    // Split label into lines
    const words = label.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);

    // Limit to 2 lines max
    if (lines.length > 2) {
      lines[1] = lines[1] + '...';
      lines.length = 2;
    }

    // Calculate angle and push labels further out
    const angle = Math.atan2(y - cy, x - cx);
    const angleDeg = (angle * 180) / Math.PI;

    // Push labels further outside the chart
    const offset = 15;
    const offsetX = Math.cos(angle) * offset;
    const offsetY = Math.sin(angle) * offset;

    // Calculate text anchor based on position
    let textAnchor = 'middle';

    // Vertical alignment
    if (angleDeg > -45 && angleDeg < 45) {
      // Right side
      textAnchor = 'start';
    } else if (angleDeg > 135 || angleDeg < -135) {
      // Left side
      textAnchor = 'end';
    }

    return (
      <g transform={`translate(${x + offsetX},${y + offsetY})`}>
        <text
          textAnchor={textAnchor}
          fill="#666"
          fontSize={11}
          dominantBaseline="middle"
        >
          {lines.map((line, index) => (
            <tspan
              key={index}
              x={0}
              dy={index === 0 ? (lines.length > 1 ? -7 : 0) : 14}
            >
              {line}
            </tspan>
          ))}
        </text>
      </g>
    );
  };

  return (
    <div style={{ width: '100%', minHeight: '400px' }}>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart cx="50%" cy="50%" outerRadius="55%" data={chartData}>
          <PolarGrid gridType="polygon" />
          <PolarAngleAxis
            dataKey="field"
            tick={renderPolarAngleAxisTick}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fontSize: 10 }}
            tickCount={6}
            axisLine={false}
          />
          <Radar
            name={category.name}
            dataKey="value"
            stroke={chartColor}
            fill={chartColor}
            fillOpacity={fillOpacity}
            strokeWidth={2}
            dot={{ fill: chartColor, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: chartColor }}
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const data = payload[0].payload;
              return (
                <div style={{
                  backgroundColor: 'white',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <strong>{data.field}</strong>
                  <div>
                    {data.hasValue ? (
                      <>
                        <span>{t('customFields.value', 'Value')}: {data.rawValue}</span>
                        <br />
                        <span style={{ color: '#666', fontSize: '0.9em' }}>
                          ({t('customFields.normalized', 'Normalized')}: {data.value.toFixed(1)}/10)
                        </span>
                      </>
                    ) : (
                      <span style={{ color: '#999' }}>{t('customFields.noValue', 'No value')}</span>
                    )}
                  </div>
                </div>
              );
            }}
          />
          {showLabels && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={() => `${category.name} (${fieldsWithValues}/${totalFields} ${t('customFields.fieldsCompleted', 'fields')})`}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomFieldRadarChart;
