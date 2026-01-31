/**
 * CustomFieldService Tests
 * Tests for export/import functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportCategories, importCategories } from '../customFieldService';
import api from '../api';

// Mock api module
vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('CustomFieldService - Export/Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // Export Tests
  // ========================================
  describe('exportCategories', () => {
    const mockExportData = {
      success: true,
      data: {
        version: '1.0',
        exportDate: '2024-01-15T10:00:00.000Z',
        exportedBy: 'admin',
        categories: [
          {
            name: 'Medical History',
            description: 'Medical background',
            field_definitions: [
              { field_name: 'blood_type', field_label: 'Blood Type', field_type: 'text' }
            ]
          }
        ]
      }
    };

    it('should export all categories when no IDs provided', async () => {
      api.post.mockResolvedValue({ data: mockExportData });

      const result = await exportCategories();

      expect(api.post).toHaveBeenCalledWith('/custom-fields/export', { categoryIds: [] });
      expect(result).toEqual(mockExportData);
    });

    it('should export specific categories by ID', async () => {
      const categoryIds = ['cat-1', 'cat-2'];
      api.post.mockResolvedValue({ data: mockExportData });

      const result = await exportCategories(categoryIds);

      expect(api.post).toHaveBeenCalledWith('/custom-fields/export', { categoryIds });
      expect(result).toEqual(mockExportData);
    });

    it('should export single category by ID', async () => {
      const categoryIds = ['cat-1'];
      api.post.mockResolvedValue({ data: mockExportData });

      const result = await exportCategories(categoryIds);

      expect(api.post).toHaveBeenCalledWith('/custom-fields/export', { categoryIds: ['cat-1'] });
      expect(result).toEqual(mockExportData);
    });

    it('should throw error on export failure', async () => {
      api.post.mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Export failed' }
        }
      });

      await expect(exportCategories()).rejects.toEqual({
        response: {
          status: 500,
          data: { error: 'Export failed' }
        }
      });
    });

    it('should throw error when unauthorized', async () => {
      api.post.mockRejectedValue({
        response: {
          status: 403,
          data: { error: 'Forbidden' }
        }
      });

      await expect(exportCategories()).rejects.toMatchObject({
        response: { status: 403 }
      });
    });
  });

  // ========================================
  // Import Tests
  // ========================================
  describe('importCategories', () => {
    const mockImportData = {
      version: '1.0',
      exportDate: '2024-01-15T10:00:00.000Z',
      exportedBy: 'admin',
      categories: [
        {
          name: 'New Category',
          description: 'A new category',
          field_definitions: [
            { field_name: 'new_field', field_label: 'New Field', field_type: 'text' }
          ]
        }
      ]
    };

    const mockImportResult = {
      success: true,
      data: {
        categoriesCreated: 1,
        categoriesUpdated: 0,
        categoriesSkipped: 0,
        definitionsCreated: 1,
        definitionsUpdated: 0,
        definitionsSkipped: 0,
        errors: []
      }
    };

    it('should import categories with default options', async () => {
      api.post.mockResolvedValue({ data: mockImportResult });

      const result = await importCategories(mockImportData);

      expect(api.post).toHaveBeenCalledWith('/custom-fields/import', {
        importData: mockImportData,
        options: {}
      });
      expect(result).toEqual(mockImportResult);
    });

    it('should import with skipExisting option', async () => {
      api.post.mockResolvedValue({ data: mockImportResult });
      const options = { skipExisting: true, updateExisting: false };

      const result = await importCategories(mockImportData, options);

      expect(api.post).toHaveBeenCalledWith('/custom-fields/import', {
        importData: mockImportData,
        options
      });
      expect(result).toEqual(mockImportResult);
    });

    it('should import with updateExisting option', async () => {
      const updateResult = {
        ...mockImportResult,
        data: { ...mockImportResult.data, categoriesUpdated: 1, categoriesCreated: 0 }
      };
      api.post.mockResolvedValue({ data: updateResult });
      const options = { skipExisting: false, updateExisting: true };

      const result = await importCategories(mockImportData, options);

      expect(api.post).toHaveBeenCalledWith('/custom-fields/import', {
        importData: mockImportData,
        options
      });
      expect(result.data.categoriesUpdated).toBe(1);
    });

    it('should handle import with errors in response', async () => {
      const resultWithErrors = {
        success: true,
        data: {
          categoriesCreated: 1,
          categoriesUpdated: 0,
          categoriesSkipped: 0,
          definitionsCreated: 0,
          definitionsUpdated: 0,
          definitionsSkipped: 0,
          errors: [
            { type: 'definition', name: 'bad_field', error: 'Invalid field type' }
          ]
        }
      };
      api.post.mockResolvedValue({ data: resultWithErrors });

      const result = await importCategories(mockImportData);

      expect(result.data.errors.length).toBe(1);
      expect(result.data.errors[0].type).toBe('definition');
    });

    it('should throw error on import failure', async () => {
      api.post.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'Invalid import data format' }
        }
      });

      await expect(importCategories(mockImportData)).rejects.toMatchObject({
        response: { status: 400 }
      });
    });

    it('should throw error when unauthorized', async () => {
      api.post.mockRejectedValue({
        response: {
          status: 403,
          data: { error: 'Forbidden' }
        }
      });

      await expect(importCategories(mockImportData)).rejects.toMatchObject({
        response: { status: 403 }
      });
    });

    it('should throw error on network failure', async () => {
      api.post.mockRejectedValue(new Error('Network Error'));

      await expect(importCategories(mockImportData)).rejects.toThrow('Network Error');
    });
  });
});
