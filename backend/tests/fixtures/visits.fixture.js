/**
 * Visit Fixtures
 * Test data for visit-related tests
 */

/**
 * Get a date in the future
 * @param {number} daysFromNow - Days from today
 * @returns {string} ISO date string
 */
function getFutureDate(daysFromNow = 7) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * Get a date in the past
 * @param {number} daysAgo - Days ago from today
 * @returns {string} ISO date string
 */
function getPastDate(daysAgo = 7) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * Valid visit creation data
 * Note: patient_id and dietitian_id must be set dynamically in tests
 */
const validVisit = {
  visit_date: getFutureDate(7),
  visit_time: '10:00',
  visit_type: 'initial',
  status: 'SCHEDULED',
  duration_minutes: 60,
  reason: 'Initial consultation for weight management',
  notes: 'New patient, first visit'
};

/**
 * Minimal visit (only required fields)
 */
const minimalVisit = {
  visit_date: getFutureDate(7),
  visit_type: 'follow_up',
  status: 'SCHEDULED'
};

/**
 * Different visit types
 */
const visitTypes = {
  initial: {
    visit_date: getFutureDate(7),
    visit_type: 'initial',
    status: 'SCHEDULED',
    duration_minutes: 60,
    reason: 'Initial consultation'
  },
  followUp: {
    visit_date: getFutureDate(14),
    visit_type: 'follow_up',
    status: 'SCHEDULED',
    duration_minutes: 30,
    reason: 'Follow-up appointment'
  },
  emergency: {
    visit_date: getFutureDate(1),
    visit_type: 'emergency',
    status: 'SCHEDULED',
    duration_minutes: 45,
    reason: 'Urgent dietary concerns'
  }
};

/**
 * Visit status transitions
 */
const visitStatuses = {
  scheduled: {
    visit_date: getFutureDate(7),
    visit_type: 'follow_up',
    status: 'SCHEDULED'
  },
  confirmed: {
    visit_date: getFutureDate(7),
    visit_type: 'follow_up',
    status: 'SCHEDULED'
  },
  completed: {
    visit_date: getPastDate(1),
    visit_type: 'follow_up',
    status: 'COMPLETED'
  },
  cancelled: {
    visit_date: getFutureDate(7),
    visit_type: 'follow_up',
    status: 'CANCELLED',
    cancellation_reason: 'Patient requested cancellation'
  },
  noShow: {
    visit_date: getPastDate(1),
    visit_type: 'follow_up',
    status: 'NO_SHOW'
  }
};

/**
 * Multiple visits for a patient (timeline testing)
 */
const visitTimeline = [
  {
    visit_date: getPastDate(60),
    visit_type: 'initial',
    status: 'COMPLETED',
    duration_minutes: 60,
    reason: 'Initial assessment'
  },
  {
    visit_date: getPastDate(30),
    visit_type: 'follow_up',
    status: 'COMPLETED',
    duration_minutes: 30,
    reason: 'First follow-up'
  },
  {
    visit_date: getPastDate(7),
    visit_type: 'follow_up',
    status: 'COMPLETED',
    duration_minutes: 30,
    reason: 'Progress check'
  },
  {
    visit_date: getFutureDate(7),
    visit_type: 'follow_up',
    status: 'SCHEDULED',
    duration_minutes: 30,
    reason: 'Upcoming follow-up'
  }
];

/**
 * Invalid visit data scenarios
 */
const invalidVisits = {
  missingDate: {
    visit_type: 'follow_up',
    status: 'SCHEDULED'
  },
  missingType: {
    visit_date: getFutureDate(7),
    status: 'SCHEDULED'
  },
  invalidType: {
    visit_date: getFutureDate(7),
    visit_type: 'invalid_type',
    status: 'SCHEDULED'
  },
  invalidStatus: {
    visit_date: getFutureDate(7),
    visit_type: 'follow_up',
    status: 'invalid_status'
  },
  invalidDate: {
    visit_date: 'not-a-date',
    visit_type: 'follow_up',
    status: 'SCHEDULED'
  },
  negativeDuration: {
    visit_date: getFutureDate(7),
    visit_type: 'follow_up',
    status: 'SCHEDULED',
    duration_minutes: -30
  }
};

/**
 * Visit update data
 */
const visitUpdates = {
  reschedule: {
    visit_date: getFutureDate(14),
    visit_time: '14:00'
  },
  complete: {
    status: 'COMPLETED',
    notes: 'Visit completed successfully. Patient making good progress.'
  },
  cancel: {
    status: 'CANCELLED',
    cancellation_reason: 'Patient requested rescheduling'
  },
  addNotes: {
    notes: 'Updated visit notes with additional information'
  }
};

/**
 * Visit with measurements (for measurement tests)
 */
const visitWithMeasurements = {
  visit_date: getFutureDate(7),
  visit_type: 'follow_up',
  status: 'COMPLETED',
  measurements: {
    weight: 75.5,
    height: 175,
    bmi: 24.7,
    body_fat_percentage: 22.5,
    muscle_mass: 35.2,
    waist_circumference: 85,
    hip_circumference: 100
  }
};

/**
 * Search/filter parameters
 */
const searchParams = {
  byStatus: { status: 'SCHEDULED' },
  byType: { visit_type: 'follow_up' },
  byDateRange: {
    start_date: getPastDate(30),
    end_date: getFutureDate(30)
  },
  upcoming: { upcoming: true },
  paginated: { page: 1, limit: 5 }
};

module.exports = {
  getFutureDate,
  getPastDate,
  validVisit,
  minimalVisit,
  visitTypes,
  visitStatuses,
  visitTimeline,
  invalidVisits,
  visitUpdates,
  visitWithMeasurements,
  searchParams
};
