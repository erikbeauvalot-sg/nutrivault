/**
 * RoleModal Component
 * Create and edit role with permission assignment
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import roleService from '../services/roleService';
import PermissionTree from './PermissionTree';

// Validation schema
const roleSchema = (t) => yup.object().shape({
  name: yup.string()
    .required(t('forms.required', 'Required'))
    .oneOf(['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER'], t('roles.nameInvalid', 'Role name must be one of: ADMIN, DIETITIAN, ASSISTANT, VIEWER')),
  description: yup.string()
    .max(500, t('forms.maxLength', 'Maximum {count} characters', { count: 500 }))
});

const RoleModal = ({ show, onHide, mode, role, onSave }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: yupResolver(roleSchema(t))
  });

  // Fetch all permissions on mount
  useEffect(() => {
    if (show) {
      fetchAllPermissions();
    }
  }, [show]);

  // Reset form and selected permissions when modal shows
  useEffect(() => {
    if (show) {
      if (role && isEditMode) {
        reset({
          name: role.name,
          description: role.description || ''
        });
        // Set selected permissions from role
        const rolePermissionIds = role.permissions?.map(p => p.id) || [];
        setSelectedPermissions(rolePermissionIds);
      } else {
        reset({
          name: '',
          description: ''
        });
        setSelectedPermissions([]);
      }
      setError(null);
      setActiveTab('general');
    }
  }, [show, role, reset, isEditMode]);

  const fetchAllPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const response = await roleService.getAllPermissions();
      const data = response.data.data || response.data;
      const permissionsList = Array.isArray(data) ? data : [];
      setAllPermissions(permissionsList);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(err.response?.data?.error || t('roles.failedToLoadPermissions', 'Failed to load permissions'));
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handlePermissionsChange = (permissionIds) => {
    setSelectedPermissions(permissionIds);
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);

      if (isCreateMode) {
        // Create role
        const createResponse = await roleService.createRole(data);
        const newRole = createResponse.data.data || createResponse.data;

        // Assign permissions to new role
        if (selectedPermissions.length > 0) {
          await roleService.updateRolePermissions(newRole.id, selectedPermissions);
        }

        onSave(newRole);
      } else {
        // Update role
        const updateResponse = await roleService.updateRole(role.id, data);

        // Update permissions
        await roleService.updateRolePermissions(role.id, selectedPermissions);

        onSave(updateResponse.data);
      }

      onHide();
    } catch (err) {
      console.error('Error saving role:', err);
      setError(err.response?.data?.error || t('roles.failedToSave', 'Failed to save role'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {isCreateMode ? t('roles.createRole', 'Create Role') : t('roles.editRole', 'Edit Role')}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            {/* General Tab */}
            <Tab eventKey="general" title={t('roles.general', 'General')}>
              <Form.Group className="mb-3">
                <Form.Label>{t('roles.roleName', 'Role Name')} *</Form.Label>
                <Form.Select
                  {...register('name')}
                  isInvalid={!!errors.name}
                  disabled={isEditMode} // Cannot change role name after creation
                >
                  <option value="">{t('roles.selectRole', 'Select role...')}</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="DIETITIAN">DIETITIAN</option>
                  <option value="ASSISTANT">ASSISTANT</option>
                  <option value="VIEWER">VIEWER</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.name?.message}
                </Form.Control.Feedback>
                {isEditMode && (
                  <Form.Text className="text-muted">
                    {t('roles.cannotChangeName', 'Role name cannot be changed after creation')}
                  </Form.Text>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('roles.description', 'Description')}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  {...register('description')}
                  isInvalid={!!errors.description}
                  placeholder={t('roles.descriptionPlaceholder', 'Enter a description for this role...')}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.description?.message}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  {t('roles.maxChars', 'Maximum 500 characters')}
                </Form.Text>
              </Form.Group>
            </Tab>

            {/* Permissions Tab */}
            <Tab
              eventKey="permissions"
              title={
                <>
                  {t('roles.permissions', 'Permissions')}
                  {selectedPermissions.length > 0 && (
                    <span className="ms-2 badge bg-primary">{selectedPermissions.length}</span>
                  )}
                </>
              }
            >
              {loadingPermissions ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" size="sm" />
                  <p className="mt-2 text-muted">{t('roles.loadingPermissions', 'Loading permissions...')}</p>
                </div>
              ) : (
                <PermissionTree
                  permissions={allPermissions}
                  selectedPermissions={selectedPermissions}
                  onChange={handlePermissionsChange}
                />
              )}
            </Tab>
          </Tabs>
        </Modal.Body>

        <Modal.Footer>
          <div className="d-flex justify-content-between w-100">
            <div>
              {selectedPermissions.length > 0 && (
                <small className="text-muted">
                  {t('roles.permissionsSelected', '{count} permission(s) selected', { count: selectedPermissions.length })}
                </small>
              )}
            </div>
            <div>
              <Button variant="secondary" onClick={onHide} disabled={loading} className="me-2">
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('common.saving', 'Saving...')}
                  </>
                ) : (
                  t('common.save', 'Save')
                )}
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RoleModal;
