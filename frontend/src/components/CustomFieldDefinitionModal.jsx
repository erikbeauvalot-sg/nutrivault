/**
 * CustomFieldDefinitionModal Component
 * Create/Edit modal for custom field definitions
 * Handles dynamic form based on field_type selection
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, Card, Badge, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import customFieldService from '../services/customFieldService';
import formulaService from '../services/formulaService';
import TranslationEditor from './TranslationEditor';
import DependencyTree from './DependencyTree';

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'textarea', label: 'Text Area', icon: '📄' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'select', label: 'Dropdown', icon: '📋' },
  { value: 'boolean', label: 'Yes/No', icon: '☑️' },
  { value: 'calculated', label: 'Calculated', icon: '🧮' },
  { value: 'separator', label: 'Separator', icon: '➖' },
  { value: 'blank', label: 'Blank Space', icon: '⬜' }
];

// Validation schema
const definitionSchema = (t) => yup.object().shape({
  category_id: yup.string()
    .required(t('forms.required')),
  field_name: yup.string()
    .required(t('forms.required'))
    .matches(/^[a-z0-9_]+$/, 'Field name can only contain lowercase letters, numbers, and underscores')
    .min(1, t('forms.minLength', { count: 1 }))
    .max(100, t('forms.maxLength', { count: 100 })),
  field_label: yup.string()
    .required(t('forms.required'))
    .min(1, t('forms.minLength', { count: 1 }))
    .max(200, t('forms.maxLength', { count: 200 })),
  field_type: yup.string()
    .required(t('forms.required'))
    .oneOf(['text', 'number', 'date', 'select', 'boolean', 'textarea', 'calculated', 'separator', 'blank']),
  help_text: yup.string()
    .max(500, t('forms.maxLength', { count: 500 }))
    .nullable(),
  display_order: yup.number()
    .typeError(t('forms.mustBeNumber'))
    .integer(t('forms.mustBeInteger'))
    .min(0, t('forms.minValue', { value: 0 }))
    .nullable()
});

const CustomFieldDefinitionModal = ({ show, onHide, definition, categories, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState('text');
  const [selectOptions, setSelectOptions] = useState([]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [validationRules, setValidationRules] = useState({});
  const [activeTab, setActiveTab] = useState('general');
  const [formula, setFormula] = useState('');
  const [decimalPlaces, setDecimalPlaces] = useState(2);
  const [formulaError, setFormulaError] = useState(null);
  const [dependencies, setDependencies] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // State for adding dropdown options
  const [showAddOptionModal, setShowAddOptionModal] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState('');

  const isEditing = !!definition;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm({
    resolver: yupResolver(definitionSchema(t)),
    defaultValues: {
      category_id: '',
      field_name: '',
      field_label: '',
      field_type: 'text',
      is_required: false,
      help_text: '',
      display_order: 0,
      is_active: true,
      show_in_basic_info: false,
      show_in_list: false
    }
  });

  const watchFieldType = watch('field_type');

  // Update selected field type when form changes
  useEffect(() => {
    if (watchFieldType) {
      setSelectedFieldType(watchFieldType);
    }
  }, [watchFieldType]);

  // Load templates when calculated field type is selected
  useEffect(() => {
    if (selectedFieldType === 'calculated' && templates.length === 0) {
      loadTemplates();
    }
  }, [selectedFieldType]);

  const loadTemplates = async () => {
    try {
      const templatesData = await formulaService.getTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setFormula(template.formula);
        setDecimalPlaces(template.decimal_places);
        setDependencies(template.dependencies);
      }
    }
  };

  // Reset form when definition changes or modal opens
  useEffect(() => {
    if (definition) {
      reset({
        category_id: definition.category_id || '',
        field_name: definition.field_name || '',
        field_label: definition.field_label || '',
        field_type: definition.field_type || 'text',
        is_required: definition.is_required || false,
        help_text: definition.help_text || '',
        display_order: definition.display_order || 0,
        is_active: definition.is_active !== undefined ? definition.is_active : true,
        show_in_basic_info: definition.show_in_basic_info || false,
        show_in_list: definition.show_in_list || false
      });
      setSelectedFieldType(definition.field_type || 'text');
      setSelectOptions(definition.select_options || []);
      setAllowMultiple(definition.allow_multiple || false);
      setValidationRules(definition.validation_rules || {});
      setFormula(definition.formula || '');
      setDecimalPlaces(definition.decimal_places !== undefined ? definition.decimal_places : 2);
      setDependencies(definition.dependencies || []);
    } else {
      reset({
        category_id: categories && categories.length > 0 ? categories[0].id : '',
        field_name: '',
        field_label: '',
        field_type: 'text',
        is_required: false,
        help_text: '',
        display_order: 0,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false
      });
      setSelectedFieldType('text');
      setSelectOptions([]);
      setAllowMultiple(false);
      setValidationRules({});
      setFormula('');
      setDecimalPlaces(2);
      setDependencies([]);
      setFormulaError(null);
    }
  }, [definition, categories, reset]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Build the payload
      const payload = {
        ...data
      };

      // Add validation_rules only if not empty
      if (Object.keys(validationRules).length > 0) {
        payload.validation_rules = JSON.stringify(validationRules);
      }

      // Add select_options only for select type
      if (selectedFieldType === 'select') {
        payload.select_options = selectOptions;
        payload.allow_multiple = allowMultiple;
      }

      // Add formula and decimal_places for calculated type
      if (selectedFieldType === 'calculated') {
        payload.formula = formula;
        payload.decimal_places = decimalPlaces;
      }

      // Validate select options
      if (selectedFieldType === 'select' && (!selectOptions || selectOptions.length === 0)) {
        setError('Please add at least one option for dropdown fields');
        setLoading(false);
        return;
      }

      // Validate formula for calculated fields
      if (selectedFieldType === 'calculated' && (!formula || formula.trim() === '')) {
        setError('Please enter a formula for calculated fields');
        setLoading(false);
        return;
      }

      if (isEditing) {
        await customFieldService.updateDefinition(definition.id, payload);
      } else {
        await customFieldService.createDefinition(payload);
      }

      setSuccess(true);
      reset();
      setSelectOptions([]);
      setAllowMultiple(false);
      setValidationRules({});
      setFormula('');
      setDecimalPlaces(2);
      setDependencies([]);
      setFormulaError(null);

      setTimeout(() => {
        onSuccess();
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Error saving field definition:', err);
      setError(err.response?.data?.error || t('errors.failedToSaveDefinition'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setSuccess(false);
    setSelectOptions([]);
    setAllowMultiple(false);
    setValidationRules({});
    setFormula('');
    setDecimalPlaces(2);
    setDependencies([]);
    setFormulaError(null);
    onHide();
  };

  const handleAddOption = () => {
    setNewOptionValue('');
    setShowAddOptionModal(true);
  };

  const handleConfirmAddOption = () => {
    if (newOptionValue && newOptionValue.trim()) {
      setSelectOptions([...selectOptions, newOptionValue.trim()]);
    }
    setShowAddOptionModal(false);
    setNewOptionValue('');
  };

  const handleCancelAddOption = () => {
    setShowAddOptionModal(false);
    setNewOptionValue('');
  };

  const handleRemoveOption = (index) => {
    setSelectOptions(selectOptions.filter((_, i) => i !== index));
  };

  const handleValidationChange = (key, value) => {
    setValidationRules({
      ...validationRules,
      [key]: value
    });
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl" fullscreen="md-down" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? '✏️ Edit Field Definition' : '➕ Create Field Definition'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              Field definition {isEditing ? 'updated' : 'created'} successfully!
            </Alert>
          )}

          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            <Tab eventKey="general" title="📝 General">
              <div className="pt-2">

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Category *</Form.Label>
                <Form.Select
                  {...register('category_id')}
                  isInvalid={!!errors.category_id}
                >
                  <option value="">Select category...</option>
                  {categories && categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.category_id?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Field Type *</Form.Label>
                <Form.Select
                  {...register('field_type')}
                  isInvalid={!!errors.field_type}
                >
                  {FIELD_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.field_type?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Field Name * <Badge bg="secondary">Internal ID</Badge></Form.Label>
            <Form.Control
              type="text"
              {...register('field_name')}
              isInvalid={!!errors.field_name}
              placeholder="e.g., sleep_hours"
              autoFocus
            />
            <Form.Control.Feedback type="invalid">
              {errors.field_name?.message}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Lowercase letters, numbers, and underscores only
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Field Label * <Badge bg="secondary">Display Name</Badge></Form.Label>
            <Form.Control
              type="text"
              {...register('field_label')}
              isInvalid={!!errors.field_label}
              placeholder="e.g., Sleep Hours per Night"
            />
            <Form.Control.Feedback type="invalid">
              {errors.field_label?.message}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Help Text</Form.Label>
            <Form.Control
              type="text"
              {...register('help_text')}
              isInvalid={!!errors.help_text}
              placeholder="Helpful description for users (optional)"
            />
            <Form.Control.Feedback type="invalid">
              {errors.help_text?.message}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Dynamic validation rules based on field type */}
          {selectedFieldType !== 'separator' && selectedFieldType !== 'blank' && (
            <Card className="mb-3">
              <Card.Header>Validation Rules</Card.Header>
              <Card.Body>
              {(selectedFieldType === 'text' || selectedFieldType === 'textarea') && (
                <Form.Group className="mb-2">
                  <Form.Label>Max Length</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Maximum characters"
                    value={validationRules.maxLength || ''}
                    onChange={(e) => handleValidationChange('maxLength', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </Form.Group>
              )}

              {selectedFieldType === 'number' && (
                <>
                  <Row>
                    <Col>
                      <Form.Group className="mb-2">
                        <Form.Label>Minimum Value</Form.Label>
                        <Form.Control
                          type="number"
                          step="any"
                          placeholder="Min"
                          value={validationRules.min || ''}
                          onChange={(e) => handleValidationChange('min', e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group className="mb-2">
                        <Form.Label>Maximum Value</Form.Label>
                        <Form.Control
                          type="number"
                          step="any"
                          placeholder="Max"
                          value={validationRules.max || ''}
                          onChange={(e) => handleValidationChange('max', e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </>
              )}

              {selectedFieldType === 'select' && (
                <div>
                  <Form.Label>Dropdown Options *</Form.Label>
                  <div className="mb-2">
                    {selectOptions.map((option, index) => (
                      <Badge key={index} bg="primary" className="me-2 mb-2" style={{ fontSize: '14px' }}>
                        {option}
                        <Button
                          variant="link"
                          size="sm"
                          className="text-white p-0 ms-2"
                          onClick={() => handleRemoveOption(index)}
                          style={{ textDecoration: 'none' }}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <Button variant="outline-primary" size="sm" onClick={handleAddOption}>
                    + Add Option
                  </Button>
                  {selectOptions.length === 0 && (
                    <Form.Text className="text-danger d-block">
                      At least one option is required
                    </Form.Text>
                  )}
                  <Form.Group className="mt-3">
                    <Form.Check
                      type="checkbox"
                      id="allow_multiple"
                      label="Allow multiple selections"
                      checked={allowMultiple}
                      onChange={(e) => setAllowMultiple(e.target.checked)}
                    />
                    <Form.Text className="text-muted">
                      When enabled, users can select multiple options. Values will be displayed as a comma-separated list.
                    </Form.Text>
                  </Form.Group>
                </div>
              )}

              {selectedFieldType === 'calculated' && (
                <div>
                  <Form.Group className="mb-3">
                    <Form.Label>Formula Template <Badge bg="secondary">Optional</Badge></Form.Label>
                    <Form.Select
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                    >
                      <option value="">-- Start from scratch or choose a template --</option>
                      {templates.length > 0 && (
                        <>
                          <optgroup label="Health & Nutrition">
                            {templates.filter(t => t.category === 'health' || t.category === 'nutrition').map(template => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Progress Tracking">
                            {templates.filter(t => t.category === 'progress').map(template => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Demographics">
                            {templates.filter(t => t.category === 'demographics').map(template => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Date & Time">
                            {templates.filter(t => t.category === 'date').map(template => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Mathematics">
                            {templates.filter(t => t.category === 'math').map(template => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </optgroup>
                        </>
                      )}
                    </Form.Select>
                    {selectedTemplate && templates.find(t => t.id === selectedTemplate) && (
                      <Form.Text className="text-muted d-block mt-1">
                        <strong>📝 {templates.find(t => t.id === selectedTemplate).description}</strong>
                        {templates.find(t => t.id === selectedTemplate).help_text && (
                          <><br/>{templates.find(t => t.id === selectedTemplate).help_text}</>
                        )}
                      </Form.Text>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Formula * <Badge bg="info">Calculated</Badge></Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder="Enter formula, e.g., {weight} / ({height} * {height})"
                      value={formula}
                      onChange={(e) => {
                        setFormula(e.target.value);
                        setFormulaError(null);
                      }}
                      isInvalid={!!formulaError}
                      style={{ fontFamily: 'monospace', fontSize: '14px' }}
                    />
                    {formulaError && (
                      <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                        {formulaError}
                      </Form.Control.Feedback>
                    )}
                    <Form.Text className="text-muted d-block mt-2">
                      <strong>Syntax:</strong> Use {'{field_name}'} for variables<br/>
                      <strong>Operators:</strong> + - * / ^ (power)<br/>
                      <strong>Math Functions:</strong> sqrt(), abs(), round(), floor(), ceil(), min(), max()<br/>
                      <strong>Date Functions:</strong> today(), year(), month(), day()<br/>
                      <strong>Example:</strong> {'{weight}'} / ({'{height}'} * {'{height}'}), or (today() - {'{birth_date}'}) / 365.25
                    </Form.Text>
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Decimal Places</Form.Label>
                        <Form.Select
                          value={decimalPlaces}
                          onChange={(e) => setDecimalPlaces(parseInt(e.target.value))}
                        >
                          <option value="0">0 (Integer)</option>
                          <option value="1">1</option>
                          <option value="2">2 (Default)</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                        </Form.Select>
                        <Form.Text className="text-muted">
                          Number of decimal places to display
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      {dependencies.length > 0 && (
                        <div>
                          <Form.Label>Dependencies</Form.Label>
                          <div className="mb-2">
                            {dependencies.map((dep, index) => (
                              <Badge key={index} bg="secondary" className="me-2 mb-2" style={{ fontSize: '13px' }}>
                                {dep}
                              </Badge>
                            ))}
                          </div>
                          <Form.Text className="text-muted">
                            Fields this calculated field depends on
                          </Form.Text>
                        </div>
                      )}
                    </Col>
                  </Row>

                  {/* Dependency Tree Visualization */}
                  {formula && (
                    <DependencyTree
                      formula={formula}
                      currentFieldName={definition?.field_name || null}
                      dependencies={dependencies}
                    />
                  )}

                  {formula && (
                    <Alert variant="info" className="mt-2">
                      <small>
                        <strong>ℹ️ Note:</strong> Calculated fields are automatically computed and read-only.
                        Values update when dependency fields change.
                      </small>
                    </Alert>
                  )}
                </div>
              )}

              {selectedFieldType === 'date' && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Date Format</Form.Label>
                    <Form.Select
                      value={validationRules.dateFormat || 'DD/MM/YYYY'}
                      onChange={(e) => handleValidationChange('dateFormat', e.target.value)}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (European - Default)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                    </Form.Select>
                    <Form.Text className="text-muted">
                      This defines how the date will be displayed to users
                    </Form.Text>
                  </Form.Group>
                  <Row>
                    <Col>
                      <Form.Group className="mb-2">
                        <Form.Label>Minimum Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={validationRules.min_date || ''}
                          onChange={(e) => handleValidationChange('min_date', e.target.value || null)}
                        />
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group className="mb-2">
                        <Form.Label>Maximum Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={validationRules.max_date || ''}
                          onChange={(e) => handleValidationChange('max_date', e.target.value || null)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </>
              )}

              {selectedFieldType === 'boolean' && (
                <Form.Text className="text-muted">
                  Boolean fields don't require additional validation
                </Form.Text>
              )}
            </Card.Body>
          </Card>
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Display Order</Form.Label>
                <Form.Control
                  type="number"
                  {...register('display_order')}
                  isInvalid={!!errors.display_order}
                  placeholder="0"
                  min="0"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.display_order?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Required Field"
                  {...register('is_required')}
                  className="mt-4"
                />
                <Form.Check
                  type="checkbox"
                  label="Active"
                  {...register('is_active')}
                />
                <Form.Check
                  type="checkbox"
                  label={t('customFields.showInOverview', 'Show in Overview')}
                  {...register('show_in_basic_info')}
                />
                <Form.Text className="text-muted d-block mb-3">
                  {t('customFields.showInOverviewHelp', 'If checked, this field will be displayed in the Overview tab')}
                </Form.Text>

                <Form.Check
                  type="checkbox"
                  label="Show in List View"
                  {...register('show_in_list')}
                />
                <Form.Text className="text-muted d-block">
                  If checked, this field will appear as a column in patient list (max 5 fields)
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
              </div>
            </Tab>

            <Tab
              eventKey="translations"
              title="🌍 Translations"
              disabled={!isEditing}
            >
              <div className="pt-2">
                {isEditing ? (
                  <TranslationEditor
                    entityType="field_definition"
                    entityId={definition.id}
                    originalValues={{
                      field_label: definition.field_label,
                      help_text: definition.help_text
                    }}
                  />
                ) : (
                  <Alert variant="info">
                    ℹ️ Save the field definition first to add translations.
                  </Alert>
                )}
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              isEditing ? t('customFields.updateField', 'Update Field') : t('customFields.createField', 'Create Field')
            )}
          </Button>
        </Modal.Footer>
      </Form>

      {/* Modal for adding dropdown options */}
      <Modal
        show={showAddOptionModal}
        onHide={handleCancelAddOption}
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title>{t('customFields.addOption', 'Add Option')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>{t('customFields.optionValue', 'Option Value')}</Form.Label>
            <Form.Control
              type="text"
              value={newOptionValue}
              onChange={(e) => setNewOptionValue(e.target.value)}
              placeholder={t('customFields.enterOptionValue', 'Enter option value...')}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmAddOption();
                }
              }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelAddOption}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmAddOption}
            disabled={!newOptionValue.trim()}
          >
            {t('common.add', 'Add')}
          </Button>
        </Modal.Footer>
      </Modal>
    </Modal>
  );
};

export default CustomFieldDefinitionModal;
