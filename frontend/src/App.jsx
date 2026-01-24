/**
 * App Component
 * Main application router with protected routes
 * Implements lazy loading for performance optimization (US-9.2)
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Eager load: Login page (first page users see)
import LoginPage from './pages/LoginPage';

// Lazy load: All other pages (loaded on demand)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PatientsPage = lazy(() => import('./pages/PatientsPage'));
const EditPatientPage = lazy(() => import('./pages/EditPatientPage'));
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage'));
const AgendaPage = lazy(() => import('./pages/AgendaPage'));
const VisitsPage = lazy(() => import('./pages/VisitsPage'));
const CreateVisitPage = lazy(() => import('./pages/CreateVisitPage'));
const EditVisitPage = lazy(() => import('./pages/EditVisitPage'));
const VisitDetailPage = lazy(() => import('./pages/VisitDetailPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const CreateInvoicePage = lazy(() => import('./pages/CreateInvoicePage'));
const EditInvoicePage = lazy(() => import('./pages/EditInvoicePage'));
const RecordPaymentPage = lazy(() => import('./pages/RecordPaymentPage'));
const InvoiceDetailPage = lazy(() => import('./pages/InvoiceDetailPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const DocumentUploadPage = lazy(() => import('./pages/DocumentUploadPage'));
const CustomFieldsPage = lazy(() => import('./pages/CustomFieldsPage'));
const RolesManagementPage = lazy(() => import('./pages/RolesManagementPage'));
const MeasuresPage = lazy(() => import('./pages/MeasuresPage'));

// Loading fallback component
const PageLoader = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
    <div className="text-center">
      <Spinner animation="border" variant="primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
      <p className="mt-3 text-muted">Loading page...</p>
    </div>
  </div>
);

function App() {
  const { loading, isAuthenticated } = useAuth();

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

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <PatientsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients/:id/edit"
        element={
          <ProtectedRoute>
            <EditPatientPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients/:id"
        element={
          <ProtectedRoute>
            <PatientDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/agenda"
        element={
          <ProtectedRoute>
            <AgendaPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/visits"
        element={
          <ProtectedRoute>
            <VisitsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/visits/create"
        element={
          <ProtectedRoute>
            <CreateVisitPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/visits/:id/edit"
        element={
          <ProtectedRoute>
            <EditVisitPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/visits/:id"
        element={
          <ProtectedRoute>
            <VisitDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <BillingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing/create"
        element={
          <ProtectedRoute>
            <CreateInvoicePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing/:id/edit"
        element={
          <ProtectedRoute>
            <EditInvoicePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing/:id/record-payment"
        element={
          <ProtectedRoute>
            <RecordPaymentPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing/:id"
        element={
          <ProtectedRoute>
            <InvoiceDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents/upload"
        element={
          <ProtectedRoute>
            <DocumentUploadPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/custom-fields"
        element={
          <ProtectedRoute>
            <CustomFieldsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/roles"
        element={
          <ProtectedRoute>
            <RolesManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/measures"
        element={
          <ProtectedRoute>
            <MeasuresPage />
          </ProtectedRoute>
        }
      />

      {/* Default Route */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
      />

      {/* Catch-all Route */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
    </Suspense>
  );
}

export default App;
