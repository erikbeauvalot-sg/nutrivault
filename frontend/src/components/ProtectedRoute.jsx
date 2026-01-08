/**
 * ProtectedRoute Component
 * Guards routes that require authentication
 */

import { Navigate } from 'react-router-dom';
import { Container, Spinner } from 'react-bootstrap';
import useAuth from '../hooks/useAuth';

export function ProtectedRoute({ children, requiredRoles = null }) {
  const { isAuthenticated, loading, user } = useAuth();

  console.log('[ProtectedRoute] Checking access', {
    loading,
    isAuthenticated,
    username: user?.username,
    userRole: user?.role?.name,
    requiredRoles
  });

  // Show loading state while checking authentication
  if (loading) {
    console.log('[ProtectedRoute] Still loading');
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  // Not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check role-based access if requiredRoles is specified
  if (requiredRoles && !requiredRoles.includes(user?.role?.name)) {
    console.log('[ProtectedRoute] Access denied, redirecting to unauthorized');
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('[ProtectedRoute] Access granted, rendering children');
  return children;
}

export default ProtectedRoute;
