/**
 * Edit User Page
 *
 * Page for editing an existing user (no password field)
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import UserForm from '../../components/users/UserForm';
import { getUser, updateUser, getRoles } from '../../services/userService';

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoadingData(true);
      const [userData, rolesData] = await Promise.all([
        getUser(id),
        getRoles()
      ]);
      setUser(userData.user);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load user data');
      navigate('/users');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setIsLoading(true);
      await updateUser(id, data);
      toast.success('User updated successfully');
      navigate(`/users/${id}`);
    } catch (error) {
      console.error('Error updating user:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update user';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3">Loading user data...</p>
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
            to={`/users/${id}`}
            variant="outline-secondary"
            className="mb-3"
          >
            <ArrowLeft className="me-2" />
            Back to User Details
          </Button>
          <h2>Edit User</h2>
          <p className="text-muted">Update user information</p>
        </Col>
      </Row>

      <Row>
        <Col lg={8}>
          <Card>
            <Card.Body>
              <UserForm
                initialData={user}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                roles={roles}
                isEdit={true}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EditUser;
