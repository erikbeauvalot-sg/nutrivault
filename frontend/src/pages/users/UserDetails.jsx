/**
 * User Details Page
 *
 * Comprehensive view of user with activate/deactivate, password reset, delete functionality
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Modal, Form } from 'react-bootstrap';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, PencilSquare, Key, Trash, CheckCircle, XCircle } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { 
  getUser, 
  activateUser, 
  deactivateUser, 
  changePassword, 
  deleteUser 
} from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const data = await getUser(id);
      setUser(data.user);
    } catch (error) {
      console.error('Error loading user:', error);
      toast.error('Failed to load user details');
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setActionLoading(true);
      if (user.is_active) {
        await deactivateUser(id);
        toast.success('User deactivated successfully');
      } else {
        await activateUser(id);
        toast.success('User activated successfully');
      }
      loadUser();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setActionLoading(true);
      await changePassword(id, { password: newPassword });
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.error || 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    // Prevent self-deletion
    if (currentUser && currentUser.id === parseInt(id)) {
      toast.error('You cannot delete your own account');
      return;
    }

    try {
      setActionLoading(true);
      await deleteUser(id);
      toast.success('User deleted successfully');
      navigate('/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  const getStatusBadge = () => {
    if (!user.is_active) {
      return <Badge bg="danger" className="fs-6">Inactive</Badge>;
    }
    if (user.is_locked) {
      return <Badge bg="warning" text="dark" className="fs-6">Locked</Badge>;
    }
    return <Badge bg="success" className="fs-6">Active</Badge>;
  };

  const isSelf = currentUser && currentUser.id === parseInt(id);

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3">Loading user details...</p>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <p className="text-muted">User not found</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <Button
            as={Link}
            to="/users"
            variant="outline-secondary"
            className="mb-3"
          >
            <ArrowLeft className="me-2" />
            Back to Users
          </Button>
          <h2>User Details</h2>
        </Col>
        <Col xs="auto">
          <div className="d-flex gap-2">
            <Button
              as={Link}
              to={`/users/${id}/edit`}
              variant="outline-primary"
            >
              <PencilSquare className="me-2" />
              Edit
            </Button>
            <Button
              variant={user.is_active ? 'outline-warning' : 'outline-success'}
              onClick={handleToggleStatus}
              disabled={actionLoading || isSelf}
              title={isSelf ? 'You cannot deactivate your own account' : ''}
            >
              {user.is_active ? (
                <>
                  <XCircle className="me-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircle className="me-2" />
                  Activate
                </>
              )}
            </Button>
            <Button
              variant="outline-info"
              onClick={() => setShowPasswordModal(true)}
            >
              <Key className="me-2" />
              Reset Password
            </Button>
            <Button
              variant="outline-danger"
              onClick={() => setShowDeleteModal(true)}
              disabled={isSelf}
              title={isSelf ? 'You cannot delete your own account' : ''}
            >
              <Trash className="me-2" />
              Delete
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col lg={8}>
          {/* Basic Information */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Basic Information</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Name:</strong>
                  <p className="mb-0">{user.first_name} {user.last_name}</p>
                </Col>
                <Col md={6}>
                  <strong>Email:</strong>
                  <p className="mb-0">{user.email}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Role:</strong>
                  <p className="mb-0">
                    {user.role ? (
                      <Badge bg="info">{user.role.name}</Badge>
                    ) : (
                      <Badge bg="secondary">No Role</Badge>
                    )}
                  </p>
                </Col>
                <Col md={6}>
                  <strong>Status:</strong>
                  <p className="mb-0">{getStatusBadge()}</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Account Activity */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Account Activity</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Last Login:</strong>
                  <p className="mb-0">
                    {user.last_login_at
                      ? format(new Date(user.last_login_at), 'PPpp')
                      : 'Never logged in'}
                  </p>
                </Col>
                <Col md={6}>
                  <strong>Failed Login Attempts:</strong>
                  <p className="mb-0">
                    {user.failed_login_attempts || 0}
                  </p>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <strong>Account Created:</strong>
                  <p className="mb-0">
                    {format(new Date(user.created_at), 'PPpp')}
                  </p>
                </Col>
                <Col md={6}>
                  <strong>Last Updated:</strong>
                  <p className="mb-0">
                    {format(new Date(user.updated_at), 'PPpp')}
                  </p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Permissions Card */}
          {user.role && user.role.permissions && (
            <Card>
              <Card.Header>
                <h5 className="mb-0">Permissions</h5>
              </Card.Header>
              <Card.Body>
                {user.role.permissions.length > 0 ? (
                  <div className="d-flex flex-wrap gap-2">
                    {user.role.permissions.map(permission => (
                      <Badge key={permission.id} bg="secondary">
                        {permission.resource}:{permission.action}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted mb-0">No permissions assigned</p>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* Password Reset Modal */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reset Password</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePasswordReset}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <Form.Text className="text-muted">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </Form.Text>
            </Form.Group>
            <Form.Group>
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading}>
              {actionLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this user?</p>
          <p className="mb-0">
            <strong>{user.first_name} {user.last_name}</strong> ({user.email})
          </p>
          <p className="text-danger mt-3 mb-0">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
            {actionLoading ? 'Deleting...' : 'Delete User'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UserDetails;
