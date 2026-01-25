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
      'form.maxLength': 'Maximum {{max}} characters allowed'
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
