/**
 * Campaign Service Tests
 * Unit tests for campaign API service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api module (axios instance used by campaignService)
const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../api', () => ({ default: mockApi }));

import * as campaignService from '../campaignService';

describe('campaignService', () => {
  const mockCampaign = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Campaign',
    subject: 'Test Subject',
    body_html: '<p>Test content</p>',
    status: 'draft',
    campaign_type: 'newsletter',
    created_by: 'user-123',
    is_active: true,
    stats: {
      total: 100,
      sent: 80,
      opened: 40,
      clicked: 20
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // getCampaigns
  // ========================================
  describe('getCampaigns', () => {
    it('fetches campaigns with default parameters', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [mockCampaign],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
        }
      };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await campaignService.getCampaigns();

      expect(mockApi.get).toHaveBeenCalledWith('/campaigns?');
      expect(result.data).toEqual([mockCampaign]);
      expect(result.pagination).toBeDefined();
    });

    it('passes filter parameters', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [mockCampaign],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
        }
      };
      mockApi.get.mockResolvedValue(mockResponse);

      await campaignService.getCampaigns({
        status: 'draft',
        campaign_type: 'newsletter',
        search: 'test',
        page: 2
      });

      const callArg = mockApi.get.mock.calls[0][0];
      expect(callArg).toContain('status=draft');
      expect(callArg).toContain('campaign_type=newsletter');
      expect(callArg).toContain('search=test');
      expect(callArg).toContain('page=2');
    });

    it('handles API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      await expect(campaignService.getCampaigns()).rejects.toThrow('Network error');
    });
  });

  // ========================================
  // getCampaignById
  // ========================================
  describe('getCampaignById', () => {
    it('fetches campaign by id', async () => {
      const mockResponse = {
        data: { success: true, data: mockCampaign }
      };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await campaignService.getCampaignById('123');

      expect(mockApi.get).toHaveBeenCalledWith('/campaigns/123');
      expect(result).toEqual(mockCampaign);
    });

    it('throws error for non-existent campaign', async () => {
      mockApi.get.mockRejectedValue({
        response: { status: 404, data: { error: 'Campaign not found' } }
      });

      await expect(campaignService.getCampaignById('invalid')).rejects.toBeDefined();
    });
  });

  // ========================================
  // createCampaign
  // ========================================
  describe('createCampaign', () => {
    it('creates a new campaign', async () => {
      const newCampaign = {
        name: 'New Campaign',
        subject: 'Test Subject',
        body_html: '<p>Content</p>'
      };
      const mockResponse = {
        data: { success: true, data: { ...mockCampaign, ...newCampaign } }
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await campaignService.createCampaign(newCampaign);

      expect(mockApi.post).toHaveBeenCalledWith('/campaigns', newCampaign);
      expect(result.name).toBe('New Campaign');
    });

    it('includes sender_id if provided', async () => {
      const newCampaign = {
        name: 'Campaign with Sender',
        subject: 'Test',
        sender_id: 'dietitian-123'
      };
      const mockResponse = {
        data: { success: true, data: { ...mockCampaign, ...newCampaign } }
      };
      mockApi.post.mockResolvedValue(mockResponse);

      await campaignService.createCampaign(newCampaign);

      expect(mockApi.post).toHaveBeenCalledWith('/campaigns', expect.objectContaining({
        sender_id: 'dietitian-123'
      }));
    });
  });

  // ========================================
  // updateCampaign
  // ========================================
  describe('updateCampaign', () => {
    it('updates campaign', async () => {
      const updates = { name: 'Updated Name' };
      const mockResponse = {
        data: { success: true, data: { ...mockCampaign, ...updates } }
      };
      mockApi.put.mockResolvedValue(mockResponse);

      const result = await campaignService.updateCampaign('123', updates);

      expect(mockApi.put).toHaveBeenCalledWith('/campaigns/123', updates);
      expect(result.name).toBe('Updated Name');
    });
  });

  // ========================================
  // deleteCampaign
  // ========================================
  describe('deleteCampaign', () => {
    it('deletes campaign', async () => {
      const mockResponse = {
        data: { success: true, message: 'Campaign deleted' }
      };
      mockApi.delete.mockResolvedValue(mockResponse);

      await campaignService.deleteCampaign('123');

      expect(mockApi.delete).toHaveBeenCalledWith('/campaigns/123');
    });
  });

  // ========================================
  // duplicateCampaign
  // ========================================
  describe('duplicateCampaign', () => {
    it('duplicates campaign', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { ...mockCampaign, id: 'new-id', name: 'Test Campaign (copie)' }
        }
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await campaignService.duplicateCampaign('123');

      expect(mockApi.post).toHaveBeenCalledWith('/campaigns/123/duplicate');
      expect(result.name).toContain('copie');
    });
  });

  // ========================================
  // sendCampaign
  // ========================================
  describe('sendCampaign', () => {
    it('sends campaign immediately', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { ...mockCampaign, status: 'sending' }
        }
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await campaignService.sendCampaign('123');

      expect(mockApi.post).toHaveBeenCalledWith('/campaigns/123/send');
      expect(result.status).toBe('sending');
    });
  });

  // ========================================
  // scheduleCampaign
  // ========================================
  describe('scheduleCampaign', () => {
    it('schedules campaign', async () => {
      const scheduledAt = '2025-02-15T10:00:00Z';
      const mockResponse = {
        data: {
          success: true,
          data: { ...mockCampaign, status: 'scheduled', scheduled_at: scheduledAt }
        }
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await campaignService.scheduleCampaign('123', scheduledAt);

      expect(mockApi.post).toHaveBeenCalledWith('/campaigns/123/schedule', {
        scheduled_at: scheduledAt
      });
      expect(result.status).toBe('scheduled');
    });
  });

  // ========================================
  // cancelCampaign
  // ========================================
  describe('cancelCampaign', () => {
    it('cancels campaign', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { ...mockCampaign, status: 'cancelled' }
        }
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await campaignService.cancelCampaign('123');

      expect(mockApi.post).toHaveBeenCalledWith('/campaigns/123/cancel');
      expect(result.status).toBe('cancelled');
    });
  });

  // ========================================
  // previewAudienceCriteria
  // ========================================
  describe('previewAudienceCriteria', () => {
    it('previews audience', async () => {
      const criteria = {
        conditions: [{ field: 'is_active', operator: 'equals', value: true }],
        logic: 'AND'
      };
      const mockResponse = {
        data: {
          success: true,
          data: { count: 50, sample: [{ id: '1', first_name: 'Jean' }] }
        }
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await campaignService.previewAudienceCriteria(criteria);

      expect(mockApi.post).toHaveBeenCalledWith('/campaigns/preview-audience', { criteria });
      expect(result.count).toBe(50);
    });
  });

  // ========================================
  // getCampaignStats
  // ========================================
  describe('getCampaignStats', () => {
    it('fetches campaign stats', async () => {
      const mockStats = {
        campaign: mockCampaign,
        stats: { sent: 100, opened: 50, clicked: 25 },
        dailyStats: []
      };
      const mockResponse = {
        data: { success: true, data: mockStats }
      };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await campaignService.getCampaignStats('123');

      expect(mockApi.get).toHaveBeenCalledWith('/campaigns/123/stats');
      expect(result.stats.sent).toBe(100);
    });
  });

  // ========================================
  // getCampaignRecipients
  // ========================================
  describe('getCampaignRecipients', () => {
    it('fetches campaign recipients', async () => {
      const mockRecipients = [
        { id: '1', email: 'test@example.com', status: 'sent' }
      ];
      const mockResponse = {
        data: {
          success: true,
          data: mockRecipients,
          pagination: { page: 1, total: 1 }
        }
      };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await campaignService.getCampaignRecipients('123');

      expect(mockApi.get).toHaveBeenCalledWith('/campaigns/123/recipients?');
      expect(result.data).toEqual(mockRecipients);
    });

    it('passes filter parameters', async () => {
      const mockResponse = {
        data: { success: true, data: [], pagination: {} }
      };
      mockApi.get.mockResolvedValue(mockResponse);

      await campaignService.getCampaignRecipients('123', {
        status: 'failed',
        search: 'test',
        page: 2
      });

      const callArg = mockApi.get.mock.calls[0][0];
      expect(callArg).toContain('status=failed');
      expect(callArg).toContain('search=test');
      expect(callArg).toContain('page=2');
    });
  });

  // ========================================
  // getSegmentFields
  // ========================================
  describe('getSegmentFields', () => {
    it('fetches segment fields', async () => {
      const mockFields = {
        statuses: [{ value: true, label: 'Active' }],
        dietitians: [{ id: '1', name: 'Dr. Smith' }],
        tags: ['diabetes', 'weight-loss']
      };
      const mockResponse = {
        data: { success: true, data: mockFields }
      };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await campaignService.getSegmentFields();

      expect(mockApi.get).toHaveBeenCalledWith('/campaigns/segment-fields');
      expect(result).toEqual(mockFields);
    });
  });
});
