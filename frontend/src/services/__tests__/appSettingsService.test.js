import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  default: { get: vi.fn(), put: vi.fn() }
}));

import api from '../api';
import { getAppSettings, updateAppSettings, clearAppSettingsCache } from '../appSettingsService';

describe('appSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAppSettingsCache();
  });

  it('fetches settings once and serves the cache afterwards', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { patient_health_score_enabled: true } } });

    expect(await getAppSettings()).toEqual({ patient_health_score_enabled: true });
    expect(await getAppSettings()).toEqual({ patient_health_score_enabled: true });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/app-settings');
  });

  it('refetches when forced', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { patient_health_score_enabled: false } } });

    await getAppSettings();
    await getAppSettings({ force: true });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed request', async () => {
    api.get.mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ data: { success: true, data: { patient_health_score_enabled: true } } });

    await expect(getAppSettings()).rejects.toThrow('network');
    expect(await getAppSettings()).toEqual({ patient_health_score_enabled: true });
  });

  it('updates the cache after saving', async () => {
    api.put.mockResolvedValue({ data: { success: true, data: { patient_health_score_enabled: true } } });

    await updateAppSettings({ patient_health_score_enabled: true });
    expect(api.put).toHaveBeenCalledWith('/app-settings', { patient_health_score_enabled: true });
    expect(await getAppSettings()).toEqual({ patient_health_score_enabled: true });
    expect(api.get).not.toHaveBeenCalled();
  });
});
