/**
 * User List Page
 *
 * Displays all users with search, filters, and pagination
 * Admin-only page (requires users.read permission)
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Badge, Pagination, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { PersonPlus, Search, Funnel } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { getUsers, getRoles } from '../../services/userService';
import { format } from 'date-fns';

const UserList = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(25);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [currentPage, searchTerm, selectedRole, selectedStatus]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit,
        search: searchTerm,
        role: selectedRole,
        status: selectedStatus
      };
      const data = await getUsers(params);
      setUsers(data.users);
      setTotalUsers(data.total);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedRole('');
    setSelectedStatus('');
    setCurrentPage(1);
  };

  const getStatusBadge = (user) => {
    if (user.is_active === false) {
      return <Badge bg="danger">Inactive</Badge>;
    }
    if (user.is_locked) {
      return <Badge bg="warning" text="dark">Locked</Badge>;
    }
    return <Badge bg="success">Active</Badge>;
  };

  const totalPages = Math.ceil(totalUsers / limit);

  const renderPagination = () => {
    const items = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (currentPage > 1) {
      items.push(
        <Pagination.First key="first" onClick={() => setCurrentPage(1)} />,
        <Pagination.Prev key="prev" onClick={() => setCurrentPage(currentPage - 1)} />
      );
    }

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === currentPage}
          onClick={() => setCurrentPage(page)}
        >
          {page}
        </Pagination.Item>
      );
    }

    if (currentPage < totalPages) {
      items.push(
        <Pagination.Next key="next" onClick={() => setCurrentPage(currentPage + 1)} />,
        <Pagination.Last key="last" onClick={() => setCurrentPage(totalPages)} />
      );
    }

    return <Pagination>{items}</Pagination>;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>User Management</h2>
          <p className="text-muted">Manage system users and their roles</p>
        </Col>
        <Col xs="auto">
          <Button 
            variant="primary" 
            onClick={() => navigate('/users/new')}
          >
            <PersonPlus className="me-2" />
            Add User
          </Button>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    <Search className="me-2" />
                    Search
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>
                    <Funnel className="me-2" />
                    Role
                  </Form.Label>
                  <Form.Select
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Roles</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="locked">Locked</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button 
                  variant="outline-secondary" 
                  onClick={handleClearFilters}
                  className="w-100"
                >
                  Clear
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* User Table */}
      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
              <p className="mt-3">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">No users found</p>
            </div>
          ) : (
            <>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <strong>
                          {user.first_name} {user.last_name}
                        </strong>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        {user.role ? (
                          <Badge bg="info">{user.role.name}</Badge>
                        ) : (
                          <Badge bg="secondary">No Role</Badge>
                        )}
                      </td>
                      <td>{getStatusBadge(user)}</td>
                      <td>
                        {user.last_login_at
                          ? format(new Date(user.last_login_at), 'PPp')
                          : 'Never'}
                      </td>
                      <td>{format(new Date(user.created_at), 'PP')}</td>
                      <td>
                        <Button
                          as={Link}
                          to={`/users/${user.id}`}
                          variant="outline-primary"
                          size="sm"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* Pagination */}
              <div className="d-flex justify-content-between align-items-center mt-4">
                <div className="text-muted">
                  Showing {users.length} of {totalUsers} users
                </div>
                {totalPages > 1 && renderPagination()}
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default UserList;
