/**
 * Test Data Fixtures
 * Provides test credentials and sample data for E2E tests
 */

export const TEST_USERS = {
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    displayName: 'Admin User'
  },
  nutritionist: {
    username: 'nutritionist',
    password: 'nutri123',
    role: 'nutritionist',
    displayName: 'Jane Nutritionist'
  },
  staff: {
    username: 'staff',
    password: 'staff123',
    role: 'staff',
    displayName: 'John Staff'
  }
};

export const TEST_PATIENT = {
  first_name: 'Test',
  last_name: 'Patient',
  date_of_birth: '1990-01-15',
  gender: 'male',
  email: 'test.patient@example.com',
  phone: '1234567890',
  address: '123 Test Street',
  city: 'Test City',
  state: 'TS',
  zip_code: '12345',
  emergency_contact_name: 'Emergency Contact',
  emergency_contact_phone: '9876543210'
};

export const TEST_VISIT = {
  visit_date: new Date().toISOString().split('T')[0],
  visit_type: 'Initial Consultation',
  chief_complaint: 'Weight management',
  notes: 'Patient wants to lose weight',
  weight: 75.5,
  height: 170,
  blood_pressure_systolic: 120,
  blood_pressure_diastolic: 80
};

export const TEST_INVOICE = {
  service_description: 'Nutrition Consultation',
  amount: 150.00,
  payment_status: 'pending',
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
};

export const TEST_USER = {
  username: 'testuser',
  email: 'testuser@example.com',
  password: 'Test123!',
  first_name: 'Test',
  last_name: 'User',
  role: 'staff',
  is_active: true
};

/**
 * Generate unique email to avoid duplicates
 */
export function generateUniqueEmail(prefix = 'test') {
  const timestamp = Date.now();
  return `${prefix}.${timestamp}@example.com`;
}

/**
 * Generate unique username
 */
export function generateUniqueUsername(prefix = 'user') {
  const timestamp = Date.now();
  return `${prefix}_${timestamp}`;
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get date N days from now
 */
export function getFutureDate(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
