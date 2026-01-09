/**
 * Create User Page
 *
 * Page for creating a new user
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    <div className="py-4">
      <div className="row mb-4">
        <div className="col">
          <a
            href="/users"
            className="btn btn-outline-secondary mb-3"
          >
            <i className="fas fa-arrow-left me-2"></i>
            Back to Users
          </a>
          <h2>Create New User</h2>
          <p className="text-muted">Add a new user to the system</p>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-body">
              <UserForm
                onSubmit={handleSubmit}
                isLoading={isLoading}
                roles={roles}
                isEdit={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;
