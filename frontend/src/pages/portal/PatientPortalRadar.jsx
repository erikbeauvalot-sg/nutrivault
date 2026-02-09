/**
 * Patient Portal Radar Page
 * Displays wind rose / radar charts for patient custom field categories
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';
import * as portalService from '../../services/portalService';

/**
 * Normalize a value to 0-10 scale for radar display
 */
const normalizeValue = (value, field) => {
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

const RadarCategoryChart = ({ category }) => {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    if (!category?.fields?.length) return [];
    const excludeTypes = ['separator', 'blank', 'heading', 'paragraph', 'file', 'image'];
    return category.fields
      .filter(f => !excludeTypes.includes(f.field_type))
      .map(field => {
        const normalized = normalizeValue(field.value, field);
        return {
          field: field.field_label || field.field_name,
          value: normalized !== null ? normalized : 0,
          rawValue: field.value,
          fullMark: 10,
          hasValue: normalized !== null
        };
      });
  }, [category]);

  const fieldsWithValues = chartData.filter(d => d.hasValue).length;
  const totalFields = chartData.length;

  if (chartData.length === 0) return null;

  if (fieldsWithValues === 0) {
    return (
      <Alert variant="info" className="mb-0">
        {t('portal.radarNoValues', 'Pas encore de donnees pour ce profil.')}
      </Alert>
    );
  }

  const chartColor = category.color || '#3498db';
  const fillOpacity = category.display_layout?.options?.fillOpacity || 0.3;

  const renderTick = ({ payload, x, y, cx, cy }) => {
    const label = payload.value || '';
    const maxChars = 12;
    const words = label.split(' ');
    const lines = [];
    let currentLine = '';
    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxChars) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    if (lines.length > 2) { lines[1] = lines[1] + '...'; lines.length = 2; }

    const angle = Math.atan2(y - cy, x - cx);
    const angleDeg = (angle * 180) / Math.PI;
    const offset = 15;
    const offsetX = Math.cos(angle) * offset;
    const offsetY = Math.sin(angle) * offset;

    let textAnchor = 'middle';
    if (angleDeg > -45 && angleDeg < 45) textAnchor = 'start';
    else if (angleDeg > 135 || angleDeg < -135) textAnchor = 'end';

    return (
      <g transform={`translate(${x + offsetX},${y + offsetY})`}>
        <text textAnchor={textAnchor} fill="#666" fontSize={11} dominantBaseline="middle">
          {lines.map((line, i) => (
            <tspan key={i} x={0} dy={i === 0 ? (lines.length > 1 ? -7 : 0) : 14}>{line}</tspan>
          ))}
        </text>
      </g>
    );
  };

  return (
    <div style={{ width: '100%', minHeight: '380px' }}>
      <ResponsiveContainer width="100%" height={380}>
        <RadarChart cx="50%" cy="50%" outerRadius="55%" data={chartData}>
          <PolarGrid gridType="polygon" />
          <PolarAngleAxis dataKey="field" tick={renderTick} tickLine={false} />
          <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10 }} tickCount={6} axisLine={false} />
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
              if (!payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <strong>{data.field}</strong>
                  <div>
                    {data.hasValue ? (
                      <>
                        <span>{t('portal.value', 'Valeur')}: {data.rawValue}</span>
                        <br />
                        <span style={{ color: '#666', fontSize: '0.9em' }}>({data.value.toFixed(1)}/10)</span>
                      </>
                    ) : (
                      <span style={{ color: '#999' }}>{t('portal.radarNoValue', 'Pas de valeur')}</span>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={() => `${category.name} (${fieldsWithValues}/${totalFields})`}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

const PatientPortalRadar = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await portalService.getRadarData();
        setCategories(data || []);
      } catch (err) {
        setError(t('portal.loadError', 'Erreur lors du chargement'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  return (
    <div>
      <h2 className="mb-3" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }}>
        {'\uD83C\uDF00'} {t('portal.nav.radar', 'Mon bilan')}
      </h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {categories.length === 0 ? (
        <Alert variant="info">{t('portal.radarNone', 'Aucun profil configure')}</Alert>
      ) : (
        categories.map(category => (
          <Card key={category.id} className="mb-3">
            <Card.Header
              className="d-flex align-items-center gap-2 py-2"
              style={{ borderLeft: `4px solid ${category.color || '#3498db'}` }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  backgroundColor: category.color || '#3498db',
                  borderRadius: '50%'
                }}
              />
              <strong>{category.name}</strong>
            </Card.Header>
            <Card.Body>
              {category.description && (
                <p className="text-muted small mb-3">{category.description}</p>
              )}
              <RadarCategoryChart category={category} />
            </Card.Body>
          </Card>
        ))
      )}
    </div>
  );
};

export default PatientPortalRadar;
