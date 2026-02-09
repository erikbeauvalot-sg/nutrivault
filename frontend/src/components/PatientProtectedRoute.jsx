/**
 * Patient Protected Route
 * Ensures user is authenticated and has PATIENT role
 * Redirects staff users to /dashboard, unauthenticated to /login
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PatientPortalLayout from './layout/PatientPortalLayout';

const PatientProtectedRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Staff users should not access portal routes
  if (user?.role !== 'PATIENT') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PatientPortalLayout>
      {children}
    </PatientPortalLayout>
  );
};

export default PatientProtectedRoute;
