/**
 * Meal Plan Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import {
  getMealPlans,
  getMealPlanById,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  replaceDays
} from '../mealPlanService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

const mockPlan = {
  id: 'plan-uuid-1',
  title: 'Plan test',
  status: 'draft',
  goals: ['weight_loss'],
  dietary_restrictions: [],
  days: []
};

describe('mealPlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getMealPlans ────────────────────────────────────────────────────────────

  describe('getMealPlans', () => {
    it('calls API with correct endpoint', async () => {
      api.get.mockResolvedValue({ data: { success: true, data: [mockPlan], pagination: { total: 1 } } });
      const result = await getMealPlans();
      expect(api.get).toHaveBeenCalledWith('/meal-plans?');
      expect(result.data).toHaveLength(1);
    });

    it('passes filters as query params', async () => {
      api.get.mockResolvedValue({ data: { success: true, data: [], pagination: { total: 0 } } });
      await getMealPlans({ status: 'active', search: 'foo' });
      const url = api.get.mock.calls[0][0];
      expect(url).toContain('status=active');
      expect(url).toContain('search=foo');
    });

    it('ignores empty filters', async () => {
      api.get.mockResolvedValue({ data: { success: true, data: [], pagination: {} } });
      await getMealPlans({ status: '', patient_id: null });
      const url = api.get.mock.calls[0][0];
      expect(url).not.toContain('status=');
      expect(url).not.toContain('patient_id=');
    });

    it('returns default empty array when data key is missing', async () => {
      // extractData returns defaultValue only when responseData.data is undefined
      api.get.mockResolvedValue({ data: { success: true, data: undefined } });
      const result = await getMealPlans();
      expect(result.data).toEqual([]);
    });
  });

  // ─── getMealPlanById ─────────────────────────────────────────────────────────

  describe('getMealPlanById', () => {
    it('calls API with correct endpoint', async () => {
      api.get.mockResolvedValue({ data: { success: true, data: mockPlan } });
      const result = await getMealPlanById('plan-uuid-1');
      expect(api.get).toHaveBeenCalledWith('/meal-plans/plan-uuid-1');
      expect(result.id).toBe('plan-uuid-1');
    });
  });

  // ─── createMealPlan ──────────────────────────────────────────────────────────

  describe('createMealPlan', () => {
    it('posts to correct endpoint', async () => {
      api.post.mockResolvedValue({ data: { success: true, data: mockPlan } });
      const payload = { patient_id: 'p1', title: 'Plan test', goals: ['weight_loss'] };
      const result = await createMealPlan(payload);
      expect(api.post).toHaveBeenCalledWith('/meal-plans', payload);
      expect(result.id).toBe('plan-uuid-1');
    });
  });

  // ─── updateMealPlan ──────────────────────────────────────────────────────────

  describe('updateMealPlan', () => {
    it('puts to correct endpoint', async () => {
      api.put.mockResolvedValue({ data: { success: true, data: { ...mockPlan, title: 'Updated' } } });
      const result = await updateMealPlan('plan-uuid-1', { title: 'Updated' });
      expect(api.put).toHaveBeenCalledWith('/meal-plans/plan-uuid-1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });
  });

  // ─── deleteMealPlan ──────────────────────────────────────────────────────────

  describe('deleteMealPlan', () => {
    it('calls delete endpoint', async () => {
      api.delete.mockResolvedValue({ data: { success: true, message: 'deleted' } });
      const result = await deleteMealPlan('plan-uuid-1');
      expect(api.delete).toHaveBeenCalledWith('/meal-plans/plan-uuid-1');
    });
  });

  // ─── replaceDays ─────────────────────────────────────────────────────────────

  describe('replaceDays', () => {
    it('puts days to correct endpoint', async () => {
      const days = [
        {
          day_number: 1,
          meals: [{ meal_type: 'breakfast', items: [{ name: 'Avoine' }] }]
        }
      ];
      api.put.mockResolvedValue({ data: { success: true, data: { ...mockPlan, days } } });
      const result = await replaceDays('plan-uuid-1', days);
      expect(api.put).toHaveBeenCalledWith('/meal-plans/plan-uuid-1/days', { days });
    });

    it('sends empty array to clear days', async () => {
      api.put.mockResolvedValue({ data: { success: true, data: { ...mockPlan, days: [] } } });
      await replaceDays('plan-uuid-1', []);
      expect(api.put).toHaveBeenCalledWith('/meal-plans/plan-uuid-1/days', { days: [] });
    });
  });
});
