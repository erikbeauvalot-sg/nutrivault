/**
 * Patient Portal Radar Page
 * Displays wind rose / radar charts for patient custom field categories
 * with inline editing for editable fields and change history
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, Spinner, Alert, Badge, Modal, Form, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';
import * as portalService from '../../services/portalService';
import { normalizeValue } from '../../utils/radarUtils';

// ─── Edit Modal ──────────────────────────────────────
const EditFieldModal = ({ show, onHide, field, onSave }) => {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show && field) {
      setValue(field.value ?? '');
    }
  }, [show, field]);

  if (!field) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalValue = value;
      if (['number', 'decimal', 'integer', 'slider', 'rating', 'embedded'].includes(field.field_type)) {
        finalValue = parseFloat(value);
        if (isNaN(finalValue)) {
          setSaving(false);
          return;
        }
      }
      if (field.field_type === 'boolean' || field.field_type === 'checkbox') {
        finalValue = value === 'true' || value === true;
      }
      await onSave(field.definition_id, finalValue, field.measure_definition_id);
      onHide();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const renderInput = () => {
    const rules = field.validation_rules || {};

    if (field.field_type === 'boolean' || field.field_type === 'checkbox') {
      return (
        <Form.Check
          type="switch"
          id="edit-boolean"
          label={value === true || value === 'true' ? 'Oui / Yes' : 'Non / No'}
          checked={value === true || value === 'true'}
          onChange={(e) => setValue(e.target.checked ? 'true' : 'false')}
          style={{ fontSize: '1.1rem' }}
        />
      );
    }

    if (field.field_type === 'slider' || field.field_type === 'rating' || field.field_type === 'embedded') {
      const min = rules.min ?? 0;
      const max = rules.max ?? 10;
      const step = field.field_type === 'rating' ? 1 : (rules.step ?? 0.5);
      return (
        <div>
          <div className="d-flex justify-content-between mb-1">
            <small className="text-muted">{min}</small>
            <strong style={{ fontSize: '1.5rem', fontFamily: "'JetBrains Mono', monospace" }}>
              {value || min}
            </strong>
            <small className="text-muted">{max}</small>
          </div>
          <Form.Range
            min={min}
            max={max}
            step={step}
            value={value || min}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      );
    }

    if (field.field_type === 'select' || field.field_type === 'radio') {
      const options = Array.isArray(field.select_options)
        ? field.select_options
        : (field.select_options?.options || []);
      return (
        <Form.Select
          value={value || ''}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="">--</option>
          {options.map((opt, i) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const label = typeof opt === 'object' ? (opt.label || opt.value) : opt;
            return <option key={i} value={val}>{label}</option>;
          })}
        </Form.Select>
      );
    }

    if (['number', 'decimal', 'integer'].includes(field.field_type)) {
      return (
        <Form.Control
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          min={rules.min}
          max={rules.max}
          step={field.field_type === 'integer' ? 1 : (rules.step ?? 0.1)}
          autoFocus
          style={{ fontSize: '1.2rem', fontFamily: "'JetBrains Mono', monospace" }}
        />
      );
    }

    // text/textarea fallback
    return (
      <Form.Control
        as={field.field_type === 'textarea' ? 'textarea' : 'input'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        rows={field.field_type === 'textarea' ? 3 : undefined}
      />
    );
  };

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton style={{ border: 'none', paddingBottom: 0 }}>
        <Modal.Title style={{ fontSize: '1rem', fontWeight: 700 }}>
          {field.field_label}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {renderInput()}
      </Modal.Body>
      <Modal.Footer style={{ border: 'none', paddingTop: 0 }}>
        <Button variant="outline-secondary" size="sm" onClick={onHide} disabled={saving}>
          {t('portal.radarCancel', 'Annuler')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" animation="border" /> : t('portal.radarSave', 'Enregistrer')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// ─── History Modal ───────────────────────────────────
const HistoryModal = ({ show, onHide, definitionId, fieldLabel }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (show && definitionId) {
      setLoading(true);
      portalService.getRadarFieldHistory(definitionId)
        .then(data => {
          setHistory(data?.history || []);
        })
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    }
  }, [show, definitionId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatValue = (val) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
    return String(val);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton style={{ border: 'none', paddingBottom: 0 }}>
        <Modal.Title style={{ fontSize: '1rem', fontWeight: 700 }}>
          {fieldLabel} — {t('portal.radarFieldHistory', 'Historique')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {loading ? (
          <div className="text-center py-4"><Spinner size="sm" animation="border" /></div>
        ) : history.length === 0 ? (
          <p className="text-muted text-center mb-0">{t('portal.radarNoHistory', 'Aucune modification')}</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {history.map((entry, i) => (
              <div
                key={entry.id || i}
                className="d-flex align-items-start gap-2 p-2 rounded"
                style={{ backgroundColor: i % 2 === 0 ? '#f8f9fa' : 'transparent', fontSize: '0.85rem' }}
              >
                <div
                  style={{
                    width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                    backgroundColor: entry.action.includes('AUTO') ? '#f0ad4e' : '#5cb85c'
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="d-flex justify-content-between">
                    <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
                      {formatDate(entry.created_at)}
                    </span>
                    {entry.action.includes('AUTO') && (
                      <Badge bg="warning" text="dark" style={{ fontSize: '0.65rem' }}>auto</Badge>
                    )}
                  </div>
                  <div className="mt-1">
                    {entry.before_value !== null && (
                      <span className="text-muted" style={{ textDecoration: 'line-through', marginRight: 8 }}>
                        {formatValue(entry.before_value)}
                      </span>
                    )}
                    <span style={{ fontWeight: 600 }}>
                      {formatValue(entry.after_value)}
                    </span>
                  </div>
                  {entry.username && (
                    <small className="text-muted">{entry.username}</small>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

// Slider field types that get inline range input
const SLIDER_TYPES = new Set(['embedded', 'slider', 'rating', 'number', 'decimal', 'integer']);

// ─── Field List Item (inline slider) ─────────────────
const FieldListItem = ({ field, onSave, onEdit, onHistory, savingId }) => {
  const { t } = useTranslation();
  const rules = field.validation_rules || {};
  const min = rules.min ?? 0;
  const max = rules.max ?? 10;
  const step = field.field_type === 'integer' ? 1 : (rules.step ?? 0.5);
  const isSliderType = field.is_editable && SLIDER_TYPES.has(field.field_type);
  const isSaving = savingId === field.definition_id;

  const [localVal, setLocalVal] = useState(() => {
    const v = parseFloat(field.value);
    return isNaN(v) ? min : v;
  });
  const [dirty, setDirty] = useState(false);

  // Sync when server value changes (after refresh)
  useEffect(() => {
    const v = parseFloat(field.value);
    const newVal = isNaN(v) ? min : v;
    setLocalVal(newVal);
    setDirty(false);
  }, [field.value, min]);

  const hasValue = field.value !== null && field.value !== undefined && field.value !== '';

  const handleSliderChange = (e) => {
    const v = parseFloat(e.target.value);
    setLocalVal(v);
    setDirty(v !== parseFloat(field.value));
  };

  const handleConfirm = () => {
    onSave(field.definition_id, localVal, field.measure_definition_id);
    setDirty(false);
  };

  // Color based on category or default
  const accentColor = field._categoryColor || '#3498db';

  if (isSliderType) {
    return (
      <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        {/* Label row */}
        <div className="d-flex align-items-center justify-content-between mb-1">
          <span style={{ fontSize: '0.82rem', fontWeight: 500, flex: 1, minWidth: 0 }}>
            {field.field_label}
          </span>
          <div className="d-flex align-items-center gap-1">
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '1.1rem',
                fontWeight: 800,
                color: dirty ? accentColor : (hasValue ? '#2c3e50' : '#adb5bd'),
                minWidth: 28,
                textAlign: 'right',
                transition: 'color 0.15s'
              }}
            >
              {localVal}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#adb5bd' }}>/{max}</span>

            {dirty && (
              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className="btn btn-sm p-0 ms-1"
                style={{
                  width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', borderRadius: 6,
                  color: '#fff', backgroundColor: accentColor,
                  opacity: isSaving ? 0.6 : 1
                }}
                title={t('portal.radarSave', 'Enregistrer')}
              >
                {isSaving ? (
                  <Spinner size="sm" animation="border" style={{ width: 12, height: 12 }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                  </svg>
                )}
              </button>
            )}

            {hasValue && !dirty && (
              <button
                onClick={() => onHistory(field)}
                className="btn btn-sm p-0"
                style={{
                  width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #dee2e6', borderRadius: 6,
                  color: '#adb5bd', backgroundColor: 'transparent'
                }}
                title={t('portal.radarHistory', 'Historique')}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 3.5a.5.5 0 0 0-1 0V8a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 7.71V3.5z"/>
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Slider */}
        <div className="d-flex align-items-center gap-2">
          <small style={{ fontSize: '0.65rem', color: '#adb5bd', width: 14, textAlign: 'center' }}>{min}</small>
          <Form.Range
            min={min}
            max={max}
            step={step}
            value={localVal}
            onChange={handleSliderChange}
            style={{ flex: 1 }}
          />
          <small style={{ fontSize: '0.65rem', color: '#adb5bd', width: 14, textAlign: 'center' }}>{max}</small>
        </div>
      </div>
    );
  }

  // Non-slider fields (select, boolean, text, calculated, read-only)
  const formatDisplayValue = (val) => {
    if (val === null || val === undefined || val === '') return t('portal.radarNotSet', 'Non défini');
    if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
    if (typeof val === 'number') return Number.isInteger(val) ? String(val) : val.toFixed(1);
    return String(val);
  };

  return (
    <div
      className="d-flex align-items-center px-3 py-2"
      style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', gap: '0.5rem', minHeight: 44 }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.82rem' }}>
          <span style={{ fontWeight: 500 }}>{field.field_label}</span>
          {field.is_calculated && (
            <Badge bg="secondary" style={{ fontSize: '0.6rem', fontWeight: 500 }}>{t('portal.radarCalculated', 'Calculé')}</Badge>
          )}
        </div>
      </div>

      <div className="d-flex align-items-center gap-1" style={{ flexShrink: 0 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.9rem',
            fontWeight: hasValue ? 700 : 400,
            color: hasValue ? '#2c3e50' : '#adb5bd',
            minWidth: 40,
            textAlign: 'right'
          }}
        >
          {formatDisplayValue(field.value)}
        </span>

        {field.is_editable && (
          <button
            onClick={() => onEdit(field)}
            className="btn btn-sm p-0 ms-1"
            style={{
              width: 26, height: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #dee2e6', borderRadius: 6,
              color: '#6c757d', backgroundColor: 'transparent'
            }}
            title={t('portal.radarEdit', 'Modifier')}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.146.854a.5.5 0 0 1 .708 0l2.292 2.292a.5.5 0 0 1 0 .708l-9.793 9.793a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l9.793-9.793zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5z"/>
            </svg>
          </button>
        )}

        {hasValue && (
          <button
            onClick={() => onHistory(field)}
            className="btn btn-sm p-0"
            style={{
              width: 26, height: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #dee2e6', borderRadius: 6,
              color: '#adb5bd', backgroundColor: 'transparent'
            }}
            title={t('portal.radarHistory', 'Historique')}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3.5a.5.5 0 0 0-1 0V8a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 7.71V3.5z"/>
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Radar Chart Component ───────────────────────────
const RadarCategoryChart = ({ category }) => {
  const { t } = useTranslation();
  const chartRef = useRef(null);

  const setOverflow = useCallback((node) => {
    chartRef.current = node;
    if (node) {
      const svg = node.querySelector('svg');
      if (svg) svg.style.overflow = 'visible';
    }
  }, []);

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
      <Alert variant="info" className="mb-0 mx-3">
        {t('portal.radarNoValues', 'Pas encore de donnees pour ce profil.')}
      </Alert>
    );
  }

  const chartColor = category.color || '#3498db';
  const fillOpacity = category.display_layout?.options?.fillOpacity || 0.3;

  const renderTick = ({ payload, x, y, cx, cy }) => {
    const raw = payload.value || '';
    const label = raw.split(/[,(.]/)[0].trim();
    const maxChars = 18;
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

    const angle = Math.atan2(y - cy, x - cx);
    const angleDeg = (angle * 180) / Math.PI;
    const offset = 8;
    const offsetX = Math.cos(angle) * offset;
    const offsetY = Math.sin(angle) * offset;

    let textAnchor = 'middle';
    if (angleDeg > -60 && angleDeg < 60) textAnchor = 'start';
    else if (angleDeg > 120 || angleDeg < -120) textAnchor = 'end';

    const lineHeight = 11;
    const startDy = -(lines.length - 1) * lineHeight / 2;

    return (
      <g transform={`translate(${x + offsetX},${y + offsetY})`}>
        <text textAnchor={textAnchor} fill="#999" fontSize={9} dominantBaseline="middle">
          {lines.map((line, i) => (
            <tspan key={i} x={0} dy={i === 0 ? startDy : lineHeight}>{line}</tspan>
          ))}
        </text>
      </g>
    );
  };

  return (
    <div ref={setOverflow} style={{ width: '100%', minHeight: '520px', overflow: 'visible' }}>
      <ResponsiveContainer width="100%" height={520}>
        <RadarChart cx="50%" cy="50%" outerRadius="42%" data={chartData}>
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

// ─── Main Page Component ─────────────────────────────
const PatientPortalRadar = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingId, setSavingId] = useState(null);

  // Edit modal state (for non-slider fields: select, boolean, text)
  const [editField, setEditField] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  // History modal state
  const [historyField, setHistoryField] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await portalService.getRadarData();
      setCategories(data || []);
    } catch {
      setError(t('portal.loadError', 'Erreur lors du chargement'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEdit = (field) => {
    setEditField(field);
    setShowEdit(true);
  };

  const handleSave = async (definitionId, value, measureDefinitionId) => {
    setSavingId(definitionId);
    try {
      const payload = { definition_id: definitionId, value };
      if (measureDefinitionId) payload.measure_definition_id = measureDefinitionId;
      await portalService.updateRadarValues([payload]);
      setSuccess(t('portal.radarSaved', 'Valeur enregistrée'));
      setTimeout(() => setSuccess(''), 2000);
      // Refresh radar data
      const data = await portalService.getRadarData();
      setCategories(data || []);
    } catch (err) {
      setError(err?.response?.data?.error || t('portal.radarSaveError', 'Erreur'));
      setTimeout(() => setError(''), 4000);
      throw err;
    } finally {
      setSavingId(null);
    }
  };

  const handleHistory = (field) => {
    setHistoryField(field);
    setShowHistory(true);
  };

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  return (
    <div>
      <h2 className="mb-3" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }}>
        {'\uD83C\uDF00'} {t('portal.nav.radar', 'Mon bilan')}
      </h2>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {categories.length === 0 ? (
        <Alert variant="info">{t('portal.radarNone', 'Aucun profil configure')}</Alert>
      ) : (
        categories.map(category => {
          const excludeTypes = ['separator', 'blank', 'heading', 'paragraph', 'file', 'image'];
          const displayFields = (category.fields || []).filter(f => !excludeTypes.includes(f.field_type));

          return (
            <Card key={category.id} className="mb-3" style={{ marginLeft: '-0.5rem', marginRight: '-0.5rem', borderRadius: 0 }}>
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
              <Card.Body className="px-0 pb-0">
                {category.description && (
                  <p className="text-muted small mb-3 px-3">{category.description}</p>
                )}
                <RadarCategoryChart category={category} />

                {/* Field list under the radar */}
                {displayFields.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: '0.5rem' }}>
                    {displayFields.map(field => (
                      <FieldListItem
                        key={field.definition_id}
                        field={{ ...field, _categoryColor: category.color || '#3498db' }}
                        onSave={handleSave}
                        onEdit={handleEdit}
                        onHistory={handleHistory}
                        savingId={savingId}
                      />
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          );
        })
      )}

      <EditFieldModal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        field={editField}
        onSave={handleSave}
      />

      <HistoryModal
        show={showHistory}
        onHide={() => setShowHistory(false)}
        definitionId={historyField?.definition_id}
        fieldLabel={historyField?.field_label}
      />
    </div>
  );
};

export default PatientPortalRadar;
