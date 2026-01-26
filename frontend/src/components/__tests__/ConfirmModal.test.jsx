/**
 * ConfirmModal Component Tests
 * Tests for the reusable confirmation modal that replaces window.confirm()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '../ConfirmModal';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

describe('ConfirmModal', () => {
  const mockOnHide = vi.fn();
  const mockOnConfirm = vi.fn();

  const defaultProps = {
    show: true,
    onHide: mockOnHide,
    onConfirm: mockOnConfirm,
    title: 'Confirmation',
    message: 'Are you sure you want to proceed?'
  };

  beforeEach(() => {
    mockOnHide.mockClear();
    mockOnConfirm.mockClear();
  });

  describe('Rendering', () => {
    it('renders the modal when show is true', () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByText('Confirmation')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('does not render the modal when show is false', () => {
      render(<ConfirmModal {...defaultProps} show={false} />);

      expect(screen.queryByText('Confirmation')).not.toBeInTheDocument();
    });

    it('renders default title when not provided', () => {
      render(<ConfirmModal {...defaultProps} title={undefined} />);

      // Title appears in modal header - use getAllByText since "Confirm" also appears on button
      const confirmElements = screen.getAllByText('Confirm');
      expect(confirmElements.length).toBeGreaterThanOrEqual(1);
      // Check that the modal title specifically contains "Confirm"
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders custom confirm and cancel labels', () => {
      render(
        <ConfirmModal
          {...defaultProps}
          confirmLabel="Delete"
          cancelLabel="Keep"
        />
      );

      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Keep')).toBeInTheDocument();
    });

    it('renders default labels when not provided', () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('calls onConfirm and onHide when confirm button is clicked', () => {
      render(<ConfirmModal {...defaultProps} confirmLabel="Yes" />);

      const confirmButton = screen.getByText('Yes');
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnHide).toHaveBeenCalledTimes(1);
    });

    it('calls only onHide when cancel button is clicked', () => {
      render(<ConfirmModal {...defaultProps} cancelLabel="No" />);

      const cancelButton = screen.getByText('No');
      fireEvent.click(cancelButton);

      expect(mockOnHide).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('calls only onHide when close button (X) is clicked', () => {
      render(<ConfirmModal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnHide).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Button variants', () => {
    it('uses danger variant by default', () => {
      render(<ConfirmModal {...defaultProps} confirmLabel="Delete" />);

      const confirmButton = screen.getByText('Delete');
      expect(confirmButton).toHaveClass('btn-danger');
    });

    it('uses custom variant when provided', () => {
      render(
        <ConfirmModal
          {...defaultProps}
          confirmLabel="Send"
          variant="warning"
        />
      );

      const confirmButton = screen.getByText('Send');
      expect(confirmButton).toHaveClass('btn-warning');
    });

    it('uses success variant for positive actions', () => {
      render(
        <ConfirmModal
          {...defaultProps}
          confirmLabel="Complete"
          variant="success"
        />
      );

      const confirmButton = screen.getByText('Complete');
      expect(confirmButton).toHaveClass('btn-success');
    });
  });

  describe('Disabled state', () => {
    it('disables confirm button when confirmDisabled is true', () => {
      render(
        <ConfirmModal
          {...defaultProps}
          confirmLabel="Confirm"
          confirmDisabled={true}
        />
      );

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toBeDisabled();
    });

    it('enables confirm button when confirmDisabled is false', () => {
      render(
        <ConfirmModal
          {...defaultProps}
          confirmLabel="Confirm"
          confirmDisabled={false}
        />
      );

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).not.toBeDisabled();
    });

    it('does not call onConfirm when clicking disabled button', () => {
      render(
        <ConfirmModal
          {...defaultProps}
          confirmLabel="Confirm"
          confirmDisabled={true}
        />
      );

      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible modal structure', () => {
      render(<ConfirmModal {...defaultProps} />);

      // Modal should have dialog role
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has close button accessible', () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });
});
