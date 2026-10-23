/**
 * PatientDetailPage custom profile fields
 * Birth date, address and gender come with /details (custom_profile), are saved
 * straight to their custom field, and the patient is loaded before secondary data.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockAdminUser } from '../utils/testUtils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

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
  visits: [],
  custom_profile: {
    date_of_birth: { definition_id: 'def-birth', value: '1990-01-15' },
    address: { definition_id: 'def-address', value: '25 rue Chateaubriand' },
    gender: { definition_id: 'def-gender', value: 'Masculin' }
  }
};

describe('PatientDetailPage custom profile fields', () => {
  let requests;
  let patientPuts;
  let customFieldPuts;
  let releaseDetails;

  beforeEach(() => {
    requests = [];
    patientPuts = [];
    customFieldPuts = [];
    releaseDetails = null;
    server.use(
      http.get(`${API_URL}/patients/:id/details`, async () => {
        requests.push('details:start');
        if (releaseDetails) await releaseDetails;
        requests.push('details:end');
        return HttpResponse.json({ success: true, data: mockPatient });
      }),
      http.get(`${API_URL}/patients/:id/custom-fields`, () => {
        requests.push('custom-fields');
        return HttpResponse.json({ success: true, data: [] });
      }),
      http.get(`${API_URL}/documents`, () => {
        requests.push('documents');
        return HttpResponse.json({ success: true, data: [] });
      }),
      http.put(`${API_URL}/patients/:id/custom-fields`, async ({ request }) => {
        customFieldPuts.push(await request.json());
        return HttpResponse.json({ success: true, data: [] });
      }),
      http.put(`${API_URL}/patients/:id`, async ({ request }) => {
        patientPuts.push(await request.json());
        return HttpResponse.json({ success: true, data: mockPatient });
      })
    );
  });

  it('shows birth date, address and gender from /details', async () => {
    renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

    expect(await screen.findByDisplayValue('1990-01-15', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByDisplayValue('25 rue Chateaubriand')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox').some(s => s.value === 'Male')).toBe(true);
  });

  it('saves the birth date straight to its custom field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

    const dob = await screen.findByDisplayValue('1990-01-15', {}, { timeout: 3000 });
    await user.clear(dob);
    await user.type(dob, '1985-06-20{Enter}');

    await waitFor(() => expect(customFieldPuts).toEqual([
      { fields: [{ definition_id: 'def-birth', value: '1985-06-20' }] }
    ]));
    expect(patientPuts).toEqual([]);
    expect(dob).toHaveValue('1985-06-20');
  });

  it('maps the gender to the custom field value', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

    await screen.findByDisplayValue('1990-01-15', {}, { timeout: 3000 });
    const gender = screen.getAllByRole('combobox').find(s => s.value === 'Male');
    await user.selectOptions(gender, 'Female');

    await waitFor(() => expect(customFieldPuts).toEqual([
      { fields: [{ definition_id: 'def-gender', value: 'Féminin' }] }
    ]));
    expect(patientPuts).toEqual([]);
  });

  it('loads the patient before the secondary data', async () => {
    let release;
    releaseDetails = new Promise(resolve => { release = resolve; });
    renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

    await waitFor(() => expect(requests).toContain('details:start'));
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(requests).toEqual(['details:start']);

    release();
    await waitFor(() => expect(requests).toEqual(expect.arrayContaining(['documents', 'custom-fields'])));
    expect(requests.indexOf('details:end')).toBeLessThan(requests.indexOf('documents'));
    expect(requests.indexOf('details:end')).toBeLessThan(requests.indexOf('custom-fields'));
  });
});
