/**
 * i18n Configuration for Tests
 * Simplified i18n setup that returns keys as values
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Minimal translations for tests
const resources = {
  en: {
    translation: {
      // Common
      'common.loading': 'Loading...',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.create': 'Create',
      'common.search': 'Search',
      'common.filter': 'Filter',
      'common.actions': 'Actions',
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.confirm': 'Confirm',
      'common.close': 'Close',
      'common.submit': 'Submit',
      'common.back': 'Back',
      'common.next': 'Next',
      'common.error': 'Error',
      'common.success': 'Success',

      // Auth
      'auth.login': 'Login',
      'auth.logout': 'Logout',
      'auth.username': 'Username',
      'auth.password': 'Password',
      'auth.rememberMe': 'Remember me',
      'auth.loginButton': 'Sign In',
      'auth.loginError': 'Invalid credentials',

      // Navigation
      'nav.dashboard': 'Dashboard',
      'nav.patients': 'Patients',
      'nav.visits': 'Visits',
      'nav.billing': 'Billing',
      'nav.reports': 'Reports',
      'nav.settings': 'Settings',

      // Patients
      'patients.title': 'Patients',
      'patients.newPatient': 'New Patient',
      'patients.firstName': 'First Name',
      'patients.lastName': 'Last Name',
      'patients.email': 'Email',
      'patients.phone': 'Phone',
      'patients.dateOfBirth': 'Date of Birth',
      'patients.noPatients': 'No patients found',

      // Visits
      'visits.title': 'Visits',
      'visits.newVisit': 'New Visit',
      'visits.date': 'Date',
      'visits.type': 'Type',
      'visits.status': 'Status',
      'visits.patient': 'Patient',
      'visits.dietitian': 'Dietitian',

      // Billing
      'billing.title': 'Billing',
      'billing.newInvoice': 'New Invoice',
      'billing.invoiceNumber': 'Invoice Number',
      'billing.amount': 'Amount',
      'billing.status': 'Status',
      'billing.dueDate': 'Due Date',

      // Forms
      'form.required': 'This field is required',
      'form.invalidEmail': 'Invalid email address',
      'form.minLength': 'Minimum {{min}} characters required',
      'form.maxLength': 'Maximum {{max}} characters allowed',
      'forms.required': 'This field is required',
      'forms.minLength': 'Minimum {{count}} characters',
      'forms.maxLength': 'Maximum {{count}} characters',

      // Patients extended
      'patients.createPatient': 'Create Patient',
      'patients.management': 'Patient Management',
      'patients.confirmDelete': 'Are you sure you want to delete this patient?',
      'patients.searchPlaceholder': 'Search by name, email, or phone',
      'patients.showingResults': 'Showing {{count}} of {{total}} patients',

      // Dashboard
      'dashboard.welcomeBack': 'Welcome back, {{username}}',
      'dashboard.myDay': 'My Day',
      'dashboard.myOffice': 'My Office',
      'dashboard.quickPatient': 'Quick Patient',
      'dashboard.scheduleVisit': 'Schedule Visit',
      'dashboard.viewAgenda': 'View Agenda',
      'dashboard.todaysAppointments': "Today's Appointments",
      'dashboard.noAppointmentsToday': 'No appointments today',
      'dashboard.completedToday': 'Completed Today',
      'dashboard.upcomingVisits': 'Upcoming Visits',
      'dashboard.activePatients': 'Active Patients',
      'dashboard.quickStats': 'Quick Stats',
      'dashboard.totalPatients': 'Total Patients',
      'dashboard.scheduledVisits': 'Scheduled Visits',
      'dashboard.totalVisits': 'Total Visits',
      'dashboard.totalUsers': 'Total Users',
      'dashboard.yourRole': 'Your Role',
      'dashboard.managePatientRecords': 'Manage patient records',
      'dashboard.scheduleAndTrackVisits': 'Schedule and track visits',
      'dashboard.manageInvoicesAndPayments': 'Manage invoices and payments',
      'dashboard.viewPatients': 'View Patients',
      'dashboard.viewBilling': 'View Billing',

      // Errors
      'errors.failedToLoadPatients': 'Failed to load patients: {{error}}'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
