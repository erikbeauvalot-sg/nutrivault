/**
 * PatientDetailPage health score option
 * The score is only requested and shown when the app setting enables it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, mockAdminUser } from '../utils/testUtils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { clearAppSettingsCache } from '../../src/services/appSettingsService';

import PatientDetailPage from '../../src/pages/PatientDetailPage';

const API_URL = '/api';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'test-id-123' }),
    useLocation: () => ({ pathname: '/', state: null })
  };
});

const mockPatient = {
  id: 'test-id-123',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@test.com',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  visits: []
};

const healthScore = {
  score: 87,
  riskLevel: 'low',
  components: { measureCompliance: 90, outOfRangePercent: 5, visitCompliance: 80 },
  details: {}
};

describe('PatientDetailPage health score option', () => {
  let healthScoreRequests;

  const setup = (enabled) => {
    server.use(
      http.get(`${API_URL}/app-settings`, () =>
        HttpResponse.json({ success: true, data: { patient_health_score_enabled: enabled } })),
      http.get(`${API_URL}/patients/:id/details`, () =>
        HttpResponse.json({ success: true, data: mockPatient })),
      http.get(`${API_URL}/patients/:id/custom-fields`, () =>
        HttpResponse.json({ success: true, data: [] })),
      http.get(`${API_URL}/analytics/patient-health-score/:id`, () => {
        healthScoreRequests += 1;
        return HttpResponse.json({ success: true, data: healthScore });
      })
    );
  };

  beforeEach(() => {
    healthScoreRequests = 0;
    clearAppSettingsCache();
  });

  it('does not request nor show the score when disabled', async () => {
    setup(false);
    renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

    await screen.findByDisplayValue('john@test.com', {}, { timeout: 3000 });
    // Let pending effects settle
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(healthScoreRequests).toBe(0);
    expect(screen.queryByText('87')).not.toBeInTheDocument();
  });

  it('requests and shows the score when enabled', async () => {
    setup(true);
    renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

    expect(await screen.findByText('87', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(healthScoreRequests).toBe(1);
  });
});
