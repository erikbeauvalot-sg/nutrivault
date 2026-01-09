/**
 * UsersPage Component
 * Admin-only user management page
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import userService from '../services/userService';

const UsersPage = () => {
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

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchUsers();
    }
  }, [filters, user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers(filters);
      const data = response.data.data || response.data;
      const usersList = Array.isArray(data) ? data : [];
      setUsers(usersList);
      
      // Extract unique roles from users
      if (usersList.length > 0) {
        const uniqueRoles = [...new Map(
          usersList
            .filter(u => u.role)
            .map(u => [u.role.id, u.role])
        ).values()];
        setRoles(uniqueRoles);
      }
      
      setPagination(response.data.pagination || { total: 0, totalPages: 0 });
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.error || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
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
      alert(err.response?.data?.error || 'Failed to toggle user status');
    }
  };

  const handleDelete = async (userId) => {
    if (userId === user.id) {
      alert('Cannot delete your own account');
      return;
    }

    if (!window.confirm('Are you sure you want to deactivate this user?')) return;

    try {
      await userService.deleteUser(userId);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert(err.response?.data?.error || 'Failed to delete user');
    }
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
      return <Badge bg="warning">🔒 Locked</Badge>;
    }
    return isActive ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>;
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
          <h1>👤 User Management</h1>
          <Button variant="primary" size="lg" disabled>
            Create User (Coming Soon)
          </Button>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

        {/* Filters */}
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Search</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>🔍</InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Username, email, or name..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Select
                    value={filters.role_id}
                    onChange={(e) => handleFilterChange('role_id', e.target.value)}
                  >
                    <option value="">All Roles</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={filters.is_active}
                    onChange={(e) => handleFilterChange('is_active', e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={2} className="d-flex align-items-end">
                <Button
                  variant="outline-secondary"
                  className="mb-3 w-100"
                  onClick={() => setFilters({ search: '', role_id: '', is_active: '', page: 1, limit: 20 })}
                >
                  Clear Filters
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
                <p className="mt-3">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-5">
                <h3>No users found</h3>
                <p className="text-muted">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(usr => (
                        <tr key={usr.id}>
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
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                disabled
                              >
                                View/Edit
                              </Button>
                              <Button
                                variant={usr.is_active ? 'outline-warning' : 'outline-success'}
                                size="sm"
                                onClick={() => handleToggleStatus(usr.id)}
                                disabled={usr.id === user.id}
                                title={usr.id === user.id ? 'Cannot toggle own status' : ''}
                              >
                                {usr.is_active ? '🔒 Deactivate' : '✅ Activate'}
                              </Button>
                              <Button
                                variant="outline-info"
                                size="sm"
                                disabled
                              >
                                🔑 Reset Password
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(usr.id)}
                                disabled={usr.id === user.id}
                                title={usr.id === user.id ? 'Cannot delete own account' : ''}
                              >
                                Delete
                              </Button>
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
                      Showing page {filters.page} of {pagination.totalPages} ({pagination.total} total users)
                    </div>
                    <div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        disabled={filters.page === 1}
                        onClick={() => handleFilterChange('page', filters.page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        disabled={filters.page >= pagination.totalPages}
                        onClick={() => handleFilterChange('page', filters.page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default UsersPage;
