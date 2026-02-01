/**
 * Recipe Service Tests
 * Tests for recipe API service functions including sharing and PDF export
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  publishRecipe,
  archiveRecipe,
  duplicateRecipe,
  shareRecipe,
  getRecipeShares,
  revokeRecipeAccess,
  updateShareNotes,
  getPatientRecipes,
  exportRecipePDF
} from '../recipeService';

// Mock the API module
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock URL.createObjectURL and document methods for PDF download
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();

describe('recipeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset document.createElement mock
    vi.spyOn(document, 'createElement').mockImplementation(() => ({
      href: '',
      download: '',
      click: vi.fn(),
      remove: vi.fn()
    }));
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
  });

  // ========================================
  // Recipe CRUD Tests
  // ========================================
  describe('getRecipes', () => {
    it('should call API with correct endpoint', async () => {
      const mockResponse = { data: { success: true, data: [], pagination: {} } };
      api.get.mockResolvedValue(mockResponse);

      await getRecipes();

      expect(api.get).toHaveBeenCalled();
    });

    it('should pass filters to API', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      const filters = { status: 'published', category_id: 'cat-123' };
      await getRecipes(filters);

      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/recipes'));
    });

    it('should return data and pagination', async () => {
      const mockRecipes = [
        { id: 'rec-1', title: 'Recipe 1', status: 'published' },
        { id: 'rec-2', title: 'Recipe 2', status: 'draft' }
      ];
      const mockResponse = {
        data: {
          success: true,
          data: mockRecipes,
          pagination: { page: 1, limit: 12, total: 2 }
        }
      };
      api.get.mockResolvedValue(mockResponse);

      const result = await getRecipes();

      expect(result.data).toHaveLength(2);
    });
  });

  describe('getRecipeById', () => {
    it('should call API with correct recipe ID', async () => {
      const mockRecipe = { id: 'rec-123', title: 'Test Recipe', status: 'published' };
      const mockResponse = { data: { success: true, data: mockRecipe } };
      api.get.mockResolvedValue(mockResponse);

      const result = await getRecipeById('rec-123');

      expect(api.get).toHaveBeenCalledWith('/recipes/rec-123');
      expect(result.title).toBe('Test Recipe');
    });
  });

  describe('createRecipe', () => {
    it('should call API with recipe data', async () => {
      const recipeData = {
        title: 'New Recipe',
        description: 'Test description',
        servings: 4,
        difficulty: 'medium'
      };
      const mockResponse = {
        data: { success: true, data: { id: 'new-rec', ...recipeData } }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await createRecipe(recipeData);

      expect(api.post).toHaveBeenCalledWith('/recipes', recipeData);
      expect(result.title).toBe('New Recipe');
    });
  });

  describe('updateRecipe', () => {
    it('should call API with recipe ID and data', async () => {
      const updateData = { title: 'Updated Title', servings: 6 };
      const mockResponse = {
        data: { success: true, data: { id: 'rec-123', ...updateData } }
      };
      api.put.mockResolvedValue(mockResponse);

      const result = await updateRecipe('rec-123', updateData);

      expect(api.put).toHaveBeenCalledWith('/recipes/rec-123', updateData);
      expect(result.title).toBe('Updated Title');
    });
  });

  describe('deleteRecipe', () => {
    it('should call API with correct recipe ID', async () => {
      const mockResponse = { data: { success: true, message: 'Deleted' } };
      api.delete.mockResolvedValue(mockResponse);

      await deleteRecipe('rec-123');

      expect(api.delete).toHaveBeenCalledWith('/recipes/rec-123');
    });
  });

  // ========================================
  // Recipe Workflow Tests
  // ========================================
  describe('publishRecipe', () => {
    it('should call API to publish recipe', async () => {
      const mockResponse = {
        data: { success: true, data: { id: 'rec-123', status: 'published' } }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await publishRecipe('rec-123');

      expect(api.post).toHaveBeenCalledWith('/recipes/rec-123/publish');
      expect(result.status).toBe('published');
    });
  });

  describe('archiveRecipe', () => {
    it('should call API to archive recipe', async () => {
      const mockResponse = {
        data: { success: true, data: { id: 'rec-123', status: 'archived' } }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await archiveRecipe('rec-123');

      expect(api.post).toHaveBeenCalledWith('/recipes/rec-123/archive');
      expect(result.status).toBe('archived');
    });
  });

  describe('duplicateRecipe', () => {
    it('should call API to duplicate recipe', async () => {
      const mockResponse = {
        data: { success: true, data: { id: 'rec-456', title: 'Recipe (Copy)' } }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await duplicateRecipe('rec-123');

      expect(api.post).toHaveBeenCalledWith('/recipes/rec-123/duplicate');
      expect(result.id).toBe('rec-456');
    });
  });

  // ========================================
  // Recipe Sharing Tests
  // ========================================
  describe('shareRecipe', () => {
    it('should call API to share recipe with patient', async () => {
      const mockResponse = {
        data: { success: true, data: { id: 'share-1', recipe_id: 'rec-123', patient_id: 'pat-456' } }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await shareRecipe('rec-123', 'pat-456', 'Special notes');

      expect(api.post).toHaveBeenCalledWith('/recipes/rec-123/share', {
        patient_id: 'pat-456',
        notes: 'Special notes'
      });
      expect(result.patient_id).toBe('pat-456');
    });

    it('should share without notes', async () => {
      const mockResponse = {
        data: { success: true, data: { id: 'share-1' } }
      };
      api.post.mockResolvedValue(mockResponse);

      await shareRecipe('rec-123', 'pat-456');

      expect(api.post).toHaveBeenCalledWith('/recipes/rec-123/share', {
        patient_id: 'pat-456',
        notes: ''
      });
    });
  });

  describe('getRecipeShares', () => {
    it('should call API to get recipe shares', async () => {
      const mockShares = [
        { id: 'share-1', patient_id: 'pat-1', shared_at: '2026-01-15' },
        { id: 'share-2', patient_id: 'pat-2', shared_at: '2026-01-16' }
      ];
      const mockResponse = { data: { success: true, data: mockShares } };
      api.get.mockResolvedValue(mockResponse);

      const result = await getRecipeShares('rec-123');

      expect(api.get).toHaveBeenCalledWith('/recipes/rec-123/shares');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no shares', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      const result = await getRecipeShares('rec-no-shares');

      expect(result).toEqual([]);
    });
  });

  describe('revokeRecipeAccess', () => {
    it('should call API to revoke access', async () => {
      const mockResponse = { data: { success: true, message: 'Access revoked' } };
      api.delete.mockResolvedValue(mockResponse);

      await revokeRecipeAccess('share-123');

      expect(api.delete).toHaveBeenCalledWith('/recipe-access/share-123');
    });
  });

  describe('updateShareNotes', () => {
    it('should call API to update share notes', async () => {
      const mockResponse = {
        data: { success: true, data: { id: 'share-123', notes: 'Updated notes' } }
      };
      api.put.mockResolvedValue(mockResponse);

      const result = await updateShareNotes('share-123', 'Updated notes');

      expect(api.put).toHaveBeenCalledWith('/recipe-access/share-123', { notes: 'Updated notes' });
      expect(result.notes).toBe('Updated notes');
    });
  });

  describe('getPatientRecipes', () => {
    it('should call API to get patient recipes', async () => {
      const mockRecipes = [
        { id: 'rec-1', title: 'Recipe 1' },
        { id: 'rec-2', title: 'Recipe 2' }
      ];
      const mockResponse = { data: { success: true, data: mockRecipes } };
      api.get.mockResolvedValue(mockResponse);

      const result = await getPatientRecipes('pat-123');

      expect(api.get).toHaveBeenCalledWith('/patients/pat-123/recipes');
      expect(result).toHaveLength(2);
    });
  });

  // ========================================
  // PDF Export Tests
  // ========================================
  describe('exportRecipePDF', () => {
    it('should call API with correct endpoint and responseType blob', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      const mockResponse = {
        data: mockBlob,
        headers: { 'content-disposition': 'attachment; filename="recipe.pdf"' }
      };
      api.get.mockResolvedValue(mockResponse);

      await exportRecipePDF('rec-123');

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/rec-123/export/pdf'),
        { responseType: 'blob' }
      );
    });

    it('should use specified language for PDF', async () => {
      const mockBlob = new Blob(['pdf'], { type: 'application/pdf' });
      api.get.mockResolvedValue({ data: mockBlob });

      await exportRecipePDF('rec-123', 'fr');

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('lang=fr'),
        { responseType: 'blob' }
      );
    });

    it('should include notes in PDF request', async () => {
      const mockBlob = new Blob(['pdf'], { type: 'application/pdf' });
      api.get.mockResolvedValue({ data: mockBlob });

      await exportRecipePDF('rec-123', 'en', 'Special instructions for patient');

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('notes='),
        { responseType: 'blob' }
      );
    });

    it('should trigger file download', async () => {
      const mockBlob = new Blob(['pdf'], { type: 'application/pdf' });
      api.get.mockResolvedValue({ data: mockBlob });

      await exportRecipePDF('rec-123');

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  // ========================================
  // Error Handling Tests
  // ========================================
  describe('Error Handling', () => {
    it('should propagate API errors for getRecipeById', async () => {
      const error = new Error('Recipe not found');
      error.response = { status: 404, data: { error: 'Recipe not found' } };
      api.get.mockRejectedValue(error);

      await expect(getRecipeById('invalid-id')).rejects.toThrow('Recipe not found');
    });

    it('should propagate API errors for shareRecipe', async () => {
      const error = new Error('Recipe not published');
      error.response = { status: 400, data: { error: 'Only published recipes can be shared' } };
      api.post.mockRejectedValue(error);

      await expect(shareRecipe('rec-draft', 'pat-123')).rejects.toThrow('Recipe not published');
    });

    it('should propagate API errors for exportRecipePDF', async () => {
      const error = new Error('PDF generation failed');
      error.response = { status: 500, data: { error: 'PDF generation failed' } };
      api.get.mockRejectedValue(error);

      await expect(exportRecipePDF('rec-123')).rejects.toThrow('PDF generation failed');
    });
  });
});
