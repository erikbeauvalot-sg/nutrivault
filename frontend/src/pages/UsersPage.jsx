/**
 * UsersPage Component
 * Admin-only user management page
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Spinner, Alert, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import userService from '../services/userService';
import UserModal from '../components/UserModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ActionButton from '../components/ActionButton';
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
  const [userModalMode, setUserModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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
      fetchUsers();
      fetchRoles();
    }
  }, [filters, user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers(filters);
      
      const data = response.data.data || response.data;
      const usersList = Array.isArray(data) ? data : [];
      setUsers(usersList);
      
      const paginationData = response.data.pagination || { total: 0, totalPages: 0 };
      setPagination(paginationData);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.error || t('users.failedToLoad'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await userService.getRoles();
      const data = response.data.data || response.data;
      const rolesList = Array.isArray(data) ? data : [];
      setRoles(rolesList);
    } catch (err) {
      console.error('Error fetching roles:', err);
      // Don't set error state for roles, just log it
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
      console.error('Error toggling user status:', err);
      alert(err.response?.data?.error || t('users.failedToToggleStatus'));
    }
  };

  const handleDelete = async (userId) => {
    if (userId === user.id) {
      alert(t('users.cannotDeleteOwnAccount'));
      return;
    }

    // Find the user to check if they're active
    const targetUser = users.find(u => u.id === userId);

    if (targetUser?.is_active) {
      alert(t('users.mustDeactivateBeforeDelete', 'You must deactivate this user before deleting. Please deactivate the user first, then you can delete them.'));
      return;
    }

    if (!window.confirm(t('users.confirmDelete', 'Are you sure you want to PERMANENTLY delete this user? This action cannot be undone!'))) {
      return;
    }

    try {
      await userService.deleteUser(userId);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      const errorMessage = err.response?.data?.error || t('users.failedToDelete');
      alert(errorMessage);
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
      const response = await userService.getUserById(userId);
      const userData = response.data.data || response.data;
      setSelectedUser(userData);
      setUserModalMode('edit');
      setShowUserModal(true);
    } catch (err) {
      console.error('Error fetching user:', err);
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
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>👤 {t('users.title')}</h1>
          <Button variant="primary" size="lg" onClick={handleCreateClick}>
            {t('users.createUser')}
          </Button>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

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
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">{t('users.loading')}</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-5">
                <h3>{t('users.noUsersFound')}</h3>
                <p className="text-muted">{t('users.tryAdjustingFilters')}</p>
              </div>
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
                {pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
                      {t('users.showingPage', { 
                        current: filters.page, 
                        total: pagination.totalPages, 
                        count: pagination.total 
                      })}
                    </div>
                    <div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        disabled={filters.page === 1}
                        onClick={() => handleFilterChange('page', filters.page - 1)}
                      >
                        {t('users.previous')}
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        disabled={filters.page >= pagination.totalPages}
                        onClick={() => handleFilterChange('page', filters.page + 1)}
                      >
                        {t('users.next')}
                      </Button>
                    </div>
                  </div>
                )}
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
      </Container>
    </Layout>
  );
};

export default UsersPage;
