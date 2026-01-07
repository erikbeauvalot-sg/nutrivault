/**
 * Create User Page
 *
 * Page for creating a new user
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import UserForm from '../../components/users/UserForm';
import { createUser, getRoles } from '../../services/userService';

const CreateUser = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const handleSubmit = async (data) => {
    try {
      setIsLoading(true);
      const result = await createUser(data);
      toast.success('User created successfully');
      navigate(`/users/${result.user.id}`);
    } catch (error) {
      console.error('Error creating user:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create user';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
          <h2>Create New User</h2>
          <p className="text-muted">Add a new user to the system</p>
        </Col>
      </Row>

      <Row>
        <Col lg={8}>
          <Card>
            <Card.Body>
              <UserForm
                onSubmit={handleSubmit}
                isLoading={isLoading}
                roles={roles}
                isEdit={false}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CreateUser;
