/**
 * RolesManagementPage Component
 * Admin-only role and permission management page
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Spinner, Alert, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import roleService from '../services/roleService';
import RoleModal from '../components/RoleModal';
import ActionButton from '../components/ActionButton';

const RolesManagementPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState('create');
  const [selectedRole, setSelectedRole] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchTerm, setSearchTerm] = useState('');

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchRoles();
    }
  }, [user]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await roleService.getRoles();

      const data = response.data.data || response.data;
      const rolesList = Array.isArray(data) ? data : [];
      setRoles(rolesList);
      setError(null);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError(err.response?.data?.error || t('roles.failedToLoad', 'Failed to load roles'));
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedRole(null);
    setRoleModalMode('create');
    setShowRoleModal(true);
  };

  const handleEditClick = async (roleId) => {
    try {
      const response = await roleService.getRoleById(roleId);
      const roleData = response.data.data || response.data;
      setSelectedRole(roleData);
      setRoleModalMode('edit');
      setShowRoleModal(true);
    } catch (err) {
      console.error('Error fetching role:', err);
      alert(err.response?.data?.error || t('roles.failedToLoad', 'Failed to load role'));
    }
  };

  const handleDelete = async (roleId) => {
    const targetRole = roles.find(r => r.id === roleId);

    if (!window.confirm(t('roles.confirmDelete', `Are you sure you want to delete the role "${targetRole?.name}"? This action cannot be undone!`))) {
      return;
    }

    try {
      await roleService.deleteRole(roleId);
      fetchRoles();
    } catch (err) {
      console.error('Error deleting role:', err);
      const errorMessage = err.response?.data?.error || t('roles.failedToDelete', 'Failed to delete role');
      alert(errorMessage);
    }
  };

  const handleRoleModalSave = () => {
    fetchRoles();
  };

  const getRoleBadge = (roleName) => {
    const variants = {
      ADMIN: 'danger',
      DIETITIAN: 'primary',
      ASSISTANT: 'info',
      VIEWER: 'secondary'
    };
    return <Badge bg={variants[roleName] || 'secondary'}>{roleName}</Badge>;
  };

  // Filter roles by search term
  const filteredRoles = roles.filter(role => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      role.name.toLowerCase().includes(search) ||
      (role.description && role.description.toLowerCase().includes(search))
    );
  });

  // Redirect early if not admin
  if (user && user.role !== 'ADMIN') {
    return null;
  }

  return (
    <Layout>
      <Container fluid>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>🔐 {t('roles.title', 'Manage Roles')}</h1>
          <Button variant="primary" size="lg" onClick={handleCreateClick}>
            {t('roles.createRole', 'Create Role')}
          </Button>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

        {/* Search Filter */}
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('roles.search', 'Search')}</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>🔍</InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder={t('roles.searchPlaceholder', 'Search by role name or description...')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button
                  variant="outline-secondary"
                  className="w-100"
                  onClick={() => setSearchTerm('')}
                  disabled={!searchTerm}
                >
                  {t('roles.clearFilter', 'Clear')}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Roles Table */}
        <Card>
          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">{t('roles.loading', 'Loading roles...')}</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-5">
                <h3>{t('roles.noRolesFound', 'No roles found')}</h3>
                <p className="text-muted">
                  {searchTerm
                    ? t('roles.tryAdjustingSearch', 'Try adjusting your search')
                    : t('roles.noRolesYet', 'No roles created yet')}
                </p>
              </div>
            ) : isMobile ? (
              /* Mobile Card View */
              <div className="role-cards-container">
                {filteredRoles.map(role => (
                  <Card key={role.id} className="role-card mb-3">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h6 className="mb-1">
                            {getRoleBadge(role.name)}
                          </h6>
                          <div className="text-muted small">{role.description || t('roles.noDescription', 'No description')}</div>
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="small mb-1">
                          🔑 {role.permissions?.length || 0} {t('roles.permissions', 'permissions')}
                        </div>
                        <div className="small text-muted">
                          👥 {role.users?.length || 0} {t('roles.users', 'users')}
                        </div>
                      </div>

                      <div className="action-buttons mt-3">
                        <ActionButton
                          action="edit"
                          onClick={() => handleEditClick(role.id)}
                          title={t('common.edit', 'Edit')}
                        />
                        <ActionButton
                          action="delete"
                          onClick={() => handleDelete(role.id)}
                          title={t('common.delete', 'Delete')}
                        />
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            ) : (
              /* Desktop Table View */
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>{t('roles.roleName', 'Role Name')}</th>
                    <th>{t('roles.description', 'Description')}</th>
                    <th className="text-center">{t('roles.permissionsCount', 'Permissions')}</th>
                    <th className="text-center">{t('roles.usersCount', 'Users')}</th>
                    <th className="text-end">{t('roles.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map(role => (
                    <tr
                      key={role.id}
                      onClick={() => handleEditClick(role.id)}
                      className="clickable-row"
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        {getRoleBadge(role.name)}
                      </td>
                      <td>
                        <span className="text-muted">{role.description || t('roles.noDescription', 'No description')}</span>
                      </td>
                      <td className="text-center">
                        <Badge bg="info">{role.permissions?.length || 0}</Badge>
                      </td>
                      <td className="text-center">
                        <Badge bg="secondary">{role.users?.length || 0}</Badge>
                      </td>
                      <td className="text-end" onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons justify-content-end">
                          <ActionButton
                            action="edit"
                            onClick={() => handleEditClick(role.id)}
                            title={t('common.edit', 'Edit')}
                          />
                          <ActionButton
                            action="delete"
                            onClick={() => handleDelete(role.id)}
                            title={t('common.delete', 'Delete')}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

            {/* Stats */}
            {!loading && filteredRoles.length > 0 && (
              <div className="mt-3 text-muted small">
                {t('roles.showingCount', `Showing ${filteredRoles.length} role(s)`)}
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* Role Modal */}
      <RoleModal
        show={showRoleModal}
        onHide={() => setShowRoleModal(false)}
        mode={roleModalMode}
        role={selectedRole}
        onSave={handleRoleModalSave}
      />
    </Layout>
  );
};

export default RolesManagementPage;
