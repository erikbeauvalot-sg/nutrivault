/**
 * DocumentEmailModal Component Tests
 * Tests for sending one or more documents as attachments of a single email
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DocumentEmailModal from '../DocumentEmailModal';
import * as documentService from '../../services/documentService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

vi.mock('../../services/documentService', () => ({
  sendDocumentsByEmail: vi.fn(),
  getFileTypeIcon: vi.fn(() => '📄'),
  formatFileSize: vi.fn((size) => `${size} Bytes`),
  MAX_EMAIL_DOCUMENTS: 20,
  MAX_EMAIL_ATTACHMENTS_SIZE: 15 * 1024 * 1024
}));

describe('DocumentEmailModal', () => {
  const documents = [
    { id: 'doc-1', file_name: 'plan.pdf', mime_type: 'application/pdf', file_size: 1000 },
    { id: 'doc-2', file_name: 'recettes.pdf', mime_type: 'application/pdf', file_size: 2000 }
  ];

  const patients = [
    { id: 'patient-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
    { id: 'patient-2', first_name: 'Jane', last_name: 'Smith', email: null }
  ];

  const baseProps = {
    show: true,
    onHide: vi.fn(),
    documents,
    patients,
    onEmailSent: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    documentService.sendDocumentsByEmail.mockResolvedValue({ data: { document_count: 2 } });
  });

  it('renders nothing without documents', () => {
    const { container } = render(<DocumentEmailModal {...baseProps} documents={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists every selected document', () => {
    render(<DocumentEmailModal {...baseProps} />);
    expect(screen.getByText('plan.pdf')).toBeInTheDocument();
    expect(screen.getByText('recettes.pdf')).toBeInTheDocument();
    expect(screen.getByText('Send {{count}} documents by email')).toBeInTheDocument();
  });

  it('sends all documents in one call to the chosen patient', async () => {
    render(<DocumentEmailModal {...baseProps} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'patient-1' } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bonjour' } });
    fireEvent.click(screen.getByText('Send Email'));

    await waitFor(() => {
      expect(documentService.sendDocumentsByEmail).toHaveBeenCalledWith(['doc-1', 'doc-2'], 'patient-1', 'Bonjour');
    });
    expect(baseProps.onEmailSent).toHaveBeenCalled();
  });

  it('uses the default patient without showing a patient selector', async () => {
    const defaultPatient = { id: 'patient-9', first_name: 'Marie', last_name: 'Curie', email: 'marie@example.com' };
    render(<DocumentEmailModal {...baseProps} defaultPatient={defaultPatient} />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Marie Curie (marie@example.com)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Send Email'));

    await waitFor(() => {
      expect(documentService.sendDocumentsByEmail).toHaveBeenCalledWith(['doc-1', 'doc-2'], 'patient-9', null);
    });
  });

  it('disables sending when the attachments are too large', () => {
    const bigDocs = [{ id: 'doc-big', file_name: 'big.pdf', mime_type: 'application/pdf', file_size: 16 * 1024 * 1024 }];
    render(<DocumentEmailModal {...baseProps} documents={bigDocs} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'patient-1' } });

    expect(screen.getByText('Attachments exceed the {{max}} limit for one email. Remove some documents.')).toBeInTheDocument();
    expect(screen.getByText('Send Email').closest('button')).toBeDisabled();
  });

  describe('patient search', () => {
    const manyPatients = [
      { id: 'p-1', first_name: 'Zoé', last_name: 'Martin', email: 'zoe@example.com' },
      { id: 'p-2', first_name: 'Éric', last_name: 'Bernard', email: 'eric@example.com' },
      { id: 'p-3', first_name: 'Anne', last_name: 'Martin', email: 'anne@example.com' },
      { id: 'p-4', first_name: 'Paul', last_name: 'Dubois', email: null }
    ];

    const optionLabels = () => Array.from(screen.getByRole('combobox').querySelectorAll('option'))
      .slice(1)
      .map(option => option.textContent);

    it('lists patients as "Last name First name" sorted by last name', () => {
      render(<DocumentEmailModal {...baseProps} patients={manyPatients} />);

      expect(optionLabels()).toEqual([
        'Bernard Éric (eric@example.com)',
        'Dubois Paul - No email',
        'Martin Anne (anne@example.com)',
        'Martin Zoé (zoe@example.com)'
      ]);
    });

    it('filters patients ignoring case and accents', () => {
      render(<DocumentEmailModal {...baseProps} patients={manyPatients} />);

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'martin' } });
      expect(optionLabels()).toEqual(['Martin Anne (anne@example.com)', 'Martin Zoé (zoe@example.com)']);

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zoe mart' } });
      expect(optionLabels()).toEqual(['Martin Zoé (zoe@example.com)']);
    });

    it('auto-selects the patient when only one matches', async () => {
      render(<DocumentEmailModal {...baseProps} patients={manyPatients} />);

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'eric' } });
      expect(screen.getByRole('combobox')).toHaveValue('p-2');

      fireEvent.click(screen.getByText('Send Email'));
      await waitFor(() => {
        expect(documentService.sendDocumentsByEmail).toHaveBeenCalledWith(['doc-1', 'doc-2'], 'p-2', null);
      });
    });

    it('keeps the chosen patient in the list when the search changes', () => {
      render(<DocumentEmailModal {...baseProps} patients={manyPatients} />);

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p-3' } });
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'bernard' } });

      expect(screen.getByRole('combobox')).toHaveValue('p-2');
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
      expect(optionLabels()).toEqual(['Bernard Éric (eric@example.com)']);
    });
  });

  it('shows the server error when sending fails', async () => {
    documentService.sendDocumentsByEmail.mockRejectedValue({ response: { data: { error: 'Access denied to this patient' } } });
    render(<DocumentEmailModal {...baseProps} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'patient-1' } });
    fireEvent.click(screen.getByText('Send Email'));

    expect(await screen.findByText('Access denied to this patient')).toBeInTheDocument();
    expect(baseProps.onEmailSent).not.toHaveBeenCalled();
  });
});
