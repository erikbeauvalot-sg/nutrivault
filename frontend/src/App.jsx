/**
 * App Component
 * Main application router with protected routes
 * Implements lazy loading for performance optimization (US-9.2)
 */

import { lazy, Suspense, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PatientProtectedRoute from './components/PatientProtectedRoute';
import usePageTracking from './hooks/usePageTracking';
import useBiometricAuth from './hooks/useBiometricAuth';
import BiometricLockScreen from './components/BiometricLockScreen';
import { isNative } from './utils/platform';
import * as biometricService from './services/biometricService';

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
const SharedDocumentPage = lazy(() => import('./pages/SharedDocumentPage'));
const MarionDietPage = lazy(() => import('./pages/MarionDietPage'));
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const CampaignEditorPage = lazy(() => import('./pages/CampaignEditorPage'));
const CampaignStatsPage = lazy(() => import('./pages/CampaignStatsPage'));
const ThemeManagementPage = lazy(() => import('./pages/ThemeManagementPage'));
const ScheduledTasksPage = lazy(() => import('./pages/ScheduledTasksPage'));
const DiscordWebhookPage = lazy(() => import('./pages/DiscordWebhookPage'));

// Patient Portal pages
const PatientPortalDashboard = lazy(() => import('./pages/portal/PatientPortalDashboard'));
const PatientPortalMeasures = lazy(() => import('./pages/portal/PatientPortalMeasures'));
const PatientPortalVisits = lazy(() => import('./pages/portal/PatientPortalVisits'));
const PatientPortalDocuments = lazy(() => import('./pages/portal/PatientPortalDocuments'));
const PatientPortalRecipes = lazy(() => import('./pages/portal/PatientPortalRecipes'));
const PatientPortalRecipeDetail = lazy(() => import('./pages/portal/PatientPortalRecipeDetail'));
const PatientPortalProfile = lazy(() => import('./pages/portal/PatientPortalProfile'));
const PatientPortalJournal = lazy(() => import('./pages/portal/PatientPortalJournal'));
const PatientPortalInvoices = lazy(() => import('./pages/portal/PatientPortalInvoices'));
const PatientPortalRadar = lazy(() => import('./pages/portal/PatientPortalRadar'));
const SetPasswordPage = lazy(() => import('./pages/portal/SetPasswordPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

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
  const { loading, isAuthenticated, user, biometricUnlocked, biometricLogin, setBiometricUnlockedState } = useAuth();
  const { biometricName, biometricEnabled, authenticateWithBiometric } = useBiometricAuth();
  usePageTracking();

  // Biometric lock screen handler
  const handleBiometricAuth = useCallback(async () => {
    const result = await authenticateWithBiometric('Unlock NutriVault');
    if (result) {
      const success = await biometricLogin(result.refreshToken);
      return success;
    }
    return false;
  }, [authenticateWithBiometric, biometricLogin]);

  const handleFallbackToPassword = useCallback(() => {
    // Clear biometric state and go to login
    setBiometricUnlockedState(true);
  }, [setBiometricUnlockedState]);

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

  // Show biometric lock screen on native when biometric is enabled but not yet unlocked
  if (isNative && biometricEnabled && biometricService.isBiometricEnabled() && !biometricUnlocked && !isAuthenticated) {
    return (
      <BiometricLockScreen
        biometricName={biometricName}
        onAuthenticated={handleBiometricAuth}
        onFallbackToPassword={handleFallbackToPassword}
      />
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated
              ? <Navigate to={user?.role === 'PATIENT' ? '/portal' : '/dashboard'} replace />
              : <LoginPage />
          }
        />

        {/* Forgot / Reset Password (Public) */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

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
        path="/settings/scheduled-tasks"
        element={
          <ProtectedRoute>
            <ScheduledTasksPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/discord"
        element={
          <ProtectedRoute>
            <DiscordWebhookPage />
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

      {/* Patient Portal: Set Password (Public) */}
      <Route path="/portal/set-password" element={<SetPasswordPage />} />

      {/* Patient Portal Routes (Protected - PATIENT role only) */}
      <Route path="/portal" element={<PatientProtectedRoute><PatientPortalDashboard /></PatientProtectedRoute>} />
      <Route path="/portal/radar" element={<PatientProtectedRoute><PatientPortalRadar /></PatientProtectedRoute>} />
      <Route path="/portal/measures" element={<PatientProtectedRoute><PatientPortalMeasures /></PatientProtectedRoute>} />
      <Route path="/portal/visits" element={<PatientProtectedRoute><PatientPortalVisits /></PatientProtectedRoute>} />
      <Route path="/portal/documents" element={<PatientProtectedRoute><PatientPortalDocuments /></PatientProtectedRoute>} />
      <Route path="/portal/journal" element={<PatientProtectedRoute><PatientPortalJournal /></PatientProtectedRoute>} />
      <Route path="/portal/invoices" element={<PatientProtectedRoute><PatientPortalInvoices /></PatientProtectedRoute>} />
      <Route path="/portal/recipes" element={<PatientProtectedRoute><PatientPortalRecipes /></PatientProtectedRoute>} />
      <Route path="/portal/recipes/:id" element={<PatientProtectedRoute><PatientPortalRecipeDetail /></PatientProtectedRoute>} />
      <Route path="/portal/profile" element={<PatientProtectedRoute><PatientPortalProfile /></PatientProtectedRoute>} />

      {/* Default Route */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? (user?.role === 'PATIENT' ? '/portal' : '/dashboard') : '/login'} replace />}
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
