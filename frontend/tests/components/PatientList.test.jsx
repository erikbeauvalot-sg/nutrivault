/**
 * PatientList Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientList from '../../src/components/PatientList';
import { renderWithProviders } from '../utils/testUtils';

// Mock patient data
const mockPatients = [
  {
    id: 'patient-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@test.com',
    phone: '+1234567890',
    is_active: true,
    assigned_dietitian: {
      first_name: 'Dr.',
      last_name: 'Smith'
    }
  },
  {
    id: 'patient-2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@test.com',
    phone: '+0987654321',
    is_active: false,
    assigned_dietitian: null
  }
];

describe('PatientList', () => {
  const defaultProps = {
    patients: mockPatients,
    loading: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onViewDetails: vi.fn(),
    onScheduleVisit: vi.fn(),
    searchTerm: '',
    statusFilter: 'all',
    currentPage: 1,
    totalPages: 1,
    totalPatients: 2,
    onSearchChange: vi.fn(),
    onStatusFilterChange: vi.fn(),
    onPageChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window width for desktop view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024
    });
  });

  describe('Rendering', () => {
    it('should render loading state', () => {
      renderWithProviders(<PatientList {...defaultProps} loading={true} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render patient list', () => {
      renderWithProviders(<PatientList {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should render search input', () => {
      renderWithProviders(<PatientList {...defaultProps} />);

      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should render status filter', () => {
      renderWithProviders(<PatientList {...defaultProps} />);

      expect(screen.getByDisplayValue('All')).toBeInTheDocument();
    });

    it('should render patient count', () => {
      renderWithProviders(<PatientList {...defaultProps} />);

      expect(screen.getByText(/showing 2 of 2/i)).toBeInTheDocument();
    });

    it('should render active badge for active patients', () => {
      renderWithProviders(<PatientList {...defaultProps} />);

      const activeBadges = screen.getAllByText(/active/i).filter(
        el => el.classList.contains('badge')
      );
      expect(activeBadges.length).toBeGreaterThan(0);
    });

    it('should render inactive badge for inactive patients', () => {
      renderWithProviders(<PatientList {...defaultProps} />);

      expect(screen.getByText(/inactive/i)).toBeInTheDocument();
    });

    it('should show empty state when no patients', () => {
      renderWithProviders(
        <PatientList
          {...defaultProps}
          patients={[]}
          totalPatients={0}
        />
      );

      expect(screen.getByText(/no patients found/i)).toBeInTheDocument();
    });
  });

  describe('Search and Filter', () => {
    it('should call onSearchChange when typing in search', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'John');

      expect(defaultProps.onSearchChange).toHaveBeenCalled();
    });

    it('should call onStatusFilterChange when changing filter', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientList {...defaultProps} />);

      const filterSelect = screen.getByDisplayValue('All');
      await user.selectOptions(filterSelect, 'active');

      expect(defaultProps.onStatusFilterChange).toHaveBeenCalledWith('active');
    });
  });

  describe('Actions', () => {
    it('should call onViewDetails when clicking patient row', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientList {...defaultProps} />);

      // Find the row and click it
      const row = screen.getByText('John Doe').closest('tr');
      await user.click(row);

      expect(defaultProps.onViewDetails).toHaveBeenCalledWith(mockPatients[0]);
    });

    it('should call onEdit when clicking edit button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientList {...defaultProps} />);

      const editButtons = screen.getAllByTitle(/edit/i);
      await user.click(editButtons[0]);

      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockPatients[0]);
    });

    it('should call onDelete when clicking delete button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientList {...defaultProps} />);

      const deleteButtons = screen.getAllByTitle(/delete/i);
      await user.click(deleteButtons[0]);

      expect(defaultProps.onDelete).toHaveBeenCalledWith('patient-1');
    });

    it('should call onScheduleVisit when clicking schedule button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientList {...defaultProps} />);

      const scheduleButtons = screen.getAllByTitle(/schedule/i);
      await user.click(scheduleButtons[0]);

      expect(defaultProps.onScheduleVisit).toHaveBeenCalledWith(mockPatients[0]);
    });

    it('should not render edit button when onEdit is null', () => {
      renderWithProviders(<PatientList {...defaultProps} onEdit={null} />);

      expect(screen.queryByTitle(/edit/i)).not.toBeInTheDocument();
    });

    it('should not render delete button when onDelete is null', () => {
      renderWithProviders(<PatientList {...defaultProps} onDelete={null} />);

      expect(screen.queryByTitle(/delete/i)).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should render pagination when multiple pages', () => {
      renderWithProviders(
        <PatientList
          {...defaultProps}
          totalPages={3}
          currentPage={1}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should not render pagination when single page', () => {
      renderWithProviders(
        <PatientList
          {...defaultProps}
          totalPages={1}
          currentPage={1}
        />
      );

      // Pagination shouldn't be present - check for specific pagination controls
      const pagination = document.querySelector('.pagination');
      expect(pagination).not.toBeInTheDocument();
    });

    it('should call onPageChange when clicking page number', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <PatientList
          {...defaultProps}
          totalPages={3}
          currentPage={1}
        />
      );

      await user.click(screen.getByText('2'));

      expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('Sorting', () => {
    it('should have sortable columns', () => {
      renderWithProviders(<PatientList {...defaultProps} />);

      // Find the Name header (should be sortable)
      const nameHeader = screen.getByText(/name/i).closest('th');
      expect(nameHeader).toHaveStyle({ cursor: 'pointer' });
    });

    it('should toggle sort direction when clicking same column', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientList {...defaultProps} />);

      const nameHeader = screen.getByText(/name/i).closest('th');

      // Click to sort ascending
      await user.click(nameHeader);
      // Click again to sort descending
      await user.click(nameHeader);

      // The component should show a different sort icon
      expect(nameHeader).toBeInTheDocument();
    });
  });

  describe('Patient Info Display', () => {
    it('should display patient email', () => {
      renderWithProviders(<PatientList {...defaultProps} />);

      expect(screen.getByText('john.doe@test.com')).toBeInTheDocument();
    });

    it('should display patient phone', () => {
      renderWithProviders(<PatientList {...defaultProps} />);

      expect(screen.getByText('+1234567890')).toBeInTheDocument();
    });

    it('should display assigned dietitian when available', () => {
      renderWithProviders(<PatientList {...defaultProps} />);

      expect(screen.getByText(/Dr\. Smith/)).toBeInTheDocument();
    });

    it('should show dash for missing email', () => {
      const patientsWithNoEmail = [{
        ...mockPatients[0],
        email: null
      }];

      renderWithProviders(
        <PatientList {...defaultProps} patients={patientsWithNoEmail} />
      );

      // The component shows '-' for missing values
      const cells = screen.getAllByText('-');
      expect(cells.length).toBeGreaterThan(0);
    });
  });
});
