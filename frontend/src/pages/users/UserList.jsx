/**
 * User List Page
 *
 * Displays all users with search, filters, and pagination
 * Admin-only page (requires users.read permission)
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PersonPlus } from 'react-bootstrap-icons';
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
      return <span className="badge badge-danger">Inactive</span>;
    }
    if (user.is_locked) {
      return <span className="badge badge-warning">Locked</span>;
    }
    return <span className="badge badge-success">Active</span>;
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
        <li key="first" className="page-item">
          <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(1); }}>
            First
          </a>
        </li>,
        <li key="prev" className="page-item">
          <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(currentPage - 1); }}>
            Previous
          </a>
        </li>
      );
    }

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
          <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}>
            {page}
          </a>
        </li>
      );
    }

    if (currentPage < totalPages) {
      items.push(
        <li key="next" className="page-item">
          <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(currentPage + 1); }}>
            Next
          </a>
        </li>,
        <li key="last" className="page-item">
          <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(totalPages); }}>
            Last
          </a>
        </li>
      );
    }

    return (
      <nav aria-label="User pagination">
        <ul className="pagination justify-content-center">
          {items}
        </ul>
      </nav>
    );
  };

  return (
    <div className="py-4">
      <div className="row mb-4">
        <div className="col">
          <h2>User Management</h2>
          <p className="text-muted">Manage system users and their roles</p>
        </div>
        <div className="col-auto">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/users/new')}
          >
            <i className="fas fa-plus me-2"></i>
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card card-primary">
        <div className="card-header">
          <h3 className="card-title">Filters</h3>
          <div className="card-tools">
            <button type="button" className="btn btn-tool" data-card-widget="collapse">
              <i className="fas fa-minus"></i>
            </button>
          </div>
        </div>
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div className="row align-items-end g-3">
              <div className="col-md-4">
                <div className="form-group">
                  <label>
                    <i className="fas fa-search me-2"></i>
                    Search
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>
                    <i className="fas fa-filter me-2"></i>
                    Role
                  </label>
                  <select
                    className="form-control"
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
                  </select>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="form-control"
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
                  </select>
                </div>
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100"
                  onClick={handleClearFilters}
                >
                  Clear
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* User Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p className="mt-3">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">No users found</p>
            </div>
          ) : (
            <>
              <table className="table table-bordered table-striped table-hover">
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
                          <span className="badge badge-info">{user.role.name}</span>
                        ) : (
                          <span className="badge badge-secondary">No Role</span>
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
                        <a
                          href={`/users/${user.id}`}
                          className="btn btn-primary btn-sm"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="d-flex justify-content-between align-items-center mt-4">
                <div className="text-muted">
                  Showing {users.length} of {totalUsers} users
                </div>
                {totalPages > 1 && renderPagination()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserList;
