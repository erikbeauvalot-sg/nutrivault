/**
 * PatientDetailPage inline editing tests
 * Fields must keep focus while typing and only save on Enter / blur.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockAdminUser } from '../utils/testUtils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { toast } from 'react-toastify';

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
  phone: '+1234567890',
  date_of_birth: '1990-01-15',
  gender: 'Male',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  tags: [],
  visits: [],
  invoices: [],
  linked_dietitians: [{ id: 'diet-1', first_name: 'Marie', last_name: 'Curie' }]
};

// PUT /patients/:id returns the bare patient, without the relations loaded by /details
const { visits, invoices, linked_dietitians, ...plainPatient } = mockPatient;

describe('PatientDetailPage inline editing', () => {
  let updateBodies;

  beforeEach(() => {
    updateBodies = [];
    vi.spyOn(toast, 'error').mockImplementation(() => {});
    server.use(
      http.get(`${API_URL}/patients/:id/details`, () =>
        HttpResponse.json({ success: true, data: mockPatient })),
      http.get(`${API_URL}/patients/:id/custom-fields`, () =>
        HttpResponse.json({ success: true, data: [] })),
      http.put(`${API_URL}/patients/:id`, async ({ request }) => {
        const body = await request.json();
        updateBodies.push(body);
        if (body.email !== undefined && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
          return HttpResponse.json(
            { success: false, error: 'Validation failed', details: [{ msg: 'Invalid email format' }] },
            { status: 400 }
          );
        }
        return HttpResponse.json({ success: true, data: { ...plainPatient, ...body } });
      })
    );
  });

  const getEmailInput = () => screen.findByDisplayValue('john@test.com', {}, { timeout: 3000 });

  it('keeps focus and does not save while typing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

    const input = await getEmailInput();
    await user.clear(input);
    await user.type(input, 'jane@test.com');

    expect(input).toHaveFocus();
    expect(input).toHaveValue('jane@test.com');
    expect(updateBodies).toHaveLength(0);
  });

  it('saves once when Enter is pressed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

    const input = await getEmailInput();
    await user.clear(input);
    await user.type(input, 'jane@test.com{Enter}');

    await waitFor(() => expect(updateBodies).toEqual([{ email: 'jane@test.com' }]));
    expect(input).not.toHaveFocus();
  });

  it('restores the saved value on Escape without saving', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

    const input = await getEmailInput();
    await user.clear(input);
    await user.type(input, 'jane{Escape}');

    await waitFor(() => expect(input).toHaveValue('john@test.com'));
    expect(updateBodies).toHaveLength(0);
  });

  it('shows the validation detail instead of a generic error', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

    const input = await getEmailInput();
    await user.clear(input);
    await user.type(input, 'not-an-email{Enter}');

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid email format'));
    await waitFor(() => expect(input).toHaveValue('john@test.com'));
  });

  it('keeps the other patient information after saving a field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

    const dob = await screen.findByDisplayValue('1990-01-15', {}, { timeout: 3000 });
    expect(screen.getByText('Marie Curie', { exact: false })).toBeInTheDocument();

    await user.clear(dob);
    await user.type(dob, '1985-06-20{Enter}');

    await waitFor(() => expect(updateBodies).toEqual([{ date_of_birth: '1985-06-20' }]));
    await waitFor(() => expect(dob).toHaveValue('1985-06-20'));
    expect(screen.getByDisplayValue('john@test.com')).toBeInTheDocument();
    expect(screen.getByText('Marie Curie', { exact: false })).toBeInTheDocument();
  });

  it('does not erase what is typed in another field while a save is in flight', async () => {
    server.use(
      http.put(`${API_URL}/patients/:id`, async ({ request }) => {
        const body = await request.json();
        updateBodies.push(body);
        await new Promise(resolve => setTimeout(resolve, 300));
        return HttpResponse.json({ success: true, data: { ...plainPatient, ...body } });
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

    const dob = await screen.findByDisplayValue('1990-01-15', {}, { timeout: 3000 });
    const lastName = screen.getByDisplayValue('Doe');

    await user.clear(dob);
    await user.type(dob, '1985-06-20{Enter}');
    await user.click(lastName);
    await user.type(lastName, '-Smith');

    await waitFor(() => expect(dob).toHaveValue('1985-06-20'));
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(lastName).toHaveValue('Doe-Smith');
    expect(updateBodies).toEqual([{ date_of_birth: '1985-06-20' }]);
  });
});
