import api from './api';

/**
 * Patient Tag Service
 * Handles patient tagging functionality for segmentation
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Get all available tags for filtering
 * @returns {Promise<Array>} Array of tag names
 */
export const getAllTags = async () => {
  try {
    const response = await api.get(`${API_BASE_URL}/patients/tags`);

    // Handle nested response structure
    const data = response.data?.data || response.data || [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching all tags:', error);
    throw error;
  }
};

/**
 * Get tags for a specific patient
 * @param {string} patientId - Patient UUID
 * @returns {Promise<Array>} Array of tag names
 */
export const getPatientTags = async (patientId) => {
  try {
    const response = await api.get(`${API_BASE_URL}/patients/${patientId}/tags`);

    // Handle nested response structure
    const data = response.data?.data || response.data || [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching patient tags:', error);
    throw error;
  }
};

/**
 * Add a tag to a patient
 * @param {string} patientId - Patient UUID
 * @param {string} tagName - Tag name to add
 * @returns {Promise<Object>} Created tag object
 */
export const addPatientTag = async (patientId, tagName) => {
  try {
    const response = await api.post(`${API_BASE_URL}/patients/${patientId}/tags`, {
      tag_name: tagName
    });

    // Handle nested response structure
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error adding patient tag:', error);
    throw error;
  }
};

/**
 * Remove a tag from a patient
 * @param {string} patientId - Patient UUID
 * @param {string} tagName - Tag name to remove
 * @returns {Promise<boolean>} Success status
 */
export const removePatientTag = async (patientId, tagName) => {
  try {
    await api.delete(`${API_BASE_URL}/patients/${patientId}/tags/${encodeURIComponent(tagName)}`);
    return true;
  } catch (error) {
    console.error('Error removing patient tag:', error);
    throw error;
  }
};

/**
 * Update all tags for a patient (replace existing)
 * @param {string} patientId - Patient UUID
 * @param {Array<string>} tags - Array of tag names
 * @returns {Promise<Array>} Updated tags array
 */
export const updatePatientTags = async (patientId, tags) => {
  try {
    const response = await api.put(`${API_BASE_URL}/patients/${patientId}/tags`, {
      tags
    });

    // Handle nested response structure
    const data = response.data?.data || response.data || [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error updating patient tags:', error);
    throw error;
  }
};

/**
 * Create a new tag if it doesn't exist and add it to patient
 * @param {string} patientId - Patient UUID
 * @param {string} tagName - Tag name to create and add
 * @returns {Promise<Object>} Created tag object
 */
export const createAndAddTag = async (patientId, tagName) => {
  try {
    // Normalize tag name
    const normalizedTag = tagName.toLowerCase().trim();

    if (!normalizedTag) {
      throw new Error('Tag name cannot be empty');
    }

    // Add the tag to the patient
    return await addPatientTag(patientId, normalizedTag);
  } catch (error) {
    console.error('Error creating and adding tag:', error);
    throw error;
  }
};

/**
 * Batch add multiple tags to a patient
 * @param {string} patientId - Patient UUID
 * @param {Array<string>} tagNames - Array of tag names to add
 * @returns {Promise<Array>} Array of successfully added tags
 */
export const batchAddTags = async (patientId, tagNames) => {
  try {
    const results = [];
    const errors = [];

    for (const tagName of tagNames) {
      try {
        const result = await addPatientTag(patientId, tagName);
        results.push(result);
      } catch (error) {
        errors.push({ tagName, error: error.message });
      }
    }

    if (errors.length > 0) {
      console.warn('Some tags failed to add:', errors);
    }

    return results;
  } catch (error) {
    console.error('Error in batch add tags:', error);
    throw error;
  }
};

/**
 * Batch remove multiple tags from a patient
 * @param {string} patientId - Patient UUID
 * @param {Array<string>} tagNames - Array of tag names to remove
 * @returns {Promise<Array>} Array of successfully removed tags
 */
export const batchRemoveTags = async (patientId, tagNames) => {
  try {
    const results = [];
    const errors = [];

    for (const tagName of tagNames) {
      try {
        await removePatientTag(patientId, tagName);
        results.push(tagName);
      } catch (error) {
        errors.push({ tagName, error: error.message });
      }
    }

    if (errors.length > 0) {
      console.warn('Some tags failed to remove:', errors);
    }

    return results;
  } catch (error) {
    console.error('Error in batch remove tags:', error);
    throw error;
  }
};