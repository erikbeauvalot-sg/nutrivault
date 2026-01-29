/**
 * MSW Request Handlers
 * Mock API responses for testing
 */

import { http, HttpResponse } from 'msw';

// Use relative URL to match requests from api.js (baseURL: '/api')
const API_URL = '/api';

// Mock data
export const mockPatients = [
  {
    id: 'patient-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@test.com',
    phone: '+1234567890',
    date_of_birth: '1990-01-15',
    gender: 'male',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'patient-2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@test.com',
    phone: '+0987654321',
    date_of_birth: '1985-06-20',
    gender: 'female',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z'
  }
];

export const mockVisits = [
  {
    id: 'visit-1',
    patient_id: 'patient-1',
    dietitian_id: 'dietitian-1',
    visit_date: '2024-02-01',
    visit_type: 'Initial Consultation',
    status: 'COMPLETED',
    duration_minutes: 60,
    patient: mockPatients[0],
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'visit-2',
    patient_id: 'patient-2',
    dietitian_id: 'dietitian-1',
    visit_date: '2024-02-15',
    visit_type: 'Follow-up',
    status: 'SCHEDULED',
    duration_minutes: 30,
    patient: mockPatients[1],
    created_at: '2024-02-01T00:00:00Z'
  }
];

export const mockInvoices = [
  {
    id: 'invoice-1',
    invoice_number: 'INV-2024-001',
    patient_id: 'patient-1',
    amount: 85.00,
    total_amount: 85.00,
    status: 'PAID',
    invoice_date: '2024-02-01',
    due_date: '2024-03-01',
    patient: mockPatients[0]
  },
  {
    id: 'invoice-2',
    invoice_number: 'INV-2024-002',
    patient_id: 'patient-2',
    amount: 120.00,
    total_amount: 120.00,
    status: 'SENT',
    invoice_date: '2024-02-15',
    due_date: '2024-03-15',
    patient: mockPatients[1]
  }
];

export const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@test.com',
  first_name: 'Test',
  last_name: 'User',
  role: { id: 'role-1', name: 'ADMIN' },
  permissions: ['patients.read', 'patients.create', 'visits.read', 'billing.read']
};

// Request handlers
export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json();
    if (body.username === 'admin' && body.password === 'password') {
      return HttpResponse.json({
        success: true,
        data: {
          user: mockUser,
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token'
        }
      });
    }
    return HttpResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post(`${API_URL}/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_URL}/auth/refresh`, () => {
    return HttpResponse.json({
      success: true,
      data: { accessToken: 'new-mock-access-token' }
    });
  }),

  // Patients endpoints
  http.get(`${API_URL}/patients`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');

    let patients = [...mockPatients];
    if (search) {
      patients = patients.filter(p =>
        p.first_name.toLowerCase().includes(search.toLowerCase()) ||
        p.last_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return HttpResponse.json({
      success: true,
      data: patients,
      pagination: {
        total: patients.length,
        page: 1,
        limit: 20,
        totalPages: 1
      }
    });
  }),

  http.get(`${API_URL}/patients/:id`, ({ params }) => {
    const patient = mockPatients.find(p => p.id === params.id);
    if (patient) {
      return HttpResponse.json({ success: true, data: patient });
    }
    return HttpResponse.json(
      { success: false, error: 'Patient not found' },
      { status: 404 }
    );
  }),

  http.post(`${API_URL}/patients`, async ({ request }) => {
    const body = await request.json();
    const newPatient = {
      id: `patient-${Date.now()}`,
      ...body,
      is_active: true,
      created_at: new Date().toISOString()
    };
    return HttpResponse.json({ success: true, data: newPatient }, { status: 201 });
  }),

  http.put(`${API_URL}/patients/:id`, async ({ params, request }) => {
    const body = await request.json();
    const patient = mockPatients.find(p => p.id === params.id);
    if (patient) {
      const updated = { ...patient, ...body };
      return HttpResponse.json({ success: true, data: updated });
    }
    return HttpResponse.json(
      { success: false, error: 'Patient not found' },
      { status: 404 }
    );
  }),

  http.delete(`${API_URL}/patients/:id`, ({ params }) => {
    const patient = mockPatients.find(p => p.id === params.id);
    if (patient) {
      return HttpResponse.json({ success: true, message: 'Patient deleted' });
    }
    return HttpResponse.json(
      { success: false, error: 'Patient not found' },
      { status: 404 }
    );
  }),

  // Visits endpoints
  http.get(`${API_URL}/visits`, () => {
    return HttpResponse.json({
      success: true,
      data: mockVisits,
      pagination: {
        total: mockVisits.length,
        page: 1,
        limit: 20,
        totalPages: 1
      }
    });
  }),

  http.get(`${API_URL}/visits/:id`, ({ params }) => {
    const visit = mockVisits.find(v => v.id === params.id);
    if (visit) {
      return HttpResponse.json({ success: true, data: visit });
    }
    return HttpResponse.json(
      { success: false, error: 'Visit not found' },
      { status: 404 }
    );
  }),

  http.post(`${API_URL}/visits`, async ({ request }) => {
    const body = await request.json();
    const newVisit = {
      id: `visit-${Date.now()}`,
      ...body,
      status: body.status || 'SCHEDULED',
      created_at: new Date().toISOString()
    };
    return HttpResponse.json({ success: true, data: newVisit }, { status: 201 });
  }),

  // Billing endpoints
  http.get(`${API_URL}/billing`, () => {
    return HttpResponse.json({
      success: true,
      data: mockInvoices,
      pagination: {
        total: mockInvoices.length,
        page: 1,
        limit: 20,
        totalPages: 1
      }
    });
  }),

  http.get(`${API_URL}/billing/:id`, ({ params }) => {
    const invoice = mockInvoices.find(i => i.id === params.id);
    if (invoice) {
      return HttpResponse.json({ success: true, data: invoice });
    }
    return HttpResponse.json(
      { success: false, error: 'Invoice not found' },
      { status: 404 }
    );
  }),

  // Dashboard/statistics endpoint
  http.get(`${API_URL}/dashboard/statistics`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalPatients: 25,
        activePatients: 20,
        todayVisits: 5,
        pendingInvoices: 3,
        totalRevenue: 5000,
        monthlyRevenue: 1500
      }
    });
  }),

  // Users endpoint
  http.get(`${API_URL}/users`, () => {
    return HttpResponse.json({
      success: true,
      data: [mockUser]
    });
  }),

  // Roles endpoint
  http.get(`${API_URL}/roles`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 'role-1', name: 'ADMIN', description: 'Administrator' },
        { id: 'role-2', name: 'DIETITIAN', description: 'Dietitian' },
        { id: 'role-3', name: 'ASSISTANT', description: 'Assistant' }
      ]
    });
  }),

  // Alerts endpoint - returns categorized alerts with summary
  http.get(`${API_URL}/alerts`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        overdue_invoices: [
          {
            type: 'OVERDUE_INVOICE',
            severity: 'warning',
            invoice_id: 'invoice-2',
            invoice_number: 'INV-2024-002',
            patient_id: 'patient-2',
            patient_name: 'Jane Smith',
            amount_due: 120.00,
            due_date: '2024-02-15',
            days_overdue: 10,
            message: 'Invoice #INV-2024-002 overdue by 10 days',
            action: 'send_reminder'
          }
        ],
        overdue_visits: [],
        visits_without_notes: [],
        patients_followup: [],
        summary: {
          total_count: 1,
          critical_count: 0,
          warning_count: 1,
          info_count: 0
        }
      }
    });
  }),

  // Measure alerts endpoint - returns alerts with grouped summary
  // Note: Using patient-2 (Jane Smith) to avoid conflicts with visit tests that use John Doe
  http.get(`${API_URL}/measure-alerts`, () => {
    const alerts = [
      {
        id: 'measure-alert-1',
        patient_id: 'patient-2',
        measure_definition_id: 'measure-def-1',
        value: 180,
        severity: 'warning',
        message: 'Blood pressure is above normal range',
        is_acknowledged: false,
        created_at: '2024-02-18T10:00:00Z',
        patient: mockPatients[1],
        measureDefinition: {
          id: 'measure-def-1',
          name: 'blood_pressure_systolic',
          display_name: 'Blood Pressure (Systolic)',
          unit: 'mmHg'
        }
      }
    ];
    return HttpResponse.json({
      success: true,
      data: alerts,
      grouped: {
        critical: [],
        warning: alerts,
        info: []
      },
      count: alerts.length,
      summary: {
        critical: 0,
        warning: 1,
        info: 0
      }
    });
  })
];

export default handlers;
