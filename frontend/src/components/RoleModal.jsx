/**
 * RoleModal Component
 * Create and edit role with permission and menu assignment
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import roleService from '../services/roleService';
import sidebarMenuConfigService from '../services/sidebarMenuConfigService';
import PermissionTree from './PermissionTree';
import RoleMenuAccess from './RoleMenuAccess';

/**
 * Normalize a role name the same way as the backend:
 * uppercase, no accents, spaces/hyphens -> underscore.
 */
export const normalizeRoleName = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[\s-]+/g, '_');

// Validation schema
const roleSchema = (t) => yup.object().shape({
  name: yup.string()
    .transform(value => normalizeRoleName(value).replace(/^_+|_+$/g, ''))
    .required(t('forms.required', 'Required'))
    .matches(/^[A-Z][A-Z0-9_]{1,49}$/, t('roles.nameInvalid', 'Use 2 to 50 letters, digits or underscores, starting with a letter')),
  description: yup.string()
    .max(500, t('forms.maxLength', 'Maximum {count} characters', { count: 500 })),
  data_scope: yup.string().oneOf(['all', 'own'])
});

const RoleModal = ({ show, onHide, mode, role, onSave }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [menuConfigs, setMenuConfigs] = useState([]);
  const [selectedMenuItems, setSelectedMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [homePage, setHomePage] = useState('');

  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const isSystemRole = isEditMode && !!role?.is_system;
  // ADMIN always sees every menu entry
  const canConfigureMenu = !(isEditMode && role?.name === 'ADMIN');

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

  // Load sidebar entries and the ones already visible to the role
  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    const roleId = isEditMode ? role?.id : null;
    setLoadingMenu(true);
    setSelectedMenuItems([]);
    Promise.all([
      sidebarMenuConfigService.getAllConfigs(),
      roleId && role?.name !== 'ADMIN' ? roleService.getRoleMenuItems(roleId) : Promise.resolve([])
    ])
      .then(([configs, itemKeys]) => {
        if (cancelled) return;
        setMenuConfigs(Array.isArray(configs) ? configs : []);
        setSelectedMenuItems(itemKeys);
      })
      .catch(err => {
        console.error('Error fetching role menu:', err);
        if (!cancelled) setError(t('roles.failedToLoadMenu', 'Failed to load menu entries'));
      })
      .finally(() => { if (!cancelled) setLoadingMenu(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t is only used for the error message
  }, [show, isEditMode, role?.id, role?.name]);

  // Reset form and selected permissions when modal shows
  useEffect(() => {
    if (show) {
      if (role && isEditMode) {
        reset({
          name: role.name,
          description: role.description || '',
          data_scope: role.data_scope || 'own'
        });
        // Set selected permissions from role
        const rolePermissionIds = role.permissions?.map(p => p.id) || [];
        setSelectedPermissions(rolePermissionIds);
        setHomePage(role.home_page || '');
      } else {
        reset({
          name: '',
          description: '',
          data_scope: 'all'
        });
        setSelectedPermissions([]);
        setHomePage('');
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

      // System roles keep their name and data scope (hard-wired behaviour)
      const homePageField = canConfigureMenu ? { home_page: homePage || null } : {};
      const payload = isSystemRole
        ? { description: data.description, ...homePageField }
        : { ...data, ...homePageField };

      if (isCreateMode) {
        // Create role
        const createResponse = await roleService.createRole(payload);
        const newRole = createResponse.data.data || createResponse.data;

        // Assign permissions to new role
        if (selectedPermissions.length > 0) {
          await roleService.updateRolePermissions(newRole.id, selectedPermissions);
        }

        if (selectedMenuItems.length > 0) {
          await roleService.updateRoleMenuItems(newRole.id, selectedMenuItems);
          sidebarMenuConfigService.clearSidebarCache();
        }

        onSave(newRole);
      } else {
        // Update role
        const updateResponse = await roleService.updateRole(role.id, payload);

        // Update permissions
        await roleService.updateRolePermissions(role.id, selectedPermissions);

        if (canConfigureMenu) {
          await roleService.updateRoleMenuItems(role.id, selectedMenuItems);
        }
        sidebarMenuConfigService.clearSidebarCache();

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
      size="xl" fullscreen="md-down"
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {isCreateMode ? t('roles.createRole', 'Create Role') : t('roles.editRole', 'Edit Role')}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
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
<Form.Control
                  type="text"
                  {...register('name', {
                    onChange: (e) => { e.target.value = normalizeRoleName(e.target.value); }
                  })}
                  isInvalid={!!errors.name}
                  readOnly={isSystemRole}
                  maxLength={50}
                  placeholder={t('roles.namePlaceholder', 'e.g. ACCOUNTANT')}
                  autoFocus={isCreateMode}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.name?.message}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  {isSystemRole
                    ? t('roles.systemRoleLocked', 'System role: its name cannot be changed')
                    : t('roles.nameHint', 'Automatically converted to uppercase; must not already exist')}
                </Form.Text>
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

              {!isSystemRole && (
                <Form.Group className="mb-3">
                  <Form.Label>{t('roles.dataScope', 'Data visibility')}</Form.Label>
                  <Form.Select {...register('data_scope')} aria-label={t('roles.dataScope', 'Data visibility')}>
                    <option value="all">{t('roles.dataScopeAll', 'Whole practice (all patients, invoices, expenses)')}</option>
                    <option value="own">{t('roles.dataScopeOwn', 'Own data only (linked patients, own expenses)')}</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {t('roles.dataScopeHint', 'Permissions decide which features are available; visibility decides whose data appears in them.')}
                  </Form.Text>
                </Form.Group>
              )}
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

            {/* Menu Tab */}
            {canConfigureMenu && (
              <Tab
                eventKey="menu"
                title={
                  <>
                    {t('roles.menu', 'Menu')}
                    {selectedMenuItems.length > 0 && (
                      <span className="ms-2 badge bg-primary">{selectedMenuItems.length}</span>
                    )}
                  </>
                }
              >
                {loadingMenu ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" size="sm" />
                  </div>
                ) : (
                  <RoleMenuAccess
                    configs={menuConfigs}
                    selected={selectedMenuItems}
                    onChange={setSelectedMenuItems}
                    homePage={homePage}
                    onHomePageChange={setHomePage}
                  />
                )}
              </Tab>
            )}
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
