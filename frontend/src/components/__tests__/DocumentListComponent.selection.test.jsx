/**
 * DocumentListComponent multi-selection tests
 * Selecting several documents and sending them by email in one go
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import DocumentListComponent from '../DocumentListComponent';
import * as documentService from '../../services/documentService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key,
    i18n: { language: 'fr' }
  })
}));

let mockPermissions = ['documents.share'];
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (code) => mockPermissions.includes(code) })
}));

vi.mock('../../services/documentService', () => ({
  getDocuments: vi.fn(),
  deleteDocument: vi.fn(),
  downloadDocument: vi.fn(),
  canPreviewFile: vi.fn(() => false),
  getFileTypeIcon: vi.fn(() => '📄'),
  formatFileSize: vi.fn((size) => `${size} B`)
}));

vi.mock('../../services/patientService', () => ({
  getPatients: vi.fn().mockResolvedValue({ data: { data: [] } })
}));

vi.mock('../DocumentSharingModal', () => ({ default: () => null }));

// Expose the documents handed to the email modal
vi.mock('../DocumentEmailModal', () => ({
  default: ({ show, documents, defaultPatient }) => (show ? (
    <div data-testid="email-modal">
      {documents.map(doc => doc.id).join(',')}|{defaultPatient?.id || ''}
    </div>
  ) : null)
}));

const docs = [
  { id: 'doc-1', file_name: 'plan.pdf', mime_type: 'application/pdf', file_size: 100, created_at: '2026-01-01' },
  { id: 'doc-2', file_name: 'recettes.pdf', mime_type: 'application/pdf', file_size: 200, created_at: '2026-01-02' },
  { id: 'doc-3', file_name: 'bilan.pdf', mime_type: 'application/pdf', file_size: 300, created_at: '2026-01-03' }
];

// The desktop table holds the checkboxes we interact with
const getTable = () => screen.getByRole('table');

describe('DocumentListComponent selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissions = ['documents.share'];
    documentService.getDocuments.mockResolvedValue({ data: { data: docs, pagination: { total: 3, totalPages: 1 } } });
  });

  // The translation mock returns the default value, so all row checkboxes share one label
  const rowCheckboxes = () => within(getTable()).getAllByLabelText('Select {{name}}');
  const pageCheckbox = () => within(getTable()).getByLabelText('Select all documents on this page');

  it('shows the action bar and sends only the selected documents', async () => {
    render(<DocumentListComponent />);
    await screen.findAllByText('plan.pdf');

    expect(screen.queryByText('Clear selection')).not.toBeInTheDocument();

    fireEvent.click(rowCheckboxes()[0]);
    fireEvent.click(rowCheckboxes()[2]);

    expect(screen.getByText('{{count}} selected')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Send by email/, { selector: 'button' }));

    expect(screen.getByTestId('email-modal')).toHaveTextContent('doc-1,doc-3|');
  });

  it('selects and unselects the whole page', async () => {
    render(<DocumentListComponent />);
    await screen.findAllByText('plan.pdf');

    fireEvent.click(pageCheckbox());
    expect(rowCheckboxes().every(box => box.checked)).toBe(true);

    fireEvent.click(pageCheckbox());
    expect(rowCheckboxes().some(box => box.checked)).toBe(false);
    expect(screen.queryByText('Clear selection')).not.toBeInTheDocument();
  });

  it('clears the selection', async () => {
    render(<DocumentListComponent />);
    await screen.findAllByText('plan.pdf');

    fireEvent.click(rowCheckboxes()[1]);
    fireEvent.click(screen.getByText('Clear selection'));

    expect(rowCheckboxes()[1].checked).toBe(false);
    expect(screen.queryByText('{{count}} selected')).not.toBeInTheDocument();
  });

  it('passes the patient context to the email modal', async () => {
    const patient = { id: 'patient-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' };
    render(<DocumentListComponent resourceType="patient" resourceId="patient-1" patient={patient} />);
    await screen.findAllByText('plan.pdf');

    expect(documentService.getDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ resource_type: 'patient', resource_id: 'patient-1' })
    );

    fireEvent.click(rowCheckboxes()[1]);
    fireEvent.click(screen.getByText(/Send by email/, { selector: 'button' }));

    expect(screen.getByTestId('email-modal')).toHaveTextContent('doc-2|patient-1');
  });

  it('hides checkboxes without the share permission', async () => {
    mockPermissions = [];
    render(<DocumentListComponent />);
    await screen.findAllByText('plan.pdf');

    expect(within(getTable()).queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
