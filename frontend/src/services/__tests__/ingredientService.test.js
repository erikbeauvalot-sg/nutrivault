/**
 * Ingredient Service Tests
 * Tests for ingredient API service functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import {
  getIngredients,
  searchIngredients,
  getCategories,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient
} from '../ingredientService';

// Mock the API module
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('ingredientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getIngredients', () => {
    it('should call API with correct endpoint', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      await getIngredients();

      expect(api.get).toHaveBeenCalledWith('/ingredients?');
    });

    it('should pass filters to API', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      const filters = { category: 'proteins', search: 'chicken' };
      await getIngredients(filters);

      expect(api.get).toHaveBeenCalledWith('/ingredients?category=proteins&search=chicken');
    });

    it('should exclude empty filter values', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      const filters = { category: 'proteins', search: '', page: null };
      await getIngredients(filters);

      expect(api.get).toHaveBeenCalledWith('/ingredients?category=proteins');
    });

    it('should return data and pagination', async () => {
      const mockIngredients = [
        { id: 'ing-1', name: 'Chicken', category: 'proteins' },
        { id: 'ing-2', name: 'Salmon', category: 'proteins' }
      ];
      const mockResponse = {
        data: {
          success: true,
          data: mockIngredients,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
        }
      };
      api.get.mockResolvedValue(mockResponse);

      const result = await getIngredients({ category: 'proteins' });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Chicken');
    });
  });

  describe('searchIngredients', () => {
    it('should call API with search query', async () => {
      const mockResponse = {
        data: { success: true, data: [{ id: 'ing-1', name: 'Chicken Breast' }] }
      };
      api.get.mockResolvedValue(mockResponse);

      await searchIngredients('chicken');

      expect(api.get).toHaveBeenCalledWith('/ingredients/search?q=chicken&limit=10');
    });

    it('should respect limit parameter', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      await searchIngredients('test', 5);

      expect(api.get).toHaveBeenCalledWith('/ingredients/search?q=test&limit=5');
    });

    it('should encode special characters in query', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      await searchIngredients('chicken & rice');

      expect(api.get).toHaveBeenCalledWith('/ingredients/search?q=chicken%20%26%20rice&limit=10');
    });

    it('should return empty array when no results', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      const result = await searchIngredients('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getCategories', () => {
    it('should call API with correct endpoint', async () => {
      const mockCategories = ['proteins', 'grains', 'vegetables', 'fruits'];
      const mockResponse = { data: { success: true, data: mockCategories } };
      api.get.mockResolvedValue(mockResponse);

      await getCategories();

      expect(api.get).toHaveBeenCalledWith('/ingredients/categories-legacy');
    });

    it('should return list of categories', async () => {
      const mockCategories = ['proteins', 'grains', 'vegetables', 'fruits', 'dairy'];
      const mockResponse = { data: { success: true, data: mockCategories } };
      api.get.mockResolvedValue(mockResponse);

      const result = await getCategories();

      expect(result).toHaveLength(5);
      expect(result).toContain('proteins');
    });
  });

  describe('getIngredientById', () => {
    it('should call API with correct ingredient ID', async () => {
      const mockIngredient = {
        id: 'ing-123',
        name: 'Chicken Breast',
        category: 'proteins',
        nutrition_per_100g: { calories: 165, protein: 31 }
      };
      const mockResponse = { data: { success: true, data: mockIngredient } };
      api.get.mockResolvedValue(mockResponse);

      const result = await getIngredientById('ing-123');

      expect(api.get).toHaveBeenCalledWith('/ingredients/ing-123');
      expect(result.name).toBe('Chicken Breast');
    });
  });

  describe('createIngredient', () => {
    it('should call API with ingredient data', async () => {
      const ingredientData = {
        name: 'New Ingredient',
        category: 'vegetables',
        default_unit: 'g',
        nutrition_per_100g: { calories: 50, protein: 2 }
      };
      const mockResponse = {
        data: { success: true, data: { id: 'new-ing', ...ingredientData } }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await createIngredient(ingredientData);

      expect(api.post).toHaveBeenCalledWith('/ingredients', ingredientData);
      expect(result.name).toBe('New Ingredient');
    });

    it('should handle creation with allergens', async () => {
      const ingredientData = {
        name: 'Milk',
        category: 'dairy',
        default_unit: 'ml',
        allergens: ['dairy']
      };
      const mockResponse = {
        data: { success: true, data: { id: 'milk-ing', ...ingredientData } }
      };
      api.post.mockResolvedValue(mockResponse);

      await createIngredient(ingredientData);

      expect(api.post).toHaveBeenCalledWith('/ingredients', ingredientData);
    });

    it('should propagate API errors', async () => {
      const error = new Error('Validation failed');
      error.response = { status: 400, data: { error: 'Name is required' } };
      api.post.mockRejectedValue(error);

      await expect(createIngredient({})).rejects.toThrow('Validation failed');
    });
  });

  describe('updateIngredient', () => {
    it('should call API with ingredient ID and data', async () => {
      const updateData = {
        name: 'Updated Name',
        nutrition_per_100g: { calories: 200 }
      };
      const mockResponse = {
        data: { success: true, data: { id: 'ing-123', ...updateData } }
      };
      api.put.mockResolvedValue(mockResponse);

      const result = await updateIngredient('ing-123', updateData);

      expect(api.put).toHaveBeenCalledWith('/ingredients/ing-123', updateData);
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('deleteIngredient', () => {
    it('should call API with correct ingredient ID', async () => {
      const mockResponse = { data: { success: true, message: 'Ingredient deleted' } };
      api.delete.mockResolvedValue(mockResponse);

      await deleteIngredient('ing-123');

      expect(api.delete).toHaveBeenCalledWith('/ingredients/ing-123');
    });

    it('should handle delete errors', async () => {
      const error = new Error('Cannot delete');
      error.response = { status: 400, data: { error: 'Ingredient is used in recipes' } };
      api.delete.mockRejectedValue(error);

      await expect(deleteIngredient('ing-used')).rejects.toThrow('Cannot delete');
    });
  });
});
