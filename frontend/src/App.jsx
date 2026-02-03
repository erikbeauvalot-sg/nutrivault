/**
 * App Component
 * Main application router with protected routes
 * Implements lazy loading for performance optimization (US-9.2)
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
const EditVisitPage = lazy(() => import('./pages/EditVisitPage'));
const VisitDetailPage = lazy(() => import('./pages/VisitDetailPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const UserDetailPage = lazy(() => import('./pages/UserDetailPage'));
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
const MeasureDetailPage = lazy(() => import('./pages/MeasureDetailPage'));
const CustomFieldCategoryDetailPage = lazy(() => import('./pages/CustomFieldCategoryDetailPage'));
const CustomFieldDefinitionDetailPage = lazy(() => import('./pages/CustomFieldDefinitionDetailPage'));
const EmailTemplatesPage = lazy(() => import('./pages/EmailTemplatesPage'));
const BillingTemplatesPage = lazy(() => import('./pages/BillingTemplatesPage'));
const InvoiceCustomizationPage = lazy(() => import('./pages/InvoiceCustomizationPage'));
const AIConfigPage = lazy(() => import('./pages/AIConfigPage'));
const AnalyticsDashboardPage = lazy(() => import('./pages/AnalyticsDashboardPage'));
const UserSettingsPage = lazy(() => import('./pages/UserSettingsPage'));
const SharedDocumentPage = lazy(() => import('./pages/SharedDocumentPage'));
const MarionDietPage = lazy(() => import('./pages/MarionDietPage'));
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const CampaignEditorPage = lazy(() => import('./pages/CampaignEditorPage'));
const CampaignStatsPage = lazy(() => import('./pages/CampaignStatsPage'));
const ThemeManagementPage = lazy(() => import('./pages/ThemeManagementPage'));

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

        {/* Shared Document Route (Public - No Auth Required) */}
        <Route
          path="/shared/:token"
          element={<SharedDocumentPage />}
        />

        {/* Marion Diet Landing Page (Public - No Auth Required) */}
        <Route
          path="/mariondiet"
          element={<MarionDietPage />}
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
        path="/users/:id"
        element={
          <ProtectedRoute>
            <UserDetailPage />
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
        path="/settings/custom-fields/categories/:id/view"
        element={
          <ProtectedRoute>
            <CustomFieldCategoryDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/custom-fields/definitions/:id/view"
        element={
          <ProtectedRoute>
            <CustomFieldDefinitionDetailPage />
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

      <Route
        path="/settings/measures/:id/view"
        element={
          <ProtectedRoute>
            <MeasureDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/email-templates"
        element={
          <ProtectedRoute>
            <EmailTemplatesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/billing-templates"
        element={
          <ProtectedRoute permission="billing.read">
            <BillingTemplatesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/invoice-customization"
        element={
          <ProtectedRoute permission="billing.update">
            <InvoiceCustomizationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/themes"
        element={
          <ProtectedRoute>
            <ThemeManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/ai-config"
        element={
          <ProtectedRoute>
            <AIConfigPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute permission="patients.read">
            <AnalyticsDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <UserSettingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/recipes"
        element={
          <ProtectedRoute permission="recipes.read">
            <RecipesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/recipes/:id"
        element={
          <ProtectedRoute permission="recipes.read">
            <RecipeDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns"
        element={
          <ProtectedRoute permission="campaigns.read">
            <CampaignsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns/new"
        element={
          <ProtectedRoute permission="campaigns.create">
            <CampaignEditorPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns/:id/edit"
        element={
          <ProtectedRoute permission="campaigns.update">
            <CampaignEditorPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns/:id/stats"
        element={
          <ProtectedRoute permission="campaigns.read">
            <CampaignStatsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns/:id"
        element={
          <ProtectedRoute permission="campaigns.read">
            <CampaignStatsPage />
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
      theme="light"
    />
    </Suspense>
  );
}

export default App;
