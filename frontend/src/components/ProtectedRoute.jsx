/**
 * Protected Route Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredPermission = null }) => {
  const { user, loading, isAuthenticated } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check permission if required (optional - for future use)
  if (requiredPermission && user) {
    const hasPermission = user.permissions?.includes(requiredPermission);
    if (!hasPermission) {
      return (
        <div className="container mt-5">
          <div className="alert alert-danger">
            <h4>Access Denied</h4>
            <p>You do not have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  // Render protected content
  return children;
};

export default ProtectedRoute;
