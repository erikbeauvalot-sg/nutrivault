/**
 * App Component
 * Main application with routing and lazy loading
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Spinner, Container } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthProvider from './contexts/AuthProvider';
import useAuth from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import Layout from './components/layout/Layout';
import './styles/index.css';

// Lazy load page components for better performance
const LoginPage = lazy(() => import('./pages/Login'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const UnauthorizedPage = lazy(() => import('./pages/Unauthorized'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

// Patient Management (lazy loaded)
const PatientListPage = lazy(() => import('./pages/patients/PatientList'));
const PatientDetailsPage = lazy(() => import('./pages/patients/PatientDetails'));
const CreatePatientPage = lazy(() => import('./pages/patients/CreatePatient'));
const EditPatientPage = lazy(() => import('./pages/patients/EditPatient'));
const PatientVisitHistoryPage = lazy(() => import('./pages/patients/PatientVisitHistory'));

// Visit Management (lazy loaded)
const VisitListPage = lazy(() => import('./pages/visits/VisitList'));
const VisitDetailsPage = lazy(() => import('./pages/visits/VisitDetails'));
const CreateVisitPage = lazy(() => import('./pages/visits/CreateVisit'));
const EditVisitPage = lazy(() => import('./pages/visits/EditVisit'));

// Billing Management (lazy loaded)
const BillingListPage = lazy(() => import('./pages/billing/BillingList'));
const InvoiceDetailsPage = lazy(() => import('./pages/billing/InvoiceDetails'));
const CreateInvoicePage = lazy(() => import('./pages/billing/CreateInvoice'));

// User Management (lazy loaded)
const UserListPage = lazy(() => import('./pages/users/UserList'));
const UserDetailsPage = lazy(() => import('./pages/users/UserDetails'));
const CreateUserPage = lazy(() => import('./pages/users/CreateUser'));
const EditUserPage = lazy(() => import('./pages/users/EditUser'));

// Reports & Audit (lazy loaded)
const ReportsPage = lazy(() => import('./pages/Reports'));
const AuditLogListPage = lazy(() => import('./pages/audit/AuditLogList'));

// Profile (lazy loaded)
const ProfilePage = lazy(() => import('./pages/Profile'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePassword'));

/**
 * Loading Fallback Component
 */
function LoadingFallback() {
  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <Spinner animation="border" role="status" variant="primary">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </Container>
  );
}

/**
 * Routes Component (inside provider to access auth context)
 */
function AppRoutes() {
  const { loading, user, isAuthenticated } = useAuth();

  console.log('[AppRoutes] Rendering routes', { loading, isAuthenticated, username: user?.username });

  if (loading) {
    console.log('[AppRoutes] Still loading, showing fallback');
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Routes - Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Patient Management */}
        <Route
          path="/patients"
          element={
            <ProtectedRoute>
              <Layout>
                <PatientListPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/new"
          element={
            <ProtectedRoute>
              <Layout>
                <CreatePatientPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <PatientDetailsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id/edit"
          element={
            <ProtectedRoute>
              <Layout>
                <EditPatientPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id/visits"
          element={
            <ProtectedRoute>
              <Layout>
                <PatientVisitHistoryPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Visit Management */}
        <Route
          path="/visits"
          element={
            <ProtectedRoute>
              <Layout>
                <VisitListPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/visits/new"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateVisitPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/visits/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <VisitDetailsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/visits/:id/edit"
          element={
            <ProtectedRoute>
              <Layout>
                <EditVisitPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Billing Management */}
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <Layout>
                <BillingListPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing/new"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateInvoicePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <InvoiceDetailsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - User Management (Admin Only) */}
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRoles={['ADMIN']}>
              <Layout>
                <UserListPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <ProtectedRoute requiredRoles={['ADMIN']}>
              <Layout>
                <CreateUserPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute requiredRoles={['ADMIN']}>
              <Layout>
                <UserDetailsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id/edit"
          element={
            <ProtectedRoute requiredRoles={['ADMIN']}>
              <Layout>
                <EditUserPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Reports & Audit Logs */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRoles={['ADMIN', 'DIETITIAN']}>
              <Layout>
                <ReportsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute requiredRoles={['ADMIN']}>
              <Layout>
                <AuditLogListPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/change-password"
          element={
            <ProtectedRoute>
              <Layout>
                <ChangePasswordPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Error Routes */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

/**
 * Main App Component
 */
export function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </AuthProvider>
    </Router>
  );
}

export default App;
