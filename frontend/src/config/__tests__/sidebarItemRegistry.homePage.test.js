/**
 * getHomePath tests: page opened after login
 */

import { describe, it, expect } from 'vitest';
import { getHomePath } from '../sidebarItemRegistry';

describe('getHomePath', () => {
  it('sends patients to the portal', () => {
    expect(getHomePath({ role: 'PATIENT', home_page: 'finance' })).toBe('/portal');
  });

  it('opens the resolved home page', () => {
    expect(getHomePath({ role: 'ACCOUNTING', home_page: 'finance' })).toBe('/finance');
    expect(getHomePath({ id: 'u-1', role: { name: 'ACCOUNTING' }, home_page: 'myProfile' })).toBe('/users/u-1');
  });

  it('falls back to the dashboard', () => {
    expect(getHomePath({ role: 'DIETITIAN' })).toBe('/dashboard');
    expect(getHomePath({ role: 'DIETITIAN', home_page: 'unknown-entry' })).toBe('/dashboard');
    expect(getHomePath(null)).toBe('/dashboard');
  });
});
