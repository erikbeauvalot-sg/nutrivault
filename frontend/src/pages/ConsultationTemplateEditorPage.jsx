import { useState, useEffect } from 'react';
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
  InputGroup,
  Modal,
  ListGroup
} from 'react-bootstrap';
import {
  FaSave,
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaChevronUp,
  FaChevronDown,
  FaEye,
  FaLayerGroup,
  FaRuler,
  FaInfoCircle,
  FaGripVertical,
  FaUser,
  FaSyncAlt
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import consultationTemplateService from '../services/consultationTemplateService';
import { getCategories } from '../services/customFieldService';
import { getMeasureDefinitions } from '../services/measureService';
import { useTranslation } from 'react-i18next';

const TEMPLATE_TYPES = ['anamnesis', 'evaluation', 'meal_plan', 'follow_up', 'general', 'custom'];
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

/**
 * Determine if a category stores data at patient level (shared) or consultation level (per visit)
 */
function getCategoryLevel(category) {
  const entityTypes = category?.entity_types || ['patient'];
  if (entityTypes.includes('patient')) return 'patient';
  return 'consultation';
}

const ConsultationTemplateEditorPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Template metadata
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState('general');
  const [visibility, setVisibility] = useState('private');
  const [color, setColor] = useState('#9b59b6');
  const [isDefault, setIsDefault] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  // Items list
  const [items, setItems] = useState([]);

  // Picker modals
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showMeasurePicker, setShowMeasurePicker] = useState(false);
  const [categories, setCategories] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const response = await consultationTemplateService.getTemplateById(id);
      const tmpl = response.data;
      setName(tmpl.name);
      setDescription(tmpl.description || '');
      setTemplateType(tmpl.template_type);
      setVisibility(tmpl.visibility);
      setColor(tmpl.color || '#9b59b6');
      setIsDefault(tmpl.is_default);
      setTags(tmpl.tags || []);
      setItems((tmpl.items || []).map(item => ({
        ...item,
        _key: item.id || Date.now() + Math.random()
      })));
    } catch (err) {
      setError(err.response?.data?.error || t('consultationTemplates.loadError', 'Failed to load template'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('consultationTemplates.nameRequired', 'Template name is required'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        template_type: templateType,
        visibility,
        color,
        is_default: isDefault,
        tags,
        items: items.map((item, i) => ({
          item_type: item.item_type,
          reference_id: item.reference_id || null,
          display_order: i,
          is_required: item.is_required || false,
          instruction_title: item.instruction_title || null,
          instruction_content: item.instruction_content || null,
          layout_override: item.layout_override || null
        }))
      };

      if (isEdit) {
        await consultationTemplateService.updateTemplate(id, data);
        setSuccess(t('consultationTemplates.updateSuccess', 'Template updated successfully'));
      } else {
        const response = await consultationTemplateService.createTemplate(data);
        setSuccess(t('consultationTemplates.createSuccess', 'Template created successfully'));
        navigate(`/consultation-templates/${response.data.id}/edit`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || t('consultationTemplates.saveError', 'Failed to save template'));
    } finally {
      setSaving(false);
    }
  };

  // Category picker
  const openCategoryPicker = async () => {
    setPickerSearch('');
    setShowCategoryPicker(true);
    setPickerLoading(true);
    try {
      const result = await getCategories();
      setCategories(Array.isArray(result) ? result : result?.data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setPickerLoading(false);
    }
  };

  const addCategoryItem = (category) => {
    // Check if already added
    if (items.some(item => item.item_type === 'category' && item.reference_id === category.id)) {
      return;
    }
    setItems(prev => [...prev, {
      _key: Date.now(),
      item_type: 'category',
      reference_id: category.id,
      display_order: prev.length,
      is_required: false,
      category: category
    }]);
    setShowCategoryPicker(false);
  };

  // Measure picker
  const openMeasurePicker = async () => {
    setPickerSearch('');
    setShowMeasurePicker(true);
    setPickerLoading(true);
    try {
      const result = await getMeasureDefinitions();
      setMeasures(Array.isArray(result) ? result : result?.data || []);
    } catch (err) {
      console.error('Failed to load measures:', err);
    } finally {
      setPickerLoading(false);
    }
  };

  const addMeasureItem = (measure) => {
    if (items.some(item => item.item_type === 'measure' && item.reference_id === measure.id)) {
      return;
    }
    setItems(prev => [...prev, {
      _key: Date.now(),
      item_type: 'measure',
      reference_id: measure.id,
      display_order: prev.length,
      is_required: false,
      measure: measure
    }]);
    setShowMeasurePicker(false);
  };

  // Instruction
  const addInstructionItem = () => {
    setItems(prev => [...prev, {
      _key: Date.now(),
      item_type: 'instruction',
      reference_id: null,
      display_order: prev.length,
      is_required: false,
      instruction_title: '',
      instruction_content: ''
    }]);
  };

  // Item management
  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const moveItem = (idx, dir) => {
    setItems(prev => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  const updateItemField = (idx, key, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [key]: value } : item));
  };

  // Tag management
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const getItemLabel = (item) => {
    if (item.item_type === 'category') {
      return item.category?.name || t('consultationTemplates.unknownCategory', 'Unknown Category');
    }
    if (item.item_type === 'measure') {
      return item.measure?.display_name || item.measure?.name || t('consultationTemplates.unknownMeasure', 'Unknown Measure');
    }
    return item.instruction_title || t('consultationTemplates.instruction', 'Instruction');
  };

  const getItemIcon = (item) => {
    if (item.item_type === 'category') return <FaLayerGroup className="text-primary" />;
    if (item.item_type === 'measure') return <FaRuler className="text-success" />;
    return <FaInfoCircle className="text-warning" />;
  };

  const getItemTypeBadge = (item) => {
    const colors = { category: 'primary', measure: 'success', instruction: 'warning' };
    const labels = {
      category: t('consultationTemplates.categoryItem', 'Category'),
      measure: t('consultationTemplates.measureItem', 'Measure'),
      instruction: t('consultationTemplates.instructionItem', 'Instruction')
    };
    return <Badge bg={colors[item.item_type]} style={{ fontSize: '0.65rem' }}>{labels[item.item_type]}</Badge>;
  };

  const getItemDetails = (item) => {
    if (item.item_type === 'category' && item.category) {
      const fieldCount = item.category.field_definitions?.length || 0;
      return `${fieldCount} ${t('consultationTemplates.fields', 'fields')}`;
    }
    if (item.item_type === 'measure' && item.measure) {
      return `${item.measure.category || ''} ${item.measure.unit ? `(${item.measure.unit})` : ''}`.trim();
    }
    return '';
  };

  // Filter for pickers
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(pickerSearch.toLowerCase()) &&
    !items.some(item => item.item_type === 'category' && item.reference_id === c.id)
  );

  const filteredMeasures = measures.filter(m =>
    (m.display_name || m.name || '').toLowerCase().includes(pickerSearch.toLowerCase()) &&
    !items.some(item => item.item_type === 'measure' && item.reference_id === m.id)
  );

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

  return (
    <Layout>
      <Container fluid className="py-4">
        {/* Header */}
        <Row className="mb-4 align-items-center" style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'var(--nv-parchment-light)', paddingTop: '0.5rem', paddingBottom: '0.75rem' }}>
          <Col>
            <Button variant="link" className="p-0 text-muted mb-2" onClick={() => navigate('/consultation-templates')}>
              <FaArrowLeft className="me-1" /> {t('consultationTemplates.backToList', 'Back to templates')}
            </Button>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800 }}>
              {isEdit ? t('consultationTemplates.editTemplate', 'Edit Template') : t('consultationTemplates.newTemplate', 'New Template')}
            </h2>
          </Col>
          <Col xs="auto" className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={() => setShowPreview(!showPreview)}>
              <FaEye className="me-1" /> {showPreview ? t('consultationTemplates.hidePreview', 'Hide Preview') : t('consultationTemplates.showPreview', 'Preview')}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner animation="border" size="sm" className="me-1" /> : <FaSave className="me-1" />}
              {t('common.save', 'Save')}
            </Button>
          </Col>
        </Row>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

        <Row>
          {/* Editor */}
          <Col lg={showPreview ? 7 : 12}>
            {/* Template Metadata */}
            <Card className="mb-4 border-0 shadow-sm">
              <Card.Header className="bg-white border-0 py-3">
                <h5 className="mb-0" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {t('consultationTemplates.templateInfo', 'Template Information')}
                </h5>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={8}>
                    <Form.Group>
                      <Form.Label>{t('consultationTemplates.templateName', 'Name')} *</Form.Label>
                      <Form.Control
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder={t('consultationTemplates.namePlaceholder', 'e.g., Initial Nutritional Assessment')}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>{t('consultationTemplates.type', 'Type')}</Form.Label>
                      <Form.Select value={templateType} onChange={e => setTemplateType(e.target.value)}>
                        {TEMPLATE_TYPES.map(type => (
                          <option key={type} value={type}>
                            {t(`consultationTemplates.types.${type}`, type.replace('_', ' '))}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>{t('common.description', 'Description')}</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder={t('consultationTemplates.descriptionPlaceholder', 'Describe when to use this template...')}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>{t('consultationTemplates.visibility', 'Visibility')}</Form.Label>
                      <Form.Select value={visibility} onChange={e => setVisibility(e.target.value)}>
                        <option value="private">{t('consultationTemplates.private', 'Private')}</option>
                        <option value="shared">{t('consultationTemplates.shared', 'Shared with team')}</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>{t('consultationTemplates.color', 'Color')}</Form.Label>
                      <div className="d-flex gap-2 flex-wrap">
                        {COLORS.map(c => (
                          <div
                            key={c}
                            onClick={() => setColor(c)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              backgroundColor: c,
                              cursor: 'pointer',
                              border: color === c ? '3px solid #333' : '2px solid #ddd'
                            }}
                          />
                        ))}
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Check
                      type="switch"
                      label={t('consultationTemplates.setAsDefault', 'Set as default')}
                      checked={isDefault}
                      onChange={e => setIsDefault(e.target.checked)}
                      className="mt-4"
                    />
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>{t('consultationTemplates.tags', 'Tags')}</Form.Label>
                      <div className="d-flex gap-2 mb-2 flex-wrap">
                        {tags.map(tag => (
                          <Badge key={tag} bg="secondary" className="d-flex align-items-center gap-1" style={{ cursor: 'pointer' }} onClick={() => removeTag(tag)}>
                            {tag} &times;
                          </Badge>
                        ))}
                      </div>
                      <InputGroup size="sm" style={{ maxWidth: 300 }}>
                        <Form.Control
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                          placeholder={t('consultationTemplates.addTag', 'Add tag...')}
                        />
                        <Button variant="outline-secondary" onClick={addTag}>{t('common.add', 'Add')}</Button>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Items */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t('consultationTemplates.items', 'Items')} ({items.length})
              </h5>
              <div className="d-flex gap-2">
                <Button variant="outline-primary" size="sm" onClick={openCategoryPicker}>
                  <FaLayerGroup className="me-1" /> {t('consultationTemplates.addCategory', 'Add Category')}
                </Button>
                <Button variant="outline-success" size="sm" onClick={openMeasurePicker}>
                  <FaRuler className="me-1" /> {t('consultationTemplates.addMeasure', 'Add Measure')}
                </Button>
                <Button variant="outline-warning" size="sm" onClick={addInstructionItem}>
                  <FaInfoCircle className="me-1" /> {t('consultationTemplates.addInstruction', 'Add Instruction')}
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body className="text-center py-4">
                  <p className="text-muted">{t('consultationTemplates.noItems', 'No items yet. Add categories, measures, or instructions.')}</p>
                  <div className="d-flex gap-2 justify-content-center">
                    <Button variant="primary" size="sm" onClick={openCategoryPicker}>
                      <FaLayerGroup className="me-1" /> {t('consultationTemplates.addCategory', 'Add Category')}
                    </Button>
                    <Button variant="success" size="sm" onClick={openMeasurePicker}>
                      <FaRuler className="me-1" /> {t('consultationTemplates.addMeasure', 'Add Measure')}
                    </Button>
                    <Button variant="warning" size="sm" onClick={addInstructionItem}>
                      <FaInfoCircle className="me-1" /> {t('consultationTemplates.addInstruction', 'Add Instruction')}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            ) : (
              items.map((item, idx) => (
                <Card key={item._key || item.id} className="mb-2 border-0 shadow-sm" style={{ borderLeft: `3px solid ${color}` }}>
                  <Card.Body className="py-2 px-3">
                    <div className="d-flex align-items-center gap-2">
                      <FaGripVertical className="text-muted flex-shrink-0" />
                      <div className="flex-shrink-0">{getItemIcon(item)}</div>
                      <div className="flex-grow-1">
                        {item.item_type === 'instruction' ? (
                          <div>
                            <Form.Control
                              size="sm"
                              className="mb-1"
                              placeholder={t('consultationTemplates.instructionTitle', 'Instruction title')}
                              value={item.instruction_title || ''}
                              onChange={e => updateItemField(idx, 'instruction_title', e.target.value)}
                            />
                            <Form.Control
                              as="textarea"
                              size="sm"
                              rows={2}
                              placeholder={t('consultationTemplates.instructionContent', 'Instruction content / guidance text...')}
                              value={item.instruction_content || ''}
                              onChange={e => updateItemField(idx, 'instruction_content', e.target.value)}
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="d-flex align-items-center gap-2">
                              <strong className="small">{getItemLabel(item)}</strong>
                              {getItemTypeBadge(item)}
                              {item.item_type === 'category' && item.category && (() => {
                                const level = getCategoryLevel(item.category);
                                return (
                                  <Badge
                                    bg="none"
                                    className="d-flex align-items-center gap-1"
                                    style={{
                                      fontSize: '0.6rem',
                                      backgroundColor: level === 'patient' ? '#e8f4fd' : '#fef3e2',
                                      color: level === 'patient' ? '#1a73b5' : '#b5651d',
                                      border: `1px solid ${level === 'patient' ? '#b3d7f0' : '#f0d4a8'}`
                                    }}
                                  >
                                    {level === 'patient' ? <FaUser style={{ fontSize: '0.5rem' }} /> : <FaSyncAlt style={{ fontSize: '0.5rem' }} />}
                                    {level === 'patient'
                                      ? t('consultationTemplates.patientLevel', 'Patient')
                                      : t('consultationTemplates.consultationLevel', 'Per visit')}
                                  </Badge>
                                );
                              })()}
                              {item.item_type === 'category' && item.category?.color && (
                                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: item.category.color }} />
                              )}
                            </div>
                            <small className="text-muted">{getItemDetails(item)}</small>
                          </div>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-1 flex-shrink-0">
                        <Form.Check
                          type="switch"
                          title={t('common.required', 'Required')}
                          checked={item.is_required || false}
                          onChange={e => updateItemField(idx, 'is_required', e.target.checked)}
                          className="me-1"
                        />
                        <Button variant="link" size="sm" className="p-0 text-muted" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>
                          <FaChevronUp style={{ fontSize: '0.7em' }} />
                        </Button>
                        <Button variant="link" size="sm" className="p-0 text-muted" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}>
                          <FaChevronDown style={{ fontSize: '0.7em' }} />
                        </Button>
                        <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => removeItem(idx)}>
                          <FaTrash style={{ fontSize: '0.8em' }} />
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))
            )}

            {items.length > 0 && (
              <div className="d-flex gap-2 mb-4">
                <Button variant="outline-primary" className="flex-fill" onClick={openCategoryPicker} style={{ borderStyle: 'dashed' }}>
                  <FaLayerGroup className="me-1" /> {t('consultationTemplates.addCategory', 'Add Category')}
                </Button>
                <Button variant="outline-success" className="flex-fill" onClick={openMeasurePicker} style={{ borderStyle: 'dashed' }}>
                  <FaRuler className="me-1" /> {t('consultationTemplates.addMeasure', 'Add Measure')}
                </Button>
                <Button variant="outline-warning" className="flex-fill" onClick={addInstructionItem} style={{ borderStyle: 'dashed' }}>
                  <FaInfoCircle className="me-1" /> {t('consultationTemplates.addInstruction', 'Add Instruction')}
                </Button>
              </div>
            )}
          </Col>

          {/* Preview */}
          {showPreview && (
            <Col lg={5}>
              <Card className="border-0 shadow-sm sticky-top" style={{ top: 80 }}>
                <Card.Header className="bg-white border-0 py-3">
                  <h5 className="mb-0" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <FaEye className="me-2 text-muted" />
                    {t('consultationTemplates.preview', 'Preview')}
                  </h5>
                </Card.Header>
                <Card.Body style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  <h6 style={{ color }}>{name || t('consultationTemplates.untitled', 'Untitled Template')}</h6>
                  {description && <p className="text-muted small">{description}</p>}

                  {items.map((item, idx) => (
                    <div key={item._key || idx} className="mb-3">
                      {item.item_type === 'category' && item.category && (
                        <div>
                          <h6 className="border-bottom pb-1 d-flex align-items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {item.category.color && <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.category.color }} />}
                            {item.category.name}
                            {item.is_required && <span className="text-danger">*</span>}
                            {(() => {
                              const level = getCategoryLevel(item.category);
                              return (
                                <Badge
                                  bg="none"
                                  style={{
                                    fontSize: '0.55rem',
                                    fontWeight: 500,
                                    backgroundColor: level === 'patient' ? '#e8f4fd' : '#fef3e2',
                                    color: level === 'patient' ? '#1a73b5' : '#b5651d'
                                  }}
                                >
                                  {level === 'patient' ? <FaUser className="me-1" style={{ fontSize: '0.45rem' }} /> : <FaSyncAlt className="me-1" style={{ fontSize: '0.45rem' }} />}
                                  {level === 'patient'
                                    ? t('consultationTemplates.patientLevel', 'Patient')
                                    : t('consultationTemplates.consultationLevel', 'Per visit')}
                                </Badge>
                              );
                            })()}
                          </h6>
                          {(() => {
                            const layout = item.category.display_layout || { type: 'columns', columns: 1 };
                            const colWidth = Math.floor(12 / (layout.columns || 1));
                            const fields = item.category.field_definitions || [];
                            return layout.type === 'list' ? (
                              fields.map(fd => (
                                <Form.Group key={fd.id} className="mb-2">
                                  <Form.Label className="small mb-0">{fd.field_label}{fd.is_required && <span className="text-danger">*</span>}</Form.Label>
                                  <Form.Control disabled className="bg-light" size="sm" placeholder={fd.field_type} />
                                </Form.Group>
                              ))
                            ) : (
                              <Row>
                                {fields.map(fd => (
                                  <Col key={fd.id} xs={12} md={colWidth}>
                                    <Form.Group className="mb-2">
                                      <Form.Label className="small mb-0">{fd.field_label}{fd.is_required && <span className="text-danger">*</span>}</Form.Label>
                                      <Form.Control disabled className="bg-light" size="sm" placeholder={fd.field_type} />
                                    </Form.Group>
                                  </Col>
                                ))}
                              </Row>
                            );
                          })()}
                        </div>
                      )}

                      {item.item_type === 'measure' && item.measure && (
                        <div className="border rounded p-2 bg-light">
                          <div className="d-flex align-items-center gap-2">
                            <FaRuler className="text-success" />
                            <strong className="small">{item.measure.display_name || item.measure.name}</strong>
                            {item.measure.unit && <small className="text-muted">({item.measure.unit})</small>}
                            {item.is_required && <span className="text-danger">*</span>}
                          </div>
                          <Form.Control disabled className="bg-white mt-1" size="sm" placeholder={item.measure.measure_type || 'numeric'} />
                        </div>
                      )}

                      {item.item_type === 'instruction' && (
                        <div className="border-start border-3 border-warning ps-3">
                          <strong className="small d-block">{item.instruction_title || t('consultationTemplates.instruction', 'Instruction')}</strong>
                          <small className="text-muted">{item.instruction_content || ''}</small>
                          <Form.Control as="textarea" disabled className="bg-light mt-1" size="sm" rows={2} placeholder={t('consultationNotes.enterNotes', 'Notes...')} />
                        </div>
                      )}
                    </div>
                  ))}

                  {items.length === 0 && (
                    <p className="text-muted text-center py-3">{t('consultationTemplates.emptyPreview', 'Add items to see a preview')}</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      </Container>

      {/* Category Picker Modal */}
      <Modal show={showCategoryPicker} onHide={() => setShowCategoryPicker(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {t('consultationTemplates.pickCategory', 'Select a Category')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            className="mb-3"
            placeholder={t('common.search', 'Search...')}
            value={pickerSearch}
            onChange={e => setPickerSearch(e.target.value)}
          />
          {pickerLoading ? (
            <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
          ) : filteredCategories.length === 0 ? (
            <p className="text-muted text-center py-3">
              {categories.length === 0
                ? t('consultationTemplates.noCategories', 'No categories available')
                : t('consultationTemplates.allCategoriesAdded', 'All matching categories are already added')}
            </p>
          ) : (
            <ListGroup>
              {filteredCategories.map(cat => {
                const level = getCategoryLevel(cat);
                return (
                  <ListGroup.Item
                    key={cat.id}
                    action
                    onClick={() => addCategoryItem(cat)}
                    className="d-flex align-items-center gap-3"
                  >
                    {cat.color && <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />}
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2">
                        <strong>{cat.name}</strong>
                        <Badge
                          bg="none"
                          className="d-flex align-items-center gap-1"
                          style={{
                            fontSize: '0.6rem',
                            backgroundColor: level === 'patient' ? '#e8f4fd' : '#fef3e2',
                            color: level === 'patient' ? '#1a73b5' : '#b5651d',
                            border: `1px solid ${level === 'patient' ? '#b3d7f0' : '#f0d4a8'}`
                          }}
                        >
                          {level === 'patient' ? <FaUser style={{ fontSize: '0.5rem' }} /> : <FaSyncAlt style={{ fontSize: '0.5rem' }} />}
                          {level === 'patient'
                            ? t('consultationTemplates.patientLevel', 'Patient')
                            : t('consultationTemplates.consultationLevel', 'Per visit')}
                        </Badge>
                      </div>
                      {cat.description && <small className="text-muted d-block">{cat.description}</small>}
                    </div>
                    <Badge bg="secondary">{cat.field_definitions?.length || 0} {t('consultationTemplates.fields', 'fields')}</Badge>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          )}
        </Modal.Body>
      </Modal>

      {/* Measure Picker Modal */}
      <Modal show={showMeasurePicker} onHide={() => setShowMeasurePicker(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {t('consultationTemplates.pickMeasure', 'Select a Measure')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            className="mb-3"
            placeholder={t('common.search', 'Search...')}
            value={pickerSearch}
            onChange={e => setPickerSearch(e.target.value)}
          />
          {pickerLoading ? (
            <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
          ) : filteredMeasures.length === 0 ? (
            <p className="text-muted text-center py-3">
              {measures.length === 0
                ? t('consultationTemplates.noMeasures', 'No measures available')
                : t('consultationTemplates.allMeasuresAdded', 'All matching measures are already added')}
            </p>
          ) : (
            <ListGroup>
              {filteredMeasures.map(m => (
                <ListGroup.Item
                  key={m.id}
                  action
                  onClick={() => addMeasureItem(m)}
                  className="d-flex align-items-center gap-3"
                >
                  <FaRuler className="text-success flex-shrink-0" />
                  <div className="flex-grow-1">
                    <strong>{m.display_name || m.name}</strong>
                    {m.description && <small className="text-muted d-block">{m.description.substring(0, 60)}</small>}
                  </div>
                  <div className="text-end flex-shrink-0">
                    {m.unit && <Badge bg="outline-secondary" className="border text-muted">{m.unit}</Badge>}
                    <small className="text-muted d-block">{m.category}</small>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
      </Modal>
    </Layout>
  );
};

export default ConsultationTemplateEditorPage;
