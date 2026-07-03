import { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaLayerGroup, FaRuler, FaInfoCircle, FaUser, FaCalendar, FaRobot } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import consultationNoteService from '../services/consultationNoteService';

const ITEM_COLORS = {
  category: '#3498db',
  measure: '#2ecc71',
  instruction: '#f39c12'
};

const ITEM_ICONS = {
  category: FaLayerGroup,
  measure: FaRuler,
  instruction: FaInfoCircle
};

function isEmptyValue(value) {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

function formatFieldValue(value) {
  if (isEmptyValue(value)) return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

const PreviousConsultationView = ({ noteId }) => {
  const { t } = useTranslation();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!noteId) return;
    setLoading(true);
    setError(null);
    consultationNoteService.getNoteById(noteId)
      .then(res => setNote(res.data))
      .catch(err => setError(err.response?.data?.error || t('consultationNotes.loadError', 'Failed to load note')))
      .finally(() => setLoading(false));
  }, [noteId]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" size="sm" />
        <span className="ms-2 text-muted">{t('common.loading', 'Loading...')}</span>
      </div>
    );
  }

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!note) return null;

  const fieldValueMap = {};
  const instructionNoteMap = {};
  const measureEntryMap = {};

  for (const entry of note.entries || []) {
    if (
      (entry.entry_type === 'custom_field_value' ||
        entry.entry_type === 'visit_custom_field' ||
        entry.entry_type === 'patient_custom_field') &&
      entry.field_definition_id !== undefined
    ) {
      fieldValueMap[entry.field_definition_id] = entry.value;
    }
    if (entry.entry_type === 'instruction_note' && entry.template_item_id) {
      instructionNoteMap[entry.template_item_id] = entry.note_text || '';
    }
    if (entry.entry_type === 'patient_measure' && entry.template_item_id) {
      measureEntryMap[entry.template_item_id] = entry.reference_id;
    }
  }

  // Whether an item has anything worth displaying — used to hide empty cards
  const itemHasContent = (item) => {
    if (item.item_type === 'category') {
      return (item.category?.field_definitions || []).some(
        fd => !isEmptyValue(fieldValueMap[fd.definition_id || fd.id])
      );
    }
    if (item.item_type === 'measure') {
      return Boolean(measureEntryMap[item.id]);
    }
    if (item.item_type === 'instruction') {
      return Boolean(item.instruction_content) || Boolean(instructionNoteMap[item.id]);
    }
    return false;
  };

  const templateItems = (note.template?.items || []).filter(itemHasContent);

  const renderReadOnlyCategory = (item) => {
    if (!item.category) return <p className="text-muted small mb-0">{t('consultationNotes.categoryNotFound', 'Category not found')}</p>;
    // Only show fields that actually have a value — hide empty ones (value + label)
    const fields = (item.category.field_definitions || []).filter(
      fd => !isEmptyValue(fieldValueMap[fd.definition_id || fd.id])
    );
    if (fields.length === 0) return null;

    const displayLayout = (item.layout_override
      ? (typeof item.layout_override === 'string' ? JSON.parse(item.layout_override) : item.layout_override)
      : null) || item.category.display_layout || { type: 'columns', columns: 1 };

    const columnCount = displayLayout.type === 'list' ? 1 : (displayLayout.columns || 1);
    const colWidth = Math.floor(12 / columnCount);

    return (
      <Row>
        {fields.map(fd => {
          const defId = fd.definition_id || fd.id;
          const value = fieldValueMap[defId];
          return (
            <Col key={defId} xs={12} md={colWidth} className="mb-2">
              <div className="small text-muted mb-1">{fd.field_label || fd.field_name}</div>
              <div
                className="px-2 py-1 rounded"
                style={{ backgroundColor: '#f8f7f4', border: '1px solid #e8e4dc', minHeight: '2rem', fontSize: '0.92rem' }}
              >
                {formatFieldValue(value)}
              </div>
            </Col>
          );
        })}
      </Row>
    );
  };

  const renderReadOnlyMeasure = (item) => {
    if (!item.measure) return <p className="text-muted small mb-0">{t('consultationNotes.measureNotFound', 'Measure not found')}</p>;
    const measure = item.measure;
    const hasEntry = Boolean(measureEntryMap[item.id]);
    return (
      <div className="d-flex align-items-center gap-2">
        <span className="fw-medium small">{measure.display_name || measure.name}</span>
        {measure.unit && <Badge bg="light" text="dark" style={{ fontSize: '0.7rem' }}>{measure.unit}</Badge>}
        <Badge bg={hasEntry ? 'success' : 'secondary'} style={{ fontSize: '0.7rem' }}>
          {hasEntry
            ? t('consultationNotes.measureRecorded', 'Enregistrée')
            : t('consultationNotes.measureNotRecorded', 'Non enregistrée')}
        </Badge>
      </div>
    );
  };

  const renderReadOnlyInstruction = (item) => {
    const noteText = instructionNoteMap[item.id] || '';
    return (
      <>
        {item.instruction_content && (
          <div className="mb-2 p-2 rounded" style={{ backgroundColor: '#fef9e7', borderLeft: '3px solid #f39c12' }}>
            <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {item.instruction_content}
            </p>
          </div>
        )}
        {noteText && (
          <div className="p-2 rounded" style={{ backgroundColor: '#f8f7f4', border: '1px solid #e8e4dc', whiteSpace: 'pre-wrap', fontSize: '0.92rem' }}>
            {noteText}
          </div>
        )}
        {!noteText && (
          <p className="text-muted small mb-0">—</p>
        )}
      </>
    );
  };

  return (
    <div>
      {/* Meta info */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="py-2">
          <div className="d-flex gap-4 text-muted small flex-wrap">
            <span><FaUser className="me-1" />{note.patient?.first_name} {note.patient?.last_name}</span>
            <span><FaCalendar className="me-1" />{new Date(note.created_at).toLocaleDateString()}</span>
            {note.dietitian && <span>{t('consultationNotes.by', 'By')}: {note.dietitian.first_name} {note.dietitian.last_name}</span>}
            {note.completed_at && <span>{t('consultationNotes.completedAt', 'Completed')}: {new Date(note.completed_at).toLocaleDateString()}</span>}
            <span><Badge bg="success">{t('consultationNotes.statusCompleted', 'Terminée')}</Badge></span>
          </div>
        </Card.Body>
      </Card>

      {/* Template items read-only */}
      {templateItems.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center py-5">
            <p className="text-muted">{t('consultationNotes.noItems', 'No items')}</p>
          </Card.Body>
        </Card>
      )}
      {templateItems.map((item, index) => {
        const Icon = ITEM_ICONS[item.item_type] || FaInfoCircle;
        const borderColor = ITEM_COLORS[item.item_type] || '#6c757d';
        let headerLabel = '';
        if (item.item_type === 'category' && item.category) headerLabel = item.category.name;
        else if (item.item_type === 'measure' && item.measure) headerLabel = item.measure.display_name || item.measure.name;
        else if (item.item_type === 'instruction') headerLabel = item.instruction_title || t('consultationNotes.instructions', 'Instructions');

        return (
          <Card key={item.id || index} className="mb-3 border-0 shadow-sm" style={{ borderLeft: `4px solid ${borderColor}` }}>
            <Card.Header className="bg-white border-0 py-2">
              <div className="d-flex align-items-center gap-2">
                <Icon style={{ color: borderColor }} />
                <h6 className="mb-0" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>{headerLabel}</h6>
              </div>
            </Card.Header>
            <Card.Body>
              {item.item_type === 'category' && renderReadOnlyCategory(item)}
              {item.item_type === 'measure' && renderReadOnlyMeasure(item)}
              {item.item_type === 'instruction' && renderReadOnlyInstruction(item)}
            </Card.Body>
          </Card>
        );
      })}

      {/* Summary */}
      {note.summary && (
        <Card className="mt-4 mb-3 border-0 shadow-sm">
          <Card.Header className="bg-white border-0 py-2">
            <h6 className="mb-0" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              {t('consultationNotes.summary', 'Résumé')}
            </h6>
          </Card.Header>
          <Card.Body>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: 1.6 }}>{note.summary}</div>
          </Card.Body>
        </Card>
      )}

      {/* AI Summary */}
      {note.ai_summary && (
        <Card className="mt-3 mb-4 border-0 shadow-sm" style={{ borderLeft: '4px solid #6f42c1' }}>
          <Card.Header className="bg-white border-0 py-2">
            <div className="d-flex align-items-center gap-2">
              <FaRobot style={{ color: '#6f42c1' }} />
              <h6 className="mb-0" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                {t('consultationNotes.aiSummaryTitle', 'Résumé IA')}
              </h6>
            </div>
          </Card.Header>
          <Card.Body>
            <div
              className="p-3 rounded"
              style={{ backgroundColor: '#f8f5ff', border: '1px solid #e0d6f5', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.95rem' }}
            >
              {note.ai_summary}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default PreviousConsultationView;
