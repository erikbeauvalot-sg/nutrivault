/**
 * PermissionTree Component
 * Display permissions grouped by resource with checkboxes
 */

import { useState, useEffect } from 'react';
import { Form, Accordion, Badge, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const PermissionTree = ({ permissions, selectedPermissions, onChange }) => {
  const { t } = useTranslation();
  const [groupedPermissions, setGroupedPermissions] = useState({});

  // Group permissions by resource
  useEffect(() => {
    const grouped = permissions.reduce((acc, permission) => {
      const resource = permission.resource;
      if (!acc[resource]) {
        acc[resource] = [];
      }
      acc[resource].push(permission);
      return acc;
    }, {});
    setGroupedPermissions(grouped);
  }, [permissions]);

  // Check if a permission is selected
  const isPermissionSelected = (permissionId) => {
    return selectedPermissions.includes(permissionId);
  };

  // Check if all permissions in a resource are selected
  const isResourceFullySelected = (resource) => {
    const resourcePermissions = groupedPermissions[resource] || [];
    return resourcePermissions.every(p => isPermissionSelected(p.id));
  };

  // Check if some (but not all) permissions in a resource are selected
  const isResourcePartiallySelected = (resource) => {
    const resourcePermissions = groupedPermissions[resource] || [];
    const selectedCount = resourcePermissions.filter(p => isPermissionSelected(p.id)).length;
    return selectedCount > 0 && selectedCount < resourcePermissions.length;
  };

  // Toggle a single permission
  const handlePermissionToggle = (permissionId) => {
    let newSelected;
    if (isPermissionSelected(permissionId)) {
      newSelected = selectedPermissions.filter(id => id !== permissionId);
    } else {
      newSelected = [...selectedPermissions, permissionId];
    }
    onChange(newSelected);
  };

  // Toggle all permissions in a resource
  const handleResourceToggle = (resource) => {
    const resourcePermissions = groupedPermissions[resource] || [];
    const resourcePermissionIds = resourcePermissions.map(p => p.id);

    let newSelected;
    if (isResourceFullySelected(resource)) {
      // Deselect all permissions in this resource
      newSelected = selectedPermissions.filter(id => !resourcePermissionIds.includes(id));
    } else {
      // Select all permissions in this resource
      const currentOtherPermissions = selectedPermissions.filter(id => !resourcePermissionIds.includes(id));
      newSelected = [...currentOtherPermissions, ...resourcePermissionIds];
    }
    onChange(newSelected);
  };

  // Select all permissions
  const handleSelectAll = () => {
    const allPermissionIds = permissions.map(p => p.id);
    onChange(allPermissionIds);
  };

  // Deselect all permissions
  const handleDeselectAll = () => {
    onChange([]);
  };

  // Format permission action for display
  const formatAction = (action) => {
    return action.charAt(0).toUpperCase() + action.slice(1);
  };

  // Format resource name for display
  const formatResource = (resource) => {
    const resourceNames = {
      patients: t('permissions.patients', 'Patients'),
      visits: t('permissions.visits', 'Visits'),
      billing: t('permissions.billing', 'Billing'),
      documents: t('permissions.documents', 'Documents'),
      users: t('permissions.users', 'Users'),
      reports: t('permissions.reports', 'Reports'),
      system: t('permissions.system', 'System')
    };
    return resourceNames[resource] || resource.charAt(0).toUpperCase() + resource.slice(1);
  };

  // Get resource icon
  const getResourceIcon = (resource) => {
    const icons = {
      patients: '👥',
      visits: '📅',
      billing: '💰',
      documents: '📄',
      users: '👤',
      reports: '📊',
      system: '⚙️'
    };
    return icons[resource] || '📦';
  };

  const resourceKeys = Object.keys(groupedPermissions).sort();

  return (
    <div className="permission-tree">
      {/* Select All / Deselect All buttons */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Badge bg="secondary">
            {selectedPermissions.length} / {permissions.length} {t('permissions.selected', 'selected')}
          </Badge>
        </div>
        <div>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={handleSelectAll}
            disabled={selectedPermissions.length === permissions.length}
            className="me-2"
          >
            {t('permissions.selectAll', 'Select All')}
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleDeselectAll}
            disabled={selectedPermissions.length === 0}
          >
            {t('permissions.deselectAll', 'Deselect All')}
          </Button>
        </div>
      </div>

      {/* Accordion for each resource */}
      <Accordion defaultActiveKey={resourceKeys[0]}>
        {resourceKeys.map(resource => {
          const resourcePerms = groupedPermissions[resource];
          const isFullySelected = isResourceFullySelected(resource);
          const isPartiallySelected = isResourcePartiallySelected(resource);
          const selectedCount = resourcePerms.filter(p => isPermissionSelected(p.id)).length;

          return (
            <Accordion.Item eventKey={resource} key={resource}>
              <Accordion.Header>
                <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                  <div>
                    <span className="me-2">{getResourceIcon(resource)}</span>
                    <strong>{formatResource(resource)}</strong>
                  </div>
                  <div>
                    <Badge bg={isFullySelected ? 'success' : isPartiallySelected ? 'warning' : 'secondary'}>
                      {selectedCount} / {resourcePerms.length}
                    </Badge>
                  </div>
                </div>
              </Accordion.Header>
              <Accordion.Body>
                {/* Select/Deselect all for this resource */}
                <Form.Check
                  type="checkbox"
                  id={`resource-${resource}`}
                  label={
                    <strong>
                      {isFullySelected
                        ? t('permissions.deselectAllResource', 'Deselect all {resource}', { resource: formatResource(resource) })
                        : t('permissions.selectAllResource', 'Select all {resource}', { resource: formatResource(resource) })}
                    </strong>
                  }
                  checked={isFullySelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = isPartiallySelected;
                    }
                  }}
                  onChange={() => handleResourceToggle(resource)}
                  className="mb-3 border-bottom pb-2"
                />

                {/* Individual permissions */}
                {resourcePerms.map(permission => (
                  <Form.Check
                    key={permission.id}
                    type="checkbox"
                    id={`permission-${permission.id}`}
                    label={
                      <div>
                        <div>
                          <strong>{formatAction(permission.action)}</strong>
                          {' '}
                          <span className="text-muted">({permission.code})</span>
                        </div>
                        {permission.description && (
                          <small className="text-muted d-block">{permission.description}</small>
                        )}
                      </div>
                    }
                    checked={isPermissionSelected(permission.id)}
                    onChange={() => handlePermissionToggle(permission.id)}
                    className="mb-2 ms-4"
                  />
                ))}
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>

      {/* No permissions message */}
      {permissions.length === 0 && (
        <div className="text-center py-4 text-muted">
          <p>{t('permissions.noPermissions', 'No permissions available')}</p>
        </div>
      )}
    </div>
  );
};

export default PermissionTree;
