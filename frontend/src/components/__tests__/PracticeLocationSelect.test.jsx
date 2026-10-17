/**
 * PracticeLocationSelect tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PracticeLocationSelect from '../PracticeLocationSelect';
import practiceLocationService from '../../services/practiceLocationService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, defaultValue) => defaultValue || key })
}));

vi.mock('../../services/practiceLocationService', () => ({
  default: { getAllPracticeLocations: vi.fn() }
}));

describe('PracticeLocationSelect', () => {
  beforeEach(() => {
    practiceLocationService.getAllPracticeLocations.mockResolvedValue({
      data: [
        { code: 'SURESNES', label: 'Suresnes', is_active: true, is_default: true },
        { code: 'ISSY', label: 'Issy Les Moulineaux', is_active: true, is_default: false },
        { code: 'OLD', label: 'Ancien cabinet', is_active: false, is_default: false }
      ]
    });
  });

  it('shows the default location when no value is chosen yet', async () => {
    render(<PracticeLocationSelect value={undefined} onChange={() => {}} aria-label="loc" />);
    await waitFor(() => expect(screen.getByLabelText('loc')).toHaveValue('SURESNES'));
  });

  it('shows "no location" for an explicit empty value and hides inactive locations', async () => {
    render(<PracticeLocationSelect value="" onChange={() => {}} aria-label="loc" />);
    await screen.findByText('Suresnes');
    expect(screen.getByLabelText('loc')).toHaveValue('');
    expect(screen.queryByText('Ancien cabinet')).not.toBeInTheDocument();
  });

  it('keeps an inactive location that is the current value', async () => {
    render(<PracticeLocationSelect value="OLD" onChange={() => {}} aria-label="loc" />);
    expect(await screen.findByText('Ancien cabinet')).toBeInTheDocument();
    expect(screen.getByLabelText('loc')).toHaveValue('OLD');
  });
});
