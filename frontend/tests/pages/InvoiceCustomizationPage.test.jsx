/**
 * InvoiceCustomizationPage Tests
 * Tests for invoice template customization functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoiceCustomizationPage from '../../src/pages/InvoiceCustomizationPage';
import { renderWithProviders, mockAdminUser, mockDietitianUser } from '../utils/testUtils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

const API_URL = '/api';

// Mock customization data
const mockCustomization = {
  id: 'cust-1',
  user_id: 'test-admin-id',
  primary_color: '#3498db',
  secondary_color: '#2c3e50',
  accent_color: '#e74c3c',
  logo_url: null,
  logo_width: 150,
  logo_height: 80,
  show_logo: true,
  signature_url: null,
  show_contact_info: true,
  business_name: 'Test Practice',
  address_line1: '123 Main St',
  address_line2: 'Suite 100',
  city: 'Paris',
  postal_code: '75001',
  country: 'France',
  phone: '+33 1 23 45 67 89',
  email: 'contact@test.com',
  website: 'https://test.com',
  misc_info: 'SIRET: 123456789',
  show_footer: true,
  footer_text: 'Thank you for your business!',
  signature_name: 'Dr. Test',
  signature_title: 'Dietitian',
  invoice_notes: 'Payment due within 30 days'
};

const mockCustomizationWithLogo = {
  ...mockCustomization,
  logo_url: '/uploads/logos/test-logo.png',
  signature_url: '/uploads/signatures/test-signature.png'
};

describe('InvoiceCustomizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default API handlers
    server.use(
      http.get(`${API_URL}/invoice-customizations/me`, () => {
        return HttpResponse.json({
          success: true,
          data: mockCustomization
        });
      }),
      http.put(`${API_URL}/invoice-customizations/me`, async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
          success: true,
          data: { ...mockCustomization, ...body }
        });
      }),
      http.post(`${API_URL}/invoice-customizations/me/logo`, () => {
        return HttpResponse.json({
          success: true,
          data: { ...mockCustomization, logo_url: '/uploads/logos/new-logo.png' }
        });
      }),
      http.delete(`${API_URL}/invoice-customizations/me/logo`, () => {
        return HttpResponse.json({
          success: true,
          data: { ...mockCustomization, logo_url: null }
        });
      }),
      http.post(`${API_URL}/invoice-customizations/me/signature`, () => {
        return HttpResponse.json({
          success: true,
          data: { ...mockCustomization, signature_url: '/uploads/signatures/new-signature.png' }
        });
      }),
      http.delete(`${API_URL}/invoice-customizations/me/signature`, () => {
        return HttpResponse.json({
          success: true,
          data: { ...mockCustomization, signature_url: null }
        });
      }),
      http.post(`${API_URL}/invoice-customizations/me/reset`, () => {
        return HttpResponse.json({
          success: true,
          data: {
            ...mockCustomization,
            primary_color: '#3498db',
            secondary_color: '#2c3e50',
            accent_color: '#e74c3c',
            logo_url: null,
            signature_url: null,
            business_name: '',
            footer_text: ''
          }
        });
      })
    );
  });

  describe('Rendering and Translations', () => {
    it('should render page title', async () => {
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Check for title in French or English
        const title = screen.getByRole('heading', { level: 1 });
        expect(title).toBeInTheDocument();
      });
    });

    it('should render loading state initially', () => {
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      // Bootstrap Spinner uses role="status" by default, but may also use class
      const spinner = document.querySelector('.spinner-border');
      expect(spinner).toBeInTheDocument();
    });

    it('should render all three tabs', async () => {
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Tab buttons should be present
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBe(3);
      });
    });

    it('should render save and reset buttons', async () => {
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        // Should have save and reset buttons
        expect(buttons.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should display business name from API', async () => {
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        const businessNameInput = screen.getByDisplayValue('Test Practice');
        expect(businessNameInput).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to contact info tab when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      const tabs = screen.getAllByRole('tab');
      await user.click(tabs[1]); // Contact Info tab

      await waitFor(() => {
        // Contact tab should show address fields
        expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
      });
    });

    it('should switch to footer tab when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      const tabs = screen.getAllByRole('tab');
      await user.click(tabs[2]); // Footer tab

      await waitFor(() => {
        // Footer tab should show footer text
        expect(screen.getByDisplayValue('Thank you for your business!')).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should update business name when typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Practice')).toBeInTheDocument();
      });

      const businessNameInput = screen.getByDisplayValue('Test Practice');
      await user.clear(businessNameInput);
      await user.type(businessNameInput, 'New Practice Name');

      expect(businessNameInput).toHaveValue('New Practice Name');
    });

    it('should update color when entering hex value', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByDisplayValue('#3498db')).toBeInTheDocument();
      });

      const colorInput = screen.getByDisplayValue('#3498db');
      await user.clear(colorInput);
      await user.type(colorInput, '#ff0000');

      expect(colorInput).toHaveValue('#ff0000');
    });

    it('should toggle show logo checkbox', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Practice')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const showLogoCheckbox = checkboxes[0]; // First checkbox is show_logo

      // Initial state should be checked (show_logo: true in mock data)
      expect(showLogoCheckbox).toBeChecked();

      await user.click(showLogoCheckbox);

      expect(showLogoCheckbox).not.toBeChecked();
    });

    it('should update logo dimensions', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByDisplayValue('150')).toBeInTheDocument();
      });

      const widthInput = screen.getByDisplayValue('150');
      await user.clear(widthInput);
      await user.type(widthInput, '200');

      expect(widthInput).toHaveValue(200);
    });
  });

  describe('Save Functionality', () => {
    it('should save changes when clicking save button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Practice')).toBeInTheDocument();
      });

      // Modify a field
      const businessNameInput = screen.getByDisplayValue('Test Practice');
      await user.clear(businessNameInput);
      await user.type(businessNameInput, 'Updated Practice');

      // Find and click save button
      const buttons = screen.getAllByRole('button');
      const saveButton = buttons.find(btn =>
        btn.textContent.toLowerCase().includes('save') ||
        btn.textContent.toLowerCase().includes('enregistrer')
      );

      await user.click(saveButton);

      // Should show success message
      await waitFor(() => {
        const successAlert = document.querySelector('.alert-success');
        expect(successAlert).toBeInTheDocument();
      });
    });

    it('should display error on save failure', async () => {
      server.use(
        http.put(`${API_URL}/invoice-customizations/me`, () => {
          return HttpResponse.json(
            { success: false, error: 'Failed to save' },
            { status: 500 }
          );
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Practice')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const saveButton = buttons.find(btn =>
        btn.textContent.toLowerCase().includes('save') ||
        btn.textContent.toLowerCase().includes('enregistrer')
      );

      await user.click(saveButton);

      await waitFor(() => {
        const errorAlert = document.querySelector('.alert-danger');
        expect(errorAlert).toBeInTheDocument();
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should show confirmation modal when clicking reset', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Practice')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const resetButton = buttons.find(btn =>
        btn.textContent.toLowerCase().includes('reset') ||
        btn.textContent.toLowerCase().includes('réinitialiser')
      );

      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should reset settings when confirmed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Practice')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const resetButton = buttons.find(btn =>
        btn.textContent.toLowerCase().includes('reset') ||
        btn.textContent.toLowerCase().includes('réinitialiser')
      );

      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Confirm reset
      const confirmButton = within(screen.getByRole('dialog')).getAllByRole('button').find(btn =>
        btn.textContent.toLowerCase().includes('reset') ||
        btn.textContent.toLowerCase().includes('réinitialiser')
      );

      if (confirmButton) {
        await user.click(confirmButton);

        await waitFor(() => {
          const successAlert = document.querySelector('.alert-success');
          expect(successAlert).toBeInTheDocument();
        });
      }
    });
  });

  describe('Logo Upload', () => {
    it('should show file input for logo upload', async () => {
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        expect(fileInputs.length).toBeGreaterThan(0);
      });
    });

    it('should show upload button after selecting file', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Practice')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][accept="image/png,image/jpeg"]');
      const file = new File(['test'], 'test-logo.png', { type: 'image/png' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        const uploadButton = screen.getAllByRole('button').find(btn =>
          btn.textContent.toLowerCase().includes('upload') ||
          btn.textContent.toLowerCase().includes('téléverser')
        );
        expect(uploadButton).toBeTruthy();
      });
    });

    it('should display existing logo when present', async () => {
      server.use(
        http.get(`${API_URL}/invoice-customizations/me`, () => {
          return HttpResponse.json({
            success: true,
            data: mockCustomizationWithLogo
          });
        })
      );

      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        const logoImg = document.querySelector('img[alt="Logo"]');
        expect(logoImg).toBeInTheDocument();
      });
    });

    it('should show delete button when logo exists', async () => {
      server.use(
        http.get(`${API_URL}/invoice-customizations/me`, () => {
          return HttpResponse.json({
            success: true,
            data: mockCustomizationWithLogo
          });
        })
      );

      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        const deleteButton = screen.getAllByRole('button').find(btn =>
          btn.classList.contains('btn-outline-danger')
        );
        expect(deleteButton).toBeTruthy();
      });
    });
  });

  describe('Contact Information Tab', () => {
    it('should display all contact fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      // Switch to contact tab
      const tabs = screen.getAllByRole('tab');
      await user.click(tabs[1]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Suite 100')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Paris')).toBeInTheDocument();
        expect(screen.getByDisplayValue('75001')).toBeInTheDocument();
        expect(screen.getByDisplayValue('France')).toBeInTheDocument();
      });
    });

    it('should update address fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      const tabs = screen.getAllByRole('tab');
      await user.click(tabs[1]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Paris')).toBeInTheDocument();
      });

      const cityInput = screen.getByDisplayValue('Paris');
      await user.clear(cityInput);
      await user.type(cityInput, 'Lyon');

      expect(cityInput).toHaveValue('Lyon');
    });
  });

  describe('Footer and Signature Tab', () => {
    it('should display footer text field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      const tabs = screen.getAllByRole('tab');
      await user.click(tabs[2]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Thank you for your business!')).toBeInTheDocument();
      });
    });

    it('should display signature name and title', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      const tabs = screen.getAllByRole('tab');
      await user.click(tabs[2]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Dr. Test')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Dietitian')).toBeInTheDocument();
      });
    });

    it('should display invoice notes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      const tabs = screen.getAllByRole('tab');
      await user.click(tabs[2]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Payment due within 30 days')).toBeInTheDocument();
      });
    });

    it('should show character count for text areas', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      const tabs = screen.getAllByRole('tab');
      await user.click(tabs[2]);

      await waitFor(() => {
        // Check for character count displays (e.g., "28 / 1000")
        const countText = screen.getAllByText(/\/ 1000/);
        expect(countText.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error on load failure', async () => {
      server.use(
        http.get(`${API_URL}/invoice-customizations/me`, () => {
          return HttpResponse.json(
            { success: false, error: 'Failed to load customization' },
            { status: 500 }
          );
        })
      );

      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        const errorAlert = document.querySelector('.alert-danger');
        expect(errorAlert).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should allow dismissing error alert', async () => {
      server.use(
        http.get(`${API_URL}/invoice-customizations/me`, () => {
          return HttpResponse.json(
            { success: false, error: 'Failed to load' },
            { status: 500 }
          );
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        const errorAlert = document.querySelector('.alert-danger');
        expect(errorAlert).toBeInTheDocument();
      }, { timeout: 5000 });

      const closeButton = document.querySelector('.alert-danger .btn-close');
      if (closeButton) {
        await user.click(closeButton);

        await waitFor(() => {
          expect(document.querySelector('.alert-danger')).not.toBeInTheDocument();
        });
      }
    });

    it('should allow dismissing success alert', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Practice')).toBeInTheDocument();
      });

      // Save to trigger success alert
      const buttons = screen.getAllByRole('button');
      const saveButton = buttons.find(btn =>
        btn.textContent.toLowerCase().includes('save') ||
        btn.textContent.toLowerCase().includes('enregistrer')
      );

      await user.click(saveButton);

      await waitFor(() => {
        const successAlert = document.querySelector('.alert-success');
        expect(successAlert).toBeInTheDocument();
      });

      const closeButton = document.querySelector('.alert-success .btn-close');
      if (closeButton) {
        await user.click(closeButton);

        await waitFor(() => {
          expect(document.querySelector('.alert-success')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Color Picker', () => {
    it('should show color preview boxes', async () => {
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Color preview boxes have specific background colors
        const colorBoxes = document.querySelectorAll('[style*="background-color"]');
        expect(colorBoxes.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should toggle color picker on click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByDisplayValue('#3498db')).toBeInTheDocument();
      });

      // Click the color box to toggle picker
      const colorBoxes = document.querySelectorAll('[style*="cursor: pointer"]');
      if (colorBoxes.length > 0) {
        await user.click(colorBoxes[0]);

        // Color picker should appear
        await waitFor(() => {
          const picker = document.querySelector('.react-colorful');
          expect(picker).toBeInTheDocument();
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', async () => {
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Practice')).toBeInTheDocument();
      });

      // Form labels should be present
      const labels = document.querySelectorAll('label');
      expect(labels.length).toBeGreaterThan(5);
    });

    it('should have proper tab roles', async () => {
      renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        const tabList = screen.getByRole('tablist');
        expect(tabList).toBeInTheDocument();
      });
    });
  });
});
