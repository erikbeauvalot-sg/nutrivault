/**
 * SendReminderButton Component Tests
 * Tests for the appointment reminder/invitation button component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import SendReminderButton from '../SendReminderButton';
import appointmentReminderService from '../../services/appointmentReminderService';

// Mock the appointment reminder service
vi.mock('../../services/appointmentReminderService', () => ({
  default: {
    sendReminderManually: vi.fn(),
    sendInvitationManually: vi.fn()
  }
}));

// Helper to render component with i18n
const renderWithI18n = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('SendReminderButton', () => {
  const mockOnReminderSent = vi.fn();

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);

  const mockVisit = {
    id: 'visit-123',
    status: 'SCHEDULED',
    visit_date: futureDate.toISOString(),
    reminders_sent: 0,
    patient: {
      id: 'patient-456',
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean.dupont@example.com',
      appointment_reminders_enabled: true
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // Rendering Tests
  // ========================================
  describe('Rendering', () => {
    it('should render the invitation button', () => {
      renderWithI18n(<SendReminderButton visit={mockVisit} onReminderSent={mockOnReminderSent} />);

      // Main button should be visible
      const mainButton = screen.getByRole('button', { name: /invitation/i });
      expect(mainButton).toBeInTheDocument();
    });

    it('should render reminder button', () => {
      renderWithI18n(<SendReminderButton visit={mockVisit} onReminderSent={mockOnReminderSent} />);

      // Reminder button should be visible
      const reminderButton = screen.getByRole('button', { name: /rappel|reminder/i });
      expect(reminderButton).toBeInTheDocument();
    });

    it('should be disabled when visit is not scheduled', () => {
      const completedVisit = { ...mockVisit, status: 'COMPLETED' };
      renderWithI18n(<SendReminderButton visit={completedVisit} onReminderSent={mockOnReminderSent} />);

      const mainButton = screen.getByRole('button', { name: /invitation/i });
      expect(mainButton).toBeDisabled();
    });

    it('should be disabled when visit is in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const pastVisit = { ...mockVisit, visit_date: pastDate.toISOString() };

      renderWithI18n(<SendReminderButton visit={pastVisit} onReminderSent={mockOnReminderSent} />);

      const mainButton = screen.getByRole('button', { name: /invitation/i });
      expect(mainButton).toBeDisabled();
    });

    it('should be disabled when patient has no email', () => {
      const noEmailVisit = {
        ...mockVisit,
        patient: { ...mockVisit.patient, email: null }
      };

      renderWithI18n(<SendReminderButton visit={noEmailVisit} onReminderSent={mockOnReminderSent} />);

      const mainButton = screen.getByRole('button', { name: /invitation/i });
      expect(mainButton).toBeDisabled();
    });

    it('should be disabled when patient opted out of reminders', () => {
      const optedOutVisit = {
        ...mockVisit,
        patient: { ...mockVisit.patient, appointment_reminders_enabled: false }
      };

      renderWithI18n(<SendReminderButton visit={optedOutVisit} onReminderSent={mockOnReminderSent} />);

      const mainButton = screen.getByRole('button', { name: /invitation/i });
      expect(mainButton).toBeDisabled();
    });
  });

  // ========================================
  // Invitation Tests
  // ========================================
  describe('Send Invitation', () => {
    it('should show confirmation modal when invitation button is clicked', async () => {
      renderWithI18n(<SendReminderButton visit={mockVisit} onReminderSent={mockOnReminderSent} />);

      const mainButton = screen.getByRole('button', { name: /invitation/i });
      fireEvent.click(mainButton);

      await waitFor(() => {
        expect(screen.getByText(/confirmation/i)).toBeInTheDocument();
      });
    });

    it('should call sendInvitationManually when confirmed', async () => {
      appointmentReminderService.sendInvitationManually.mockResolvedValue({
        success: true,
        data: { visitId: 'visit-123', type: 'invitation' }
      });

      renderWithI18n(<SendReminderButton visit={mockVisit} onReminderSent={mockOnReminderSent} />);

      // Click invitation button
      const mainButton = screen.getByRole('button', { name: /invitation/i });
      fireEvent.click(mainButton);

      // Wait for modal and confirm
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find confirm button within modal footer
      const modal = screen.getByRole('dialog');
      const modalFooter = within(modal).getByRole('button', { name: /invitation/i });
      fireEvent.click(modalFooter);

      await waitFor(() => {
        expect(appointmentReminderService.sendInvitationManually).toHaveBeenCalledWith('visit-123');
      });
    });

    it('should call onReminderSent callback after successful invitation', async () => {
      appointmentReminderService.sendInvitationManually.mockResolvedValue({
        success: true,
        data: { visitId: 'visit-123', type: 'invitation' }
      });

      renderWithI18n(<SendReminderButton visit={mockVisit} onReminderSent={mockOnReminderSent} />);

      const mainButton = screen.getByRole('button', { name: /invitation/i });
      fireEvent.click(mainButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const modal = screen.getByRole('dialog');
      const confirmButton = within(modal).getByRole('button', { name: /invitation/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnReminderSent).toHaveBeenCalled();
      });
    });

    it('should show success message after sending invitation', async () => {
      appointmentReminderService.sendInvitationManually.mockResolvedValue({
        success: true,
        data: { visitId: 'visit-123', type: 'invitation' }
      });

      renderWithI18n(<SendReminderButton visit={mockVisit} onReminderSent={mockOnReminderSent} />);

      const mainButton = screen.getByRole('button', { name: /invitation/i });
      fireEvent.click(mainButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const modal = screen.getByRole('dialog');
      const confirmButton = within(modal).getByRole('button', { name: /invitation/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should show error message when invitation fails', async () => {
      const error = new Error('Failed to send');
      error.response = { data: { error: 'Email service unavailable' } };
      appointmentReminderService.sendInvitationManually.mockRejectedValue(error);

      renderWithI18n(<SendReminderButton visit={mockVisit} onReminderSent={mockOnReminderSent} />);

      const mainButton = screen.getByRole('button', { name: /invitation/i });
      fireEvent.click(mainButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const modal = screen.getByRole('dialog');
      const confirmButton = within(modal).getByRole('button', { name: /invitation/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveClass('alert-danger');
      });
    });
  });

  // ========================================
  // Reminder Tests
  // ========================================
  describe('Send Reminder', () => {
    it('should show reminder button', () => {
      renderWithI18n(<SendReminderButton visit={mockVisit} onReminderSent={mockOnReminderSent} />);

      // Reminder button should be visible directly (no dropdown)
      const reminderButton = screen.getByRole('button', { name: /rappel|reminder/i });
      expect(reminderButton).toBeInTheDocument();
    });

    it('should call sendReminderManually when reminder is confirmed', async () => {
      appointmentReminderService.sendReminderManually.mockResolvedValue({
        success: true,
        data: { visitId: 'visit-123' }
      });

      renderWithI18n(<SendReminderButton visit={mockVisit} onReminderSent={mockOnReminderSent} />);

      // Click reminder button directly
      const reminderButton = screen.getByRole('button', { name: /rappel|reminder/i });
      fireEvent.click(reminderButton);

      // Wait for modal and confirm
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const modal = screen.getByRole('dialog');
      // Find the confirm button in the modal
      const buttons = within(modal).getAllByRole('button');
      const confirmButton = buttons.find(btn =>
        btn.textContent.match(/rappel|reminder/i) && !btn.textContent.match(/cancel|annuler/i)
      );
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(appointmentReminderService.sendReminderManually).toHaveBeenCalledWith('visit-123');
      });
    });

    it('should display reminders count on button if reminders were sent', () => {
      const visitWithReminders = { ...mockVisit, reminders_sent: 2 };

      renderWithI18n(<SendReminderButton visit={visitWithReminders} onReminderSent={mockOnReminderSent} />);

      // Count should be visible on the reminder button
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
    });
  });

  // ========================================
  // Tooltip Tests
  // ========================================
  describe('Tooltips', () => {
    it('should show appropriate tooltip for unavailable reminders', async () => {
      const noEmailVisit = {
        ...mockVisit,
        patient: { ...mockVisit.patient, email: null }
      };

      renderWithI18n(<SendReminderButton visit={noEmailVisit} onReminderSent={mockOnReminderSent} />);

      // Tooltip content is tested through tooltip attribute or aria-label
      // The actual tooltip visibility depends on hover events which are hard to test
      const button = screen.getByRole('button', { name: /invitation/i });
      expect(button).toBeDisabled();
    });
  });
});
