/**
 * App Component
 * Main application router with protected routes
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import CreatePatientPage from './pages/CreatePatientPage';
import EditPatientPage from './pages/EditPatientPage';
import PatientDetailPage from './pages/PatientDetailPage';
import VisitsPage from './pages/VisitsPage';
import CreateVisitPage from './pages/CreateVisitPage';
import EditVisitPage from './pages/EditVisitPage';
import VisitDetailPage from './pages/VisitDetailPage';
import UsersPage from './pages/UsersPage';
import BillingPage from './pages/BillingPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import EditInvoicePage from './pages/EditInvoicePage';
import RecordPaymentPage from './pages/RecordPaymentPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import ReportsPage from './pages/ReportsPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentUploadPage from './pages/DocumentUploadPage';
import ProtectedRoute from './components/ProtectedRoute';

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
        path="/patients/create"
        element={
          <ProtectedRoute>
            <CreatePatientPage />
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
  );
}

export default App;
