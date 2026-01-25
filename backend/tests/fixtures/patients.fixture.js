/**
 * Patient Fixtures
 * Test data for patient-related tests
 */

/**
 * Valid patient creation data
 */
const validPatient = {
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane.smith@patient.com',
  phone: '+1234567890',
  date_of_birth: '1990-05-15',
  gender: 'female',
  address: '123 Main Street',
  city: 'Paris',
  postal_code: '75001',
  country: 'France',
  emergency_contact_name: 'John Smith',
  emergency_contact_phone: '+1234567891',
  notes: 'Test patient notes'
};

/**
 * Minimal valid patient (only required fields)
 */
const minimalPatient = {
  first_name: 'Minimal',
  last_name: 'Patient'
};

/**
 * Multiple patients for list testing
 */
const patientsList = [
  {
    first_name: 'Alice',
    last_name: 'Johnson',
    email: 'alice.johnson@patient.com',
    phone: '+1111111111',
    date_of_birth: '1985-03-20',
    gender: 'female'
  },
  {
    first_name: 'Bob',
    last_name: 'Williams',
    email: 'bob.williams@patient.com',
    phone: '+2222222222',
    date_of_birth: '1978-07-10',
    gender: 'male'
  },
  {
    first_name: 'Carol',
    last_name: 'Brown',
    email: 'carol.brown@patient.com',
    phone: '+3333333333',
    date_of_birth: '1995-11-25',
    gender: 'female'
  },
  {
    first_name: 'David',
    last_name: 'Davis',
    email: 'david.davis@patient.com',
    phone: '+4444444444',
    date_of_birth: '1982-01-05',
    gender: 'male'
  },
  {
    first_name: 'Eve',
    last_name: 'Miller',
    email: 'eve.miller@patient.com',
    phone: '+5555555555',
    date_of_birth: '2000-09-15',
    gender: 'female'
  }
];

/**
 * Invalid patient data scenarios
 */
const invalidPatients = {
  missingFirstName: {
    last_name: 'Patient'
  },
  missingLastName: {
    first_name: 'Patient'
  },
  invalidEmail: {
    first_name: 'Test',
    last_name: 'Patient',
    email: 'not-valid-email'
  },
  invalidGender: {
    first_name: 'Test',
    last_name: 'Patient',
    gender: 'invalid'
  },
  invalidDate: {
    first_name: 'Test',
    last_name: 'Patient',
    date_of_birth: 'not-a-date'
  },
  futureBirthDate: {
    first_name: 'Test',
    last_name: 'Patient',
    date_of_birth: '2099-01-01'
  }
};

/**
 * Patient update data
 */
const patientUpdates = {
  valid: {
    first_name: 'Updated',
    last_name: 'Patient',
    phone: '+9999999999'
  },
  invalidEmail: {
    email: 'invalid-email'
  },
  changeGender: {
    gender: 'male'
  }
};

/**
 * Search/filter parameters
 */
const searchParams = {
  byName: { search: 'Alice' },
  byEmail: { search: 'bob.williams@patient.com' },
  byGender: { gender: 'female' },
  paginated: { page: 1, limit: 2 },
  sortByName: { sortBy: 'last_name', sortOrder: 'asc' }
};

/**
 * Patient with all fields populated
 */
const fullPatient = {
  first_name: 'Complete',
  last_name: 'Patient',
  email: 'complete.patient@test.com',
  phone: '+1234567890',
  date_of_birth: '1990-06-15',
  gender: 'other',
  address: '456 Oak Avenue, Apt 7B',
  city: 'Lyon',
  postal_code: '69001',
  country: 'France',
  emergency_contact_name: 'Emergency Contact',
  emergency_contact_phone: '+0987654321',
  notes: 'Complete patient record with all fields filled in for testing purposes.',
  medical_history: 'No significant medical history',
  allergies: 'None known',
  language_preference: 'fr'
};

module.exports = {
  validPatient,
  minimalPatient,
  patientsList,
  invalidPatients,
  patientUpdates,
  searchParams,
  fullPatient
};
