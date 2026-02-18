import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Badge,
  Spinner,
  Alert,
  Modal
} from 'react-bootstrap';
import {
  FaArrowLeft,
  FaSave,
  FaCheck,
  FaTrash,
  FaUser,
  FaCalendar,
  FaLayerGroup,
  FaRuler,
  FaInfoCircle,
  FaSyncAlt
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import CustomFieldInput from '../components/CustomFieldInput';
import EmbeddedMeasureField from '../components/EmbeddedMeasureField';
import consultationNoteService from '../services/consultationNoteService';
import visitCustomFieldService from '../services/visitCustomFieldService';
import { getPatientCustomFields } from '../services/customFieldService';
import { finishAndInvoice } from '../services/visitService';
import { useTranslation } from 'react-i18next';

const AUTO_SAVE_DELAY = 3000;

const ITEM_ICONS = {
  category: FaLayerGroup,
  measure: FaRuler,
  instruction: FaInfoCircle
};

const ITEM_COLORS = {
  category: '#3498db',
  measure: '#2ecc71',
  instruction: '#f39c12'
};

function getCategoryLevel(category) {
  const entityTypes = category?.entity_types || ['patient'];
  if (entityTypes.includes('patient')) return 'patient';
  return 'consultation';
}

const ConsultationNoteEditorPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);

  const [note, setNote] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [instructionNotes, setInstructionNotes] = useState({});
  const [summary, setSummary] = useState('');
  const [dirty, setDirty] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [finishOptions, setFinishOptions] = useState({
    markCompleted: true,
    generateInvoice: true,
    sendEmail: false
  });
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    loadNote();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [id]);

  // Auto-save when values change
  useEffect(() => {
    if (!dirty || !note) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleAutoSave();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [fieldValues, instructionNotes, summary, dirty]);

  const loadNote = async () => {
    try {
      setLoading(true);
      const response = await consultationNoteService.getNoteById(id);
      const noteData = response.data;
      setNote(noteData);
      setSummary(noteData.summary || '');

      // Load existing custom field values from visit/patient tables
      await loadExistingValues(noteData);

      // Load instruction notes from entries
      const insNotes = {};
      if (noteData.entries) {
        for (const entry of noteData.entries) {
          if (entry.entry_type === 'instruction_note' && entry.template_item_id) {
            insNotes[entry.template_item_id] = entry.note_text || '';
          }
        }
      }
      setInstructionNotes(insNotes);
    } catch (err) {
      setError(err.response?.data?.error || t('consultationNotes.loadError', 'Failed to load note'));
    } finally {
      setLoading(false);
    }
  };

  const loadExistingValues = async (noteData) => {
    const valMap = {};

    try {
      // Load patient-level custom field values first
      if (noteData.patient_id) {
        const patientFields = await getPatientCustomFields(noteData.patient_id);
        extractFieldValues(patientFields, valMap);
      }

      // Load visit-level custom field values (overrides patient-level for same fields)
      if (noteData.visit_id) {
        const visitFields = await visitCustomFieldService.getVisitCustomFields(noteData.visit_id);
        extractFieldValues(visitFields, valMap);
      }
    } catch (err) {
      console.error('Error loading existing field values:', err);
    }

    setFieldValues(valMap);
  };

  const extractFieldValues = (categories, valMap) => {
    if (!Array.isArray(categories)) return;
    for (const cat of categories) {
      const fields = cat.field_definitions || cat.fields || [];
      for (const fd of fields) {
        const defId = fd.definition_id || fd.id;
        if (fd.value !== undefined && fd.value !== null) {
          valMap[defId] = fd.value;
        } else if (fd.current_value !== undefined && fd.current_value !== null) {
          valMap[defId] = fd.current_value;
        }
      }
    }
  };

  const handleFieldChange = useCallback((definitionId, value) => {
    setFieldValues(prev => ({ ...prev, [definitionId]: value }));
    setDirty(true);
  }, []);

  const handleInstructionNoteChange = useCallback((templateItemId, text) => {
    setInstructionNotes(prev => ({ ...prev, [templateItemId]: text }));
    setDirty(true);
  }, []);

  const handleSummaryChange = useCallback((text) => {
    setSummary(text);
    setDirty(true);
  }, []);

  const buildPayload = useCallback(() => {
    const payload = { summary };

    // Custom field values
    const cfvArray = [];
    if (note?.template?.items) {
      for (const item of note.template.items) {
        if (item.item_type === 'category' && item.category?.field_definitions) {
          for (const fd of item.category.field_definitions) {
            const defId = fd.definition_id || fd.id;
            if (fieldValues[defId] !== undefined) {
              cfvArray.push({
                definition_id: defId,
                value: fieldValues[defId],
                template_item_id: item.id
              });
            }
          }
        }
      }
    }
    if (cfvArray.length > 0) {
      payload.customFieldValues = cfvArray;
    }

    // Instruction notes
    const insArray = [];
    for (const [templateItemId, text] of Object.entries(instructionNotes)) {
      if (text !== undefined) {
        insArray.push({ template_item_id: templateItemId, text });
      }
    }
    if (insArray.length > 0) {
      payload.instructionNotes = insArray;
    }

    return payload;
  }, [note, fieldValues, instructionNotes, summary]);

  const handleAutoSave = async () => {
    try {
      setAutoSaveStatus('saving');
      await consultationNoteService.saveNoteValues(id, buildPayload());
      setAutoSaveStatus('saved');
      setDirty(false);
      setTimeout(() => setAutoSaveStatus(null), 2000);
    } catch (err) {
      setAutoSaveStatus('error');
      console.error('Auto-save failed:', err);
    }
  };

  const handleManualSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await consultationNoteService.saveNoteValues(id, buildPayload());
      setSuccess(t('consultationNotes.saved', 'Note saved'));
      setDirty(false);
    } catch (err) {
      setError(err.response?.data?.error || t('consultationNotes.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const handleFinishAndInvoice = async () => {
    setShowFinishModal(false);
    setCompleting(true);
    setError(null);
    try {
      // 1. Save current note values
      await consultationNoteService.saveNoteValues(id, buildPayload());

      // 2. Complete the consultation note
      await consultationNoteService.completeNote(id);

      // 3. Finish visit & generate invoice if requested
      if (note.visit_id && (finishOptions.markCompleted || finishOptions.generateInvoice || finishOptions.sendEmail)) {
        try {
          await finishAndInvoice(note.visit_id, finishOptions);
        } catch (visitErr) {
          // Visit/invoice step failed but note is already completed — show warning, not error
          console.error('Visit finish/invoice error:', visitErr);
          setSuccess(t('consultationNotes.completed', 'Note marked as completed'));
          setError(visitErr.response?.data?.error || t('visits.finishAndInvoiceError', 'Invoice generation failed'));
          setDirty(false);
          loadNote();
          return;
        }
      }

      setSuccess(t('visits.finishAndInvoiceSuccess', 'Consultation completed successfully'));
      setDirty(false);
      loadNote();
    } catch (err) {
      setError(err.response?.data?.error || t('consultationNotes.completeError', 'Failed to complete note'));
    } finally {
      setCompleting(false);
    }
  };

  const handleDeleteNote = async () => {
    setShowDeleteModal(false);
    setDeleting(true);
    setError(null);
    try {
      await consultationNoteService.deleteNote(id);
      navigate(-1);
    } catch (err) {
      setError(err.response?.data?.error || t('consultationNotes.deleteError', 'Failed to delete note'));
    } finally {
      setDeleting(false);
    }
  };

  const renderCategoryItem = (item) => {
    if (!item.category) {
      return <p className="text-muted small mb-0">{t('consultationNotes.categoryNotFound', 'Category not found')}</p>;
    }

    const cat = item.category;
    const fields = cat.field_definitions || [];

    if (fields.length === 0) {
      return <p className="text-muted small mb-0">{t('consultationNotes.noFieldsInCategory', 'No fields in this category')}</p>;
    }

    // Use layout_override from template item, or fallback to category's display_layout
    const displayLayout = (item.layout_override ? (typeof item.layout_override === 'string' ? JSON.parse(item.layout_override) : item.layout_override) : null)
      || cat.display_layout
      || { type: 'columns', columns: 1 };

    const renderField = (fd) => {
      const fieldDef = { ...fd, definition_id: fd.definition_id || fd.id };
      const defId = fieldDef.definition_id;
      return (
        <CustomFieldInput
          key={defId}
          fieldDefinition={fieldDef}
          value={fieldValues[defId]}
          onChange={handleFieldChange}
          patientId={note?.patient_id}
          visitId={note?.visit_id}
        />
      );
    };

    if (displayLayout.type === 'list') {
      return fields.map(fd => (
        <div key={fd.definition_id || fd.id} className="mb-3">
          {renderField(fd)}
        </div>
      ));
    }

    // Columns layout (default)
    const columnCount = displayLayout.columns || 1;
    const colWidth = Math.floor(12 / columnCount);

    return (
      <Row>
        {fields.map(fd => (
          <Col key={fd.definition_id || fd.id} xs={12} md={colWidth}>
            {renderField(fd)}
          </Col>
        ))}
      </Row>
    );
  };

  const renderMeasureItem = (item) => {
    if (!item.measure) {
      return <p className="text-muted small mb-0">{t('consultationNotes.measureNotFound', 'Measure not found')}</p>;
    }

    const measure = item.measure;

    return (
      <div>
        <div className="d-flex align-items-center gap-2 mb-2">
          <span className="fw-medium">{measure.display_name || measure.name}</span>
          {measure.unit && (
            <Badge bg="light" text="dark" style={{ fontSize: '0.7rem' }}>{measure.unit}</Badge>
          )}
        </div>
        <EmbeddedMeasureField
          patientId={note?.patient_id}
          measureName={measure.name}
          fieldLabel={measure.display_name || measure.name}
          visitId={note?.visit_id}
        />
      </div>
    );
  };

  const renderInstructionItem = (item) => {
    return (
      <>
        {item.instruction_content && (
          <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#fef9e7', borderLeft: '3px solid #f39c12' }}>
            <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {item.instruction_content}
            </p>
          </div>
        )}
        <Form.Group>
          <Form.Label className="small fw-medium">
            {t('consultationNotes.yourNotes', 'Your notes')}
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={instructionNotes[item.id] || ''}
            onChange={e => handleInstructionNoteChange(item.id, e.target.value)}
            placeholder={t('consultationNotes.enterNotes', 'Enter your notes...')}
          />
        </Form.Group>
      </>
    );
  };

  const renderTemplateItem = (item, index) => {
    const Icon = ITEM_ICONS[item.item_type] || FaInfoCircle;
    const borderColor = ITEM_COLORS[item.item_type] || '#6c757d';

    // Determine the header label
    let headerLabel = '';
    if (item.item_type === 'category' && item.category) {
      headerLabel = item.category.name;
    } else if (item.item_type === 'measure' && item.measure) {
      headerLabel = item.measure.display_name || item.measure.name;
    } else if (item.item_type === 'instruction') {
      headerLabel = item.instruction_title || t('consultationNotes.instructions', 'Instructions');
    }

    const categoryLevel = item.item_type === 'category' && item.category ? getCategoryLevel(item.category) : null;

    return (
      <Card key={item.id || index} className="mb-3 border-0 shadow-sm" style={{ borderLeft: `4px solid ${borderColor}` }}>
        <Card.Header className="bg-white border-0 py-2">
          <div className="d-flex align-items-center gap-2">
            <Icon style={{ color: borderColor }} />
            <h6 className="mb-0" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              {headerLabel}
            </h6>
            {item.is_required && <span className="text-danger">*</span>}
            {categoryLevel && (
              <Badge
                bg="none"
                className="d-flex align-items-center gap-1"
                style={{
                  fontSize: '0.6rem',
                  backgroundColor: categoryLevel === 'patient' ? '#e8f4fd' : '#fef3e2',
                  color: categoryLevel === 'patient' ? '#1a73b5' : '#b5651d',
                  border: `1px solid ${categoryLevel === 'patient' ? '#b3d7f0' : '#f0d4a8'}`
                }}
              >
                {categoryLevel === 'patient' ? <FaUser style={{ fontSize: '0.5rem' }} /> : <FaSyncAlt style={{ fontSize: '0.5rem' }} />}
                {categoryLevel === 'patient'
                  ? t('consultationTemplates.patientLevel', 'Patient')
                  : t('consultationTemplates.consultationLevel', 'Per visit')}
              </Badge>
            )}
            <Badge
              bg="none"
              className="ms-auto"
              style={{ backgroundColor: borderColor, fontSize: '0.65rem', opacity: 0.8 }}
            >
              {t(`consultationTemplates.itemTypes.${item.item_type}`, item.item_type)}
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          {item.item_type === 'category' && renderCategoryItem(item)}
          {item.item_type === 'measure' && renderMeasureItem(item)}
          {item.item_type === 'instruction' && renderInstructionItem(item)}
        </Card.Body>
      </Card>
    );
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <Spinner animation="border" />
          <p className="mt-2 text-muted">{t('common.loading', 'Loading...')}</p>
        </Container>
      </Layout>
    );
  }

  if (!note) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <p className="text-muted">{t('consultationNotes.notFound', 'Note not found')}</p>
          <Button variant="primary" onClick={() => navigate(-1)}>{t('common.back', 'Go Back')}</Button>
        </Container>
      </Layout>
    );
  }

  const isCompleted = note.status === 'completed';
  const templateItems = note.template?.items || [];

  return (
    <Layout>
      <Container fluid className="py-4">
        {/* Header */}
        <Row className="mb-4 align-items-center" style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'var(--nv-parchment-light)', paddingTop: '0.5rem', paddingBottom: '0.75rem' }}>
          <Col>
            <Button variant="link" className="p-0 text-muted mb-2" onClick={() => navigate(-1)}>
              <FaArrowLeft className="me-1" /> {t('common.back', 'Back')}
            </Button>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <h2 className="mb-0" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800 }}>
                {note.template?.name || t('consultationNotes.untitled', 'Consultation Note')}
              </h2>
              <Badge bg={isCompleted ? 'success' : 'warning'} text={isCompleted ? undefined : 'dark'}>
                {isCompleted ? t('consultationNotes.statusCompleted', 'Completed') : t('consultationNotes.statusDraft', 'Draft')}
              </Badge>
              {autoSaveStatus === 'saving' && <Spinner animation="border" size="sm" className="text-muted" />}
              {autoSaveStatus === 'saved' && <small className="text-success">{t('consultationNotes.autoSaved', 'Auto-saved')}</small>}
              {autoSaveStatus === 'error' && <small className="text-danger">{t('consultationNotes.autoSaveError', 'Auto-save failed')}</small>}
            </div>
          </Col>
          <Col xs="auto" className="d-flex gap-2">
            <Button variant="outline-danger" onClick={() => setShowDeleteModal(true)} disabled={deleting}>
              <FaTrash className="me-1" />
              {t('common.delete', 'Delete')}
            </Button>
            <Button variant="outline-primary" onClick={handleManualSave} disabled={saving}>
              {saving ? <Spinner animation="border" size="sm" className="me-1" /> : <FaSave className="me-1" />}
              {t('common.save', 'Save')}
            </Button>
            {!isCompleted && (
              <Button variant="success" onClick={() => setShowFinishModal(true)} disabled={completing}>
                {completing ? <Spinner animation="border" size="sm" className="me-1" /> : <FaCheck className="me-1" />}
                {t('visits.finishAndInvoice', 'Finish & Invoice')}
              </Button>
            )}
          </Col>
        </Row>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

        {/* Meta info */}
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Body className="py-2">
            <div className="d-flex gap-4 text-muted small flex-wrap">
              <span><FaUser className="me-1" /> {note.patient?.first_name} {note.patient?.last_name}</span>
              <span><FaCalendar className="me-1" /> {new Date(note.created_at).toLocaleDateString()}</span>
              {note.dietitian && <span>{t('consultationNotes.by', 'By')}: {note.dietitian.first_name} {note.dietitian.last_name}</span>}
              {note.completed_at && <span>{t('consultationNotes.completedAt', 'Completed')}: {new Date(note.completed_at).toLocaleDateString()}</span>}
            </div>
          </Card.Body>
        </Card>

        {/* Template Items */}
        {templateItems.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center py-5">
              <p className="text-muted">{t('consultationNotes.noItems', 'This template has no items configured')}</p>
            </Card.Body>
          </Card>
        ) : (
          templateItems.map((item, index) => renderTemplateItem(item, index))
        )}

        {/* Summary */}
        <Card className="mt-4 mb-3 border-0 shadow-sm">
          <Card.Header className="bg-white border-0 py-2">
            <h6 className="mb-0" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              {t('consultationNotes.summary', 'Summary')}
            </h6>
          </Card.Header>
          <Card.Body>
            <Form.Control
              as="textarea"
              rows={4}
              value={summary}
              onChange={e => handleSummaryChange(e.target.value)}
              placeholder={t('consultationNotes.summaryPlaceholder', 'Add a summary of this consultation...')}
            />
          </Card.Body>
        </Card>
      </Container>

      {/* Finish & Invoice Modal */}
      <Modal show={showFinishModal} onHide={() => setShowFinishModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
            {t('visits.finishAndInvoice', 'Finish & Invoice')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            <strong>{t('visits.finishAndInvoiceConfirmTitle', 'Complete visit in one click')}</strong>
          </Alert>
          <p>{t('visits.finishAndInvoiceSelectActions', 'Select the actions to perform:')}</p>

          <Form>
            <Form.Check
              type="checkbox"
              id="finish-mark-completed"
              label={t('visits.finishAndInvoiceStep1', 'Mark the visit as COMPLETED')}
              checked={finishOptions.markCompleted}
              onChange={(e) => setFinishOptions(prev => ({ ...prev, markCompleted: e.target.checked }))}
              className="mb-2"
            />
            <Form.Check
              type="checkbox"
              id="finish-generate-invoice"
              label={t('visits.finishAndInvoiceStep2', 'Automatically generate an invoice')}
              checked={finishOptions.generateInvoice}
              onChange={(e) => setFinishOptions(prev => ({ ...prev, generateInvoice: e.target.checked }))}
              className="mb-2"
            />
            <Form.Check
              type="checkbox"
              id="finish-send-email"
              label={t('visits.finishAndInvoiceStep3', 'Send the invoice by email to the patient')}
              checked={finishOptions.sendEmail}
              onChange={(e) => setFinishOptions(prev => ({ ...prev, sendEmail: e.target.checked }))}
              disabled={!note?.patient?.email}
              className="mb-2"
            />
            {!note?.patient?.email && (
              <Alert variant="warning" className="mt-2 py-2">
                {t('visits.finishAndInvoiceNoEmail', 'Patient does not have an email address configured')}
              </Alert>
            )}
          </Form>

          <hr />
          <p className="mb-0 text-muted">
            <small>{t('visits.finishAndInvoiceContinue', 'Click Confirm to execute the selected actions')}</small>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFinishModal(false)} disabled={completing}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="success"
            onClick={handleFinishAndInvoice}
            disabled={completing}
          >
            {completing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('visits.finishing', 'Processing...')}
              </>
            ) : (
              <>
                <FaCheck className="me-1" />
                {t('visits.confirmActions', 'Confirm')}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
            {t('consultationNotes.deleteNote', 'Delete Note')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger" className="mb-3">
            <strong>{t('consultationNotes.deleteWarning', 'This action cannot be undone.')}</strong>
          </Alert>
          <p>{t('consultationNotes.deleteConfirmMessage', 'Are you sure you want to delete this consultation note? The note entries will be removed, but patient data (custom fields, measures) will be preserved.')}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="danger" onClick={handleDeleteNote} disabled={deleting}>
            {deleting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('common.deleting', 'Deleting...')}
              </>
            ) : (
              <>
                <FaTrash className="me-1" />
                {t('common.delete', 'Delete')}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default ConsultationNoteEditorPage;
