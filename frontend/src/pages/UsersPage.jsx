/**
 * UsersPage Component
 * Admin-only user management page
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { PageHeader, PageError, LoadingSpinner, EmptyState, Pagination } from '../components/common';
import { useIsMobile } from '../hooks';
import userService from '../services/userService';
import UserModal from '../components/UserModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ActionButton from '../components/ActionButton';
import ConfirmModal from '../components/ConfirmModal';
import './UsersPage.css';

const UsersPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    role_id: '',
    is_active: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userModalMode, setUserModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const isMobile = useIsMobile();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchUsers();
      fetchRoles();
    }
  }, [filters, user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, pagination: paginationData } = await userService.getUsers(filters);

      setUsers(Array.isArray(data) ? data : []);
      setPagination(paginationData || { total: 0, totalPages: 0 });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || t('users.failedToLoad'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const rolesList = await userService.getRoles();
      setRoles(Array.isArray(rolesList) ? rolesList : []);
    } catch (err) {
      // Don't set error state for roles
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleToggleStatus = async (userId) => {
    try {
      await userService.toggleUserStatus(userId);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || t('users.failedToToggleStatus'));
    }
  };

  const handleDelete = (userId) => {
    if (userId === user.id) {
      setError(t('users.cannotDeleteOwnAccount'));
      return;
    }

    // Find the user to check if they're active
    const targetUser = users.find(u => u.id === userId);

    if (targetUser?.is_active) {
      setError(t('users.mustDeactivateBeforeDelete', 'You must deactivate this user before deleting. Please deactivate the user first, then you can delete them.'));
      return;
    }

    setUserToDelete(userId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await userService.deleteUser(userToDelete);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || t('users.failedToDelete'));
    } finally {
      setUserToDelete(null);
    }
  };

  const handleCreateClick = () => {
    setSelectedUser(null);
    setUserModalMode('create');
    setShowUserModal(true);
  };

  const handleViewClick = (userId) => {
    navigate(`/users/${userId}`);
  };

  const handleEditClick = async (userId) => {
    try {
      const userData = await userService.getUserById(userId);
      setSelectedUser(userData);
      setUserModalMode('edit');
      setShowUserModal(true);
    } catch (err) {
      alert(err.response?.data?.error || t('users.failedToLoad'));
    }
  };

  const handlePasswordClick = (usr) => {
    setSelectedUser(usr);
    setShowPasswordModal(true);
  };

  const handleUserModalSave = () => {
    fetchUsers();
  };

  const handlePasswordSuccess = () => {
    fetchUsers();
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

  const getStatusBadge = (isActive, lockedUntil) => {
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      return <Badge bg="warning">{t('users.locked')}</Badge>;
    }
    return isActive ? <Badge bg="success">{t('users.active')}</Badge> : <Badge bg="secondary">{t('users.inactive')}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Redirect early if not admin
  if (user && user.role !== 'ADMIN') {
    return null;
  }

  return (
    <Layout>
      <Container fluid>
        <PageHeader
          title={t('users.title')}
          actions={[
            {
              label: t('users.createUser'),
              onClick: handleCreateClick,
              variant: 'primary',
              icon: 'bi-plus-circle'
            }
          ]}
        />

        <PageError error={error} onDismiss={() => setError(null)} />

        {/* Filters */}
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('users.search')}</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>🔍</InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder={t('users.searchPlaceholder')}
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('users.role')}</Form.Label>
                  <Form.Select
                    value={filters.role_id}
                    onChange={(e) => handleFilterChange('role_id', e.target.value)}
                  >
                    <option value="">{t('users.allRoles')}</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('users.status')}</Form.Label>
                  <Form.Select
                    value={filters.is_active}
                    onChange={(e) => handleFilterChange('is_active', e.target.value)}
                  >
                    <option value="">{t('users.allStatus')}</option>
                    <option value="true">{t('users.active')}</option>
                    <option value="false">{t('users.inactive')}</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={2} className="d-flex align-items-end">
                <Button
                  variant="outline-secondary"
                  className="mb-3 w-100"
                  onClick={() => setFilters({ search: '', role_id: '', is_active: '', page: 1, limit: 20 })}
                >
                  {t('users.clearFilters')}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Users Table */}
        <Card>
          <Card.Body>
            {loading ? (
              <LoadingSpinner message={t('users.loading')} />
            ) : users.length === 0 ? (
              <EmptyState
                icon="bi-people"
                title={t('users.noUsersFound')}
                message={t('users.tryAdjustingFilters')}
              />
            ) : isMobile ? (
              /* Mobile Card View */
              <div className="user-cards-container">
                {users.map(usr => (
                  <Card key={usr.id} className="user-card mb-3">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h6 className="mb-1">
                            <strong>{usr.username}</strong>
                            {usr.id === user.id && <Badge bg="info" className="ms-2">You</Badge>}
                          </h6>
                          <div className="text-muted small">{usr.first_name} {usr.last_name}</div>
                        </div>
                        <div className="d-flex flex-column align-items-end gap-1">
                          {usr.role && getRoleBadge(usr.role.name)}
                          {getStatusBadge(usr.is_active, usr.locked_until)}
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="small mb-1">
                          📧 {usr.email}
                        </div>
                        {usr.last_login && (
                          <div className="small text-muted mb-1">
                            🕐 {formatDate(usr.last_login)}
                          </div>
                        )}
                        {usr.failed_login_attempts > 0 && (
                          <Badge bg="warning" className="mt-1">⚠️ {usr.failed_login_attempts} failed attempts</Badge>
                        )}
                      </div>

                      <div className="action-buttons mt-3">
                        <ActionButton
                          action="edit"
                          onClick={() => handleEditClick(usr.id)}
                          title={t('common.edit', 'Edit')}
                        />
                        <ActionButton
                          action={usr.is_active ? 'disable' : 'enable'}
                          onClick={() => handleToggleStatus(usr.id)}
                          disabled={usr.id === user.id}
                          title={
                            usr.id === user.id
                              ? t('users.cannotToggleOwnStatus')
                              : usr.is_active
                              ? t('users.deactivate')
                              : t('users.activate')
                          }
                        />
                        <ActionButton
                          action="reset-password"
                          onClick={() => handlePasswordClick(usr)}
                          title={t('users.resetPassword')}
                        />
                        <ActionButton
                          action="delete"
                          onClick={() => handleDelete(usr.id)}
                          disabled={usr.id === user.id || usr.is_active}
                          title={
                            usr.id === user.id
                              ? t('users.cannotDeleteOwnAccount')
                              : usr.is_active
                              ? t('users.mustDeactivateBeforeDelete')
                              : t('users.deleteUser')
                          }
                        />
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            ) : (
              /* Desktop Table View */
              <>
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>{t('users.username')}</th>
                        <th>{t('users.fullName')}</th>
                        <th>{t('users.email')}</th>
                        <th>{t('users.role')}</th>
                        <th>{t('users.status')}</th>
                        <th>{t('users.lastLogin')}</th>
                        <th>{t('users.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(usr => (
                        <tr
                          key={usr.id}
                          onClick={() => handleViewClick(usr.id)}
                          className="clickable-row"
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <strong>{usr.username}</strong>
                            {usr.id === user.id && <Badge bg="info" className="ms-2">You</Badge>}
                          </td>
                          <td>{usr.first_name} {usr.last_name}</td>
                          <td>{usr.email}</td>
                          <td>{usr.role ? getRoleBadge(usr.role.name) : '-'}</td>
                          <td>{getStatusBadge(usr.is_active, usr.locked_until)}</td>
                          <td>
                            <small>{formatDate(usr.last_login)}</small>
                            {usr.failed_login_attempts > 0 && (
                              <div><Badge bg="warning" className="mt-1">⚠️ {usr.failed_login_attempts} failed attempts</Badge></div>
                            )}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="action-buttons">
                              <ActionButton
                                action="edit"
                                onClick={() => handleEditClick(usr.id)}
                                title={t('common.edit', 'Edit')}
                              />
                              <ActionButton
                                action={usr.is_active ? 'disable' : 'enable'}
                                onClick={() => handleToggleStatus(usr.id)}
                                disabled={usr.id === user.id}
                                title={
                                  usr.id === user.id
                                    ? t('users.cannotToggleOwnStatus')
                                    : usr.is_active
                                    ? t('users.deactivate')
                                    : t('users.activate')
                                }
                              />
                              <ActionButton
                                action="reset-password"
                                onClick={() => handlePasswordClick(usr)}
                                title={t('users.resetPassword')}
                              />
                              <ActionButton
                                action="delete"
                                onClick={() => handleDelete(usr.id)}
                                disabled={usr.id === user.id || usr.is_active}
                                title={
                                  usr.id === user.id
                                    ? t('users.cannotDeleteOwnAccount')
                                    : usr.is_active
                                    ? t('users.mustDeactivateBeforeDelete')
                                    : t('users.deleteUser')
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={filters.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.total}
                  itemsPerPage={filters.limit}
                  onPageChange={(page) => handleFilterChange('page', page)}
                  showInfo
                  className="mt-3"
                />
              </>
            )}
          </Card.Body>
        </Card>

        <UserModal
          show={showUserModal}
          onHide={() => setShowUserModal(false)}
          mode={userModalMode}
          user={selectedUser}
          roles={roles}
          onSave={handleUserModalSave}
        />

        <ChangePasswordModal
          show={showPasswordModal}
          onHide={() => setShowPasswordModal(false)}
          userId={selectedUser?.id}
          username={selectedUser?.username}
          isAdmin={user?.role === 'ADMIN'}
          onSuccess={handlePasswordSuccess}
        />

        <ConfirmModal
          show={showDeleteConfirm}
          onHide={() => {
            setShowDeleteConfirm(false);
            setUserToDelete(null);
          }}
          onConfirm={confirmDeleteUser}
          title={t('common.confirmation', 'Confirmation')}
          message={t('users.confirmDelete', 'Are you sure you want to PERMANENTLY delete this user? This action cannot be undone!')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />
      </Container>
    </Layout>
  );
};

export default UsersPage;
