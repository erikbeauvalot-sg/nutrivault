/**
 * CustomFieldDefinitionDetailPage Component
 * View page for a custom field definition
 * Shows field details and configuration
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Alert, Spinner, Badge, Button, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import customFieldService from '../services/customFieldService';
import CustomFieldDefinitionModal from '../components/CustomFieldDefinitionModal';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';

const CustomFieldDefinitionDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [definition, setDefinition] = useState(null);
  const [categories, setCategories] = useState([]);

  // Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [categoriesRes, definitionsRes] = await Promise.all([
        customFieldService.getCategories(),
        customFieldService.getDefinitions()
      ]);

      const allCategories = categoriesRes || [];
      const allDefs = definitionsRes || [];

      // Find the definition
      const foundDef = allDefs.find(d => d.id === id);
      if (!foundDef) {
        setError(t('customFields.fieldNotFound', 'Field definition not found'));
        setLoading(false);
        return;
      }

      setDefinition(foundDef);
      setCategories(allCategories);
    } catch (err) {
      console.error('Error fetching field data:', err);
      setError(err.response?.data?.error || err.message || t('customFields.failedToLoad', 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleDuplicate = async () => {
    try {
      setLoading(true);
      const duplicatedDefinition = await customFieldService.duplicateDefinition(id);
      navigate(`/settings/custom-fields/definitions/${duplicatedDefinition.id}/view`);
    } catch (err) {
      console.error('Error duplicating definition:', err);
      setError(err.response?.data?.error || t('customFields.duplicateError', 'Failed to duplicate field'));
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteDefinition = async () => {
    try {
      await customFieldService.deleteDefinition(id);
      navigate('/settings/custom-fields');
    } catch (err) {
      console.error('Error deleting definition:', err);
      setError(err.response?.data?.error || t('customFields.deleteFieldError', 'Failed to delete field'));
    }
  };

  const getFieldTypeIcon = (type) => {
    const icons = {
      text: '📝',
      textarea: '📄',
      number: '🔢',
      date: '📅',
      select: '📋',
      boolean: '☑️',
      calculated: '🧮',
      separator: '➖',
      blank: '⬜'
    };
    return icons[type] || '❓';
  };

  const getFieldTypeBadgeVariant = (type) => {
    const variants = {
      text: 'primary',
      textarea: 'info',
      number: 'success',
      date: 'warning',
      select: 'secondary',
      boolean: 'dark',
      calculated: 'danger',
      separator: 'light',
      blank: 'light'
    };
    return variants[type] || 'secondary';
  };

  if (loading) {
    return (
      <Layout>
        <Container className="mt-4 text-center">
          <Spinner animation="border" />
          <p>{t('common.loading', 'Loading...')}</p>
        </Container>
      </Layout>
    );
  }

  if (error || !definition) {
    return (
      <Layout>
        <Container className="mt-4">
          <Alert variant="danger">
            {error || t('customFields.fieldNotFound', 'Field definition not found')}
          </Alert>
          <Button variant="secondary" onClick={() => navigate('/settings/custom-fields')}>
            ← {t('common.back', 'Back')}
          </Button>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="mt-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <Button
                  variant="link"
                  className="p-0 mb-2"
                  onClick={() => navigate('/settings/custom-fields')}
                >
                  ← {t('customFields.backToList', 'Back to Custom Fields')}
                </Button>
                <h1>
                  {getFieldTypeIcon(definition.field_type)} {definition.field_label}
                </h1>
                <p className="text-muted">
                  <code>{definition.field_name}</code>
                </p>
              </div>
              <div className="d-flex gap-2">
                <Button variant="outline-success" onClick={handleDuplicate} disabled={loading}>
                  📋 {t('common.duplicate', 'Duplicate')}
                </Button>
                <Button variant="outline-primary" onClick={handleEdit}>
                  ✏️ {t('common.edit', 'Edit')}
                </Button>
                <Button variant="outline-danger" onClick={handleDelete}>
                  🗑️ {t('common.delete', 'Delete')}
                </Button>
              </div>
            </div>
          </Col>
        </Row>

        {/* Field Info Card */}
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">{t('customFields.fieldInfo', 'Field Information')}</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <dl className="row mb-0">
                  <dt className="col-sm-4">{t('customFields.fieldName', 'Field Name')}</dt>
                  <dd className="col-sm-8"><code>{definition.field_name}</code></dd>

                  <dt className="col-sm-4">{t('customFields.fieldLabel', 'Label')}</dt>
                  <dd className="col-sm-8"><strong>{definition.field_label}</strong></dd>

                  <dt className="col-sm-4">{t('customFields.fieldType', 'Type')}</dt>
                  <dd className="col-sm-8">
                    <Badge bg={getFieldTypeBadgeVariant(definition.field_type)}>
                      {getFieldTypeIcon(definition.field_type)} {definition.field_type}
                    </Badge>
                  </dd>

                  <dt className="col-sm-4">{t('customFields.category', 'Category')}</dt>
                  <dd className="col-sm-8">
                    {definition.category?.name ? (
                      <Button
                        variant="link"
                        className="p-0"
                        onClick={() => navigate(`/settings/custom-fields/categories/${definition.category_id}/view`)}
                      >
                        {definition.category.name}
                      </Button>
                    ) : (
                      <span className="text-muted">{t('common.unknown', 'Unknown')}</span>
                    )}
                  </dd>
                </dl>
              </Col>
              <Col md={6}>
                <dl className="row mb-0">
                  <dt className="col-sm-4">{t('customFields.required', 'Required')}</dt>
                  <dd className="col-sm-8">
                    {definition.is_required ? (
                      <Badge bg="warning" text="dark">{t('common.yes', 'Yes')}</Badge>
                    ) : (
                      <Badge bg="secondary">{t('common.no', 'No')}</Badge>
                    )}
                  </dd>

                  <dt className="col-sm-4">{t('customFields.status', 'Status')}</dt>
                  <dd className="col-sm-8">
                    {definition.is_active ? (
                      <Badge bg="success">{t('common.active', 'Active')}</Badge>
                    ) : (
                      <Badge bg="secondary">{t('common.inactive', 'Inactive')}</Badge>
                    )}
                  </dd>

                  <dt className="col-sm-4">{t('customFields.displayOrder', 'Display Order')}</dt>
                  <dd className="col-sm-8">
                    <Badge bg="light" text="dark">{definition.display_order || 0}</Badge>
                  </dd>

                  <dt className="col-sm-4">{t('customFields.showInOverview', 'Show in Overview')}</dt>
                  <dd className="col-sm-8">
                    {definition.show_in_basic_info ? (
                      <Badge bg="info">{t('common.yes', 'Yes')}</Badge>
                    ) : (
                      <Badge bg="secondary">{t('common.no', 'No')}</Badge>
                    )}
                  </dd>
                </dl>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Help Text Card */}
        {definition.help_text && (
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">{t('customFields.helpText', 'Help Text')}</h5>
            </Card.Header>
            <Card.Body>
              <p className="mb-0">{definition.help_text}</p>
            </Card.Body>
          </Card>
        )}

        {/* Validation Rules Card */}
        {definition.validation_rules && Object.keys(definition.validation_rules).length > 0 && (
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">{t('customFields.validationRules', 'Validation Rules')}</h5>
            </Card.Header>
            <Card.Body>
              <Table striped bordered size="sm">
                <thead>
                  <tr>
                    <th>{t('customFields.rule', 'Rule')}</th>
                    <th>{t('customFields.value', 'Value')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(definition.validation_rules).map(([key, value]) => (
                    <tr key={key}>
                      <td><code>{key}</code></td>
                      <td>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {/* Select Options Card */}
        {definition.field_type === 'select' && definition.select_options && definition.select_options.length > 0 && (
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">{t('customFields.selectOptions', 'Select Options')}</h5>
            </Card.Header>
            <Card.Body>
              <Table striped bordered size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('customFields.optionValue', 'Value')}</th>
                    <th>{t('customFields.optionLabel', 'Label')}</th>
                  </tr>
                </thead>
                <tbody>
                  {definition.select_options.map((option, index) => {
                    const optValue = typeof option === 'string' ? option : option.value;
                    const optLabel = typeof option === 'string' ? option : option.label;
                    return (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td><code>{optValue}</code></td>
                        <td>{optLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {/* Calculated Field Card */}
        {definition.field_type === 'calculated' && definition.formula && (
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">🧮 {t('customFields.calculatedField', 'Calculated Field')}</h5>
            </Card.Header>
            <Card.Body>
              <dl className="row mb-0">
                <dt className="col-sm-3">{t('customFields.formula', 'Formula')}</dt>
                <dd className="col-sm-9">
                  <code className="bg-light p-2 d-block">{definition.formula}</code>
                </dd>

                {definition.decimal_places !== undefined && (
                  <>
                    <dt className="col-sm-3">{t('customFields.decimalPlaces', 'Decimal Places')}</dt>
                    <dd className="col-sm-9">{definition.decimal_places}</dd>
                  </>
                )}

                {definition.dependencies && definition.dependencies.length > 0 && (
                  <>
                    <dt className="col-sm-3">{t('customFields.dependencies', 'Dependencies')}</dt>
                    <dd className="col-sm-9">
                      {definition.dependencies.map((dep, i) => (
                        <Badge key={i} bg="info" className="me-1">{dep}</Badge>
                      ))}
                    </dd>
                  </>
                )}
              </dl>
            </Card.Body>
          </Card>
        )}

        {/* Edit Modal */}
        <CustomFieldDefinitionModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          definition={definition}
          categories={categories}
          onSuccess={() => {
            fetchData();
            setShowEditModal(false);
          }}
        />

        {/* Delete Confirm Modal */}
        <ConfirmModal
          show={showDeleteConfirm}
          onHide={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDeleteDefinition}
          title={t('common.confirmation', 'Confirmation')}
          message={t('customFields.confirmDeleteField', 'Are you sure you want to delete this field definition?')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />
      </Container>
    </Layout>
  );
};

export default CustomFieldDefinitionDetailPage;
