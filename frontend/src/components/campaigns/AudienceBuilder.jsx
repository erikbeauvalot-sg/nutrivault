/**
 * Audience Builder Component
 * Visual builder for constructing audience segmentation criteria
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, Form, Button, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as campaignService from '../../services/campaignService';

const AudienceBuilder = ({ value, onChange }) => {
  const { t } = useTranslation();

  // State
  const [segmentFields, setSegmentFields] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conditions, setConditions] = useState(value?.conditions || []);
  const [logic, setLogic] = useState(value?.logic || 'AND');

  // Load segment fields
  const loadSegmentFields = useCallback(async () => {
    try {
      setLoading(true);
      const data = await campaignService.getSegmentFields();
      setSegmentFields(data);
    } catch (error) {
      console.error('Error loading segment fields:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSegmentFields();
  }, [loadSegmentFields]);

  // Sync external value
  useEffect(() => {
    if (value) {
      setConditions(value.conditions || []);
      setLogic(value.logic || 'AND');
    }
  }, [value]);

  // Emit changes
  useEffect(() => {
    const newValue = { conditions, logic };
    onChange?.(newValue);
  }, [conditions, logic]);

  // Field definitions
  const getFieldDef = (fieldKey) => {
    return segmentFields?.fields?.find(f => f.key === fieldKey);
  };

  // Get operators for a field
  const getOperators = (fieldKey) => {
    const fieldDef = getFieldDef(fieldKey);
    if (!fieldDef) return [];

    const operatorLabels = {
      equals: t('campaigns.operators.equals', 'is'),
      not_equals: t('campaigns.operators.notEquals', 'is not'),
      in: t('campaigns.operators.in', 'is one of'),
      not_in: t('campaigns.operators.notIn', 'is not one of'),
      contains: t('campaigns.operators.contains', 'contains'),
      not_contains: t('campaigns.operators.notContains', 'does not contain'),
      greater_than: t('campaigns.operators.greaterThan', 'is greater than'),
      less_than: t('campaigns.operators.lessThan', 'is less than'),
      before: t('campaigns.operators.before', 'is before'),
      after: t('campaigns.operators.after', 'is after'),
      between: t('campaigns.operators.between', 'is between')
    };

    return fieldDef.operators.map(op => ({
      value: op,
      label: operatorLabels[op] || op
    }));
  };

  // Add condition
  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: 'is_active', operator: 'equals', value: true }
    ]);
  };

  // Remove condition
  const removeCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  // Update condition
  const updateCondition = (index, updates) => {
    setConditions(conditions.map((c, i) => {
      if (i !== index) return c;

      const newCondition = { ...c, ...updates };

      // Reset value when field or operator changes
      if (updates.field && updates.field !== c.field) {
        const fieldDef = getFieldDef(updates.field);
        if (fieldDef?.type === 'boolean') {
          newCondition.value = true;
          newCondition.operator = 'equals';
        } else {
          newCondition.value = '';
          const operators = getOperators(updates.field);
          if (operators.length > 0 && !operators.find(op => op.value === newCondition.operator)) {
            newCondition.operator = operators[0].value;
          }
        }
      }

      return newCondition;
    }));
  };

  // Render value input based on field type
  const renderValueInput = (condition, index) => {
    const fieldDef = getFieldDef(condition.field);
    if (!fieldDef) return null;

    switch (fieldDef.type) {
      case 'boolean':
        return (
          <Form.Select
            value={condition.value === true ? 'true' : 'false'}
            onChange={(e) => updateCondition(index, { value: e.target.value === 'true' })}
          >
            <option value="true">{t('common.yes', 'Yes')}</option>
            <option value="false">{t('common.no', 'No')}</option>
          </Form.Select>
        );

      case 'string':
        // Check if we have predefined options
        if (fieldDef.options) {
          return (
            <Form.Select
              value={condition.value}
              onChange={(e) => updateCondition(index, { value: e.target.value })}
            >
              <option value="">{t('common.select', 'Select...')}</option>
              {fieldDef.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </Form.Select>
          );
        }

        // Check for dietitian field
        if (condition.field === 'assigned_dietitian_id') {
          return (
            <Form.Select
              value={condition.value}
              onChange={(e) => updateCondition(index, { value: e.target.value })}
            >
              <option value="">{t('campaigns.anyDietitian', 'Any dietitian')}</option>
              {segmentFields?.dietitians?.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Form.Select>
          );
        }

        return (
          <Form.Control
            type="text"
            value={condition.value}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            placeholder={t('campaigns.enterValue', 'Enter value...')}
          />
        );

      case 'number':
        if (condition.operator === 'between') {
          return (
            <Row className="g-2">
              <Col>
                <Form.Control
                  type="number"
                  value={condition.value?.[0] || ''}
                  onChange={(e) => updateCondition(index, {
                    value: [e.target.value, condition.value?.[1] || '']
                  })}
                  placeholder={t('campaigns.min', 'Min')}
                />
              </Col>
              <Col>
                <Form.Control
                  type="number"
                  value={condition.value?.[1] || ''}
                  onChange={(e) => updateCondition(index, {
                    value: [condition.value?.[0] || '', e.target.value]
                  })}
                  placeholder={t('campaigns.max', 'Max')}
                />
              </Col>
            </Row>
          );
        }
        return (
          <Form.Control
            type="number"
            value={condition.value}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            placeholder={t('campaigns.enterNumber', 'Enter number...')}
          />
        );

      case 'date':
        if (condition.operator === 'between') {
          return (
            <Row className="g-2">
              <Col>
                <Form.Control
                  type="date"
                  value={condition.value?.[0] || ''}
                  onChange={(e) => updateCondition(index, {
                    value: [e.target.value, condition.value?.[1] || '']
                  })}
                />
              </Col>
              <Col>
                <Form.Control
                  type="date"
                  value={condition.value?.[1] || ''}
                  onChange={(e) => updateCondition(index, {
                    value: [condition.value?.[0] || '', e.target.value]
                  })}
                />
              </Col>
            </Row>
          );
        }
        return (
          <Form.Control
            type="date"
            value={condition.value}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
          />
        );

      case 'array':
        // For tags
        if (condition.field === 'tags') {
          return (
            <Form.Select
              value={condition.value}
              onChange={(e) => updateCondition(index, { value: e.target.value })}
            >
              <option value="">{t('campaigns.selectTag', 'Select tag...')}</option>
              {segmentFields?.tags?.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </Form.Select>
          );
        }
        return (
          <Form.Control
            type="text"
            value={condition.value}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            placeholder={t('campaigns.enterValue', 'Enter value...')}
          />
        );

      default:
        return (
          <Form.Control
            type="text"
            value={condition.value}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            placeholder={t('campaigns.enterValue', 'Enter value...')}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" />
        <p className="mt-2 text-muted small">{t('common.loading', 'Loading...')}</p>
      </div>
    );
  }

  return (
    <div className="audience-builder">
      {/* Logic selector */}
      {conditions.length > 1 && (
        <div className="mb-3">
          <Form.Label className="small text-muted">
            {t('campaigns.matchConditions', 'Match patients who meet')}
          </Form.Label>
          <Form.Select
            value={logic}
            onChange={(e) => setLogic(e.target.value)}
            className="w-auto"
          >
            <option value="AND">{t('campaigns.allConditions', 'ALL conditions (AND)')}</option>
            <option value="OR">{t('campaigns.anyCondition', 'ANY condition (OR)')}</option>
          </Form.Select>
        </div>
      )}

      {/* Conditions */}
      <div className="conditions-list">
        {conditions.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-funnel display-6 d-block mb-2"></i>
            <p>{t('campaigns.noConditions', 'No conditions defined. Add a condition to filter your audience.')}</p>
          </div>
        ) : (
          conditions.map((condition, index) => (
            <Card key={index} className="mb-2 border-0 bg-light">
              <Card.Body className="py-2">
                <Row className="align-items-center g-2">
                  {/* Field selector */}
                  <Col md={3}>
                    <Form.Select
                      size="sm"
                      value={condition.field}
                      onChange={(e) => updateCondition(index, { field: e.target.value })}
                    >
                      {segmentFields?.fields?.map(field => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  {/* Operator selector */}
                  <Col md={3}>
                    <Form.Select
                      size="sm"
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, { operator: e.target.value })}
                    >
                      {getOperators(condition.field).map(op => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  {/* Value input */}
                  <Col md={5}>
                    {renderValueInput(condition, index)}
                  </Col>

                  {/* Remove button */}
                  <Col md={1} className="text-end">
                    <Button
                      variant="link"
                      className="text-danger p-0"
                      onClick={() => removeCondition(index)}
                    >
                      <i className="bi bi-x-lg"></i>
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ))
        )}
      </div>

      {/* Add condition button */}
      <Button
        variant="outline-primary"
        size="sm"
        onClick={addCondition}
        className="mt-2"
      >
        <i className="bi bi-plus-lg me-2"></i>
        {t('campaigns.addCondition', 'Add Condition')}
      </Button>

      {/* Quick filters */}
      <div className="mt-4">
        <small className="text-muted d-block mb-2">{t('campaigns.quickFilters', 'Quick filters:')}</small>
        <div className="d-flex flex-wrap gap-2">
          <Badge
            bg="light"
            text="dark"
            className="cursor-pointer"
            style={{ cursor: 'pointer' }}
            onClick={() => setConditions([
              { field: 'is_active', operator: 'equals', value: true },
              { field: 'appointment_reminders_enabled', operator: 'equals', value: true }
            ])}
          >
            {t('campaigns.quickFilter.activePatients', 'Active patients')}
          </Badge>
          <Badge
            bg="light"
            text="dark"
            className="cursor-pointer"
            style={{ cursor: 'pointer' }}
            onClick={() => setConditions([
              { field: 'is_active', operator: 'equals', value: true },
              { field: 'language_preference', operator: 'equals', value: 'fr' }
            ])}
          >
            {t('campaigns.quickFilter.frenchSpeaking', 'French-speaking')}
          </Badge>
          <Badge
            bg="light"
            text="dark"
            className="cursor-pointer"
            style={{ cursor: 'pointer' }}
            onClick={() => setConditions([
              { field: 'is_active', operator: 'equals', value: true },
              { field: 'last_visit_date', operator: 'after', value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
            ])}
          >
            {t('campaigns.quickFilter.recentVisitors', 'Recent visitors (90 days)')}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default AudienceBuilder;
