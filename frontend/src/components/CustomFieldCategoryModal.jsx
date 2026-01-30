/**
 * CustomFieldCategoryModal Component
 * Create/Edit modal for custom field categories
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, Row, Col, Badge, Tabs, Tab } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { HexColorPicker } from 'react-colorful';
import { useTranslation } from 'react-i18next';
import customFieldService from '../services/customFieldService';
import visitTypeService from '../services/visitTypeService';
import TranslationEditor from './TranslationEditor';

// Validation schema
const categorySchema = (t) => yup.object().shape({
  name: yup.string()
    .required(t('forms.required'))
    .min(1, t('forms.minLength', { count: 1 }))
    .max(100, t('forms.maxLength', { count: 100 })),
  description: yup.string()
    .max(500, t('forms.maxLength', { count: 500 }))
    .nullable(),
  display_order: yup.number()
    .typeError(t('forms.mustBeNumber'))
    .integer(t('forms.mustBeInteger'))
    .min(0, t('forms.minValue', { value: 0 }))
    .nullable(),
  color: yup.string()
    .matches(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (must be hex: #RRGGBB)')
    .required('Color is required')
});

const CustomFieldCategoryModal = ({ show, onHide, category, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [color, setColor] = useState('#3498db');
  const [entityTypes, setEntityTypes] = useState(['patient']);
  const [activeTab, setActiveTab] = useState('general');
  const [visitTypes, setVisitTypes] = useState([]);
  const [selectedVisitTypes, setSelectedVisitTypes] = useState(null); // null = all types
  const [displayLayout, setDisplayLayout] = useState({ type: 'columns', columns: 1 });

  const isEditing = !!category;

  // Fetch visit types on mount
  useEffect(() => {
    const fetchVisitTypes = async () => {
      try {
        const response = await visitTypeService.getAllVisitTypes({ is_active: true });
        setVisitTypes(response?.data || []);
      } catch (err) {
        console.error('Error fetching visit types:', err);
      }
    };
    fetchVisitTypes();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm({
    resolver: yupResolver(categorySchema(t)),
    defaultValues: {
      name: '',
      description: '',
      display_order: 0,
      is_active: true,
      color: '#3498db'
    }
  });

  // Reset form when category changes or modal opens
  useEffect(() => {
    if (category) {
      const categoryColor = category.color || '#3498db';
      const categoryEntityTypes = category.entity_types || ['patient'];
      const categoryVisitTypes = category.visit_types || null;
      const categoryDisplayLayout = category.display_layout || { type: 'columns', columns: 1 };
      setColor(categoryColor);
      setEntityTypes(categoryEntityTypes);
      setSelectedVisitTypes(categoryVisitTypes);
      setDisplayLayout(categoryDisplayLayout);
      reset({
        name: category.name || '',
        description: category.description || '',
        display_order: category.display_order || 0,
        is_active: category.is_active !== undefined ? category.is_active : true,
        color: categoryColor
      });
    } else {
      setColor('#3498db');
      setEntityTypes(['patient']);
      setSelectedVisitTypes(null);
      setDisplayLayout({ type: 'columns', columns: 1 });
      reset({
        name: '',
        description: '',
        display_order: 0,
        is_active: true,
        color: '#3498db'
      });
    }
  }, [category, reset]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Validate entity_types manually
      if (!entityTypes || entityTypes.length === 0) {
        setError('At least one entity type must be selected');
        setLoading(false);
        return;
      }

      // Add entity_types, visit_types, and display_layout manually since they're not in the form
      const submitData = {
        ...data,
        entity_types: entityTypes,
        visit_types: selectedVisitTypes,
        display_layout: displayLayout
      };

      if (isEditing) {
        await customFieldService.updateCategory(category.id, submitData);
      } else {
        await customFieldService.createCategory(submitData);
      }

      setSuccess(true);
      reset();

      setTimeout(() => {
        onSuccess();
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Error saving category:', err);
      setError(err.response?.data?.error || t('errors.failedToSaveCategory'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setSuccess(false);
    setEntityTypes(['patient']);
    setSelectedVisitTypes(null);
    setDisplayLayout({ type: 'columns', columns: 1 });
    onHide();
  };

  const handleColorChange = (newColor) => {
    setColor(newColor);
    setValue('color', newColor, { shouldValidate: true });
  };

  const resetToDefaultColor = () => {
    handleColorChange('#3498db');
  };

  const handleEntityTypeChange = (type) => {
    let newEntityTypes;
    if (entityTypes.includes(type)) {
      // Remove the type
      newEntityTypes = entityTypes.filter(t => t !== type);
      // Ensure at least one type is selected
      if (newEntityTypes.length === 0) {
        return; // Don't allow deselecting all types
      }
    } else {
      // Add the type
      newEntityTypes = [...entityTypes, type];
    }
    setEntityTypes(newEntityTypes);
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl" fullscreen="md-down" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? '✏️ Edit Category' : '➕ Create Category'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          {/* Hidden input for color */}
          <input type="hidden" {...register('color')} />

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              Category {isEditing ? 'updated' : 'created'} successfully!
            </Alert>
          )}

          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            <Tab eventKey="general" title="📝 General">
              <div className="pt-2">

          <Form.Group className="mb-3">
            <Form.Label>Name *</Form.Label>
            <Form.Control
              type="text"
              {...register('name')}
              isInvalid={!!errors.name}
              placeholder="Enter category name"
              autoFocus
            />
            <Form.Control.Feedback type="invalid">
              {errors.name?.message}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              {...register('description')}
              isInvalid={!!errors.description}
              placeholder="Enter description (optional)"
            />
            <Form.Control.Feedback type="invalid">
              {errors.description?.message}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Max 500 characters
            </Form.Text>
          </Form.Group>

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
            <Form.Text className="text-muted">
              Lower numbers appear first
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Applies to: *</Form.Label>
            <div className="d-flex flex-column gap-2">
              <Form.Check
                type="checkbox"
                id="entity-type-patient"
                label="👤 Patients"
                checked={entityTypes.includes('patient')}
                onChange={() => handleEntityTypeChange('patient')}
              />
              <Form.Check
                type="checkbox"
                id="entity-type-visit"
                label="📅 Visits"
                checked={entityTypes.includes('visit')}
                onChange={() => handleEntityTypeChange('visit')}
              />
            </div>
            {errors.entity_types && (
              <div className="text-danger small mt-1">
                {errors.entity_types.message}
              </div>
            )}
            <Form.Text className="text-muted d-block mt-2">
              <strong>Patient-only:</strong> Static data (family situation, medical history)<br />
              <strong>Visit-only:</strong> Dynamic measurements (weight, blood pressure this visit)<br />
              <strong>Both:</strong> Common fields needed in both contexts (notes, observations)
            </Form.Text>
          </Form.Group>

          {/* Visit Types Filter - Only show if visit is selected */}
          {entityTypes.includes('visit') && (
            <Form.Group className="mb-3">
              <Form.Label>{t('customFields.visitTypesFilter', 'Visible for Visit Types')}</Form.Label>
              <div className="mb-2">
                <Form.Check
                  type="radio"
                  id="visit-types-all"
                  name="visitTypesMode"
                  label={t('customFields.allVisitTypes', 'All visit types')}
                  checked={selectedVisitTypes === null}
                  onChange={() => setSelectedVisitTypes(null)}
                />
                <Form.Check
                  type="radio"
                  id="visit-types-specific"
                  name="visitTypesMode"
                  label={t('customFields.specificVisitTypes', 'Specific visit types only')}
                  checked={selectedVisitTypes !== null}
                  onChange={() => setSelectedVisitTypes([])}
                />
              </div>
              {selectedVisitTypes !== null && (
                <div className="ps-4 border-start">
                  {visitTypes.length === 0 ? (
                    <Alert variant="info" className="py-2 mb-0">
                      {t('customFields.noVisitTypesAvailable', 'No visit types available. Create visit types first.')}
                    </Alert>
                  ) : (
                    <div className="d-flex flex-column gap-1">
                      {visitTypes.map((vt) => (
                        <Form.Check
                          key={vt.id}
                          type="checkbox"
                          id={`visit-type-${vt.id}`}
                          label={
                            <span>
                              {vt.color && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: vt.color,
                                    marginRight: '6px'
                                  }}
                                />
                              )}
                              {vt.name}
                            </span>
                          }
                          checked={selectedVisitTypes?.includes(vt.id) || false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVisitTypes([...(selectedVisitTypes || []), vt.id]);
                            } else {
                              setSelectedVisitTypes((selectedVisitTypes || []).filter(id => id !== vt.id));
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              <Form.Text className="text-muted d-block mt-2">
                {t('customFields.visitTypesHelp', 'Choose which visit types should display this category. If "All visit types" is selected, this category appears on every visit.')}
              </Form.Text>
            </Form.Group>
          )}

          {/* Display Layout Options - Only show if visit is selected */}
          {entityTypes.includes('visit') && (
            <Form.Group className="mb-3">
              <Form.Label>{t('customFields.displayLayout', 'Display Layout')}</Form.Label>
              <Row>
                <Col xs={12} md={6}>
                  <Form.Select
                    value={displayLayout.type}
                    onChange={(e) => setDisplayLayout({
                      ...displayLayout,
                      type: e.target.value,
                      columns: e.target.value === 'columns' ? (displayLayout.columns || 1) : undefined
                    })}
                  >
                    <option value="columns">{t('customFields.layoutColumns', 'Columns')}</option>
                    <option value="list">{t('customFields.layoutList', 'List')}</option>
                    <option value="radar">{t('customFields.layoutRadar', 'Radar Chart')}</option>
                  </Form.Select>
                </Col>
                {displayLayout.type === 'columns' && (
                  <Col xs={12} md={6} className="mt-2 mt-md-0">
                    <div className="d-flex align-items-center gap-2">
                      <Form.Label className="mb-0 text-nowrap">
                        {t('customFields.numberOfColumns', 'Columns:')}
                      </Form.Label>
                      <Form.Range
                        min={1}
                        max={6}
                        value={displayLayout.columns || 1}
                        onChange={(e) => setDisplayLayout({
                          ...displayLayout,
                          columns: parseInt(e.target.value, 10)
                        })}
                        style={{ flex: 1 }}
                      />
                      <Badge bg="primary" style={{ minWidth: '30px' }}>
                        {displayLayout.columns || 1}
                      </Badge>
                    </div>
                  </Col>
                )}
              </Row>
              <Form.Text className="text-muted d-block mt-2">
                {displayLayout.type === 'columns'
                  ? t('customFields.columnsLayoutHelp', 'Fields will be displayed in {{count}} column(s). More columns work better on larger screens.', { count: displayLayout.columns || 1 })
                  : displayLayout.type === 'radar'
                  ? t('customFields.radarLayoutHelp', 'Fields will be displayed as a radar chart in view mode. In edit mode, a standard form will be displayed.')
                  : t('customFields.listLayoutHelp', 'Fields will be displayed as a vertical list.')}
              </Form.Text>
              {/* Preview */}
              {displayLayout.type === 'columns' && (
                <div className="mt-2 p-2 border rounded bg-light">
                  <small className="text-muted d-block mb-1">{t('customFields.layoutPreview', 'Preview:')}</small>
                  <Row>
                    {[...Array(displayLayout.columns || 1)].map((_, i) => (
                      <Col key={i} md={12 / (displayLayout.columns || 1)}>
                        <div className="border rounded p-2 mb-1 bg-white text-center text-muted" style={{ fontSize: '12px' }}>
                          {t('customFields.columnN', 'Column {{n}}', { n: i + 1 })}
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Category Color</Form.Label>
            <Row className="align-items-center">
              <Col xs={12} md={6}>
                <div style={{ width: '100%', maxWidth: '200px' }}>
                  <HexColorPicker color={color} onChange={handleColorChange} />
                </div>
              </Col>
              <Col xs={12} md={6} className="mt-3 mt-md-0">
                <div className="d-flex flex-column gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <Badge
                      bg=""
                      style={{
                        backgroundColor: color,
                        color: '#fff',
                        padding: '10px 20px',
                        fontSize: '14px'
                      }}
                    >
                      {color}
                    </Badge>
                  </div>
                  <Form.Control
                    type="text"
                    value={color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    isInvalid={!!errors.color}
                    placeholder="#3498db"
                    maxLength={7}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.color?.message}
                  </Form.Control.Feedback>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={resetToDefaultColor}
                  >
                    🔄 Reset to Default
                  </Button>
                </div>
              </Col>
            </Row>
            <Form.Text className="text-muted d-block mt-2">
              This color will be used for tabs and visual organization
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Active"
              {...register('is_active')}
            />
            <Form.Text className="text-muted">
              Inactive categories are hidden from users
            </Form.Text>
          </Form.Group>
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
                    entityType="category"
                    entityId={category.id}
                    originalValues={{
                      name: category.name,
                      description: category.description
                    }}
                  />
                ) : (
                  <Alert variant="info">
                    ℹ️ Save the category first to add translations.
                  </Alert>
                )}
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              isEditing ? 'Update Category' : 'Create Category'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CustomFieldCategoryModal;
