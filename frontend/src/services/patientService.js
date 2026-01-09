/**
 * Patient Service
 * API calls for patient management
 */

import api from './api';

/**
 * Transform snake_case patient data from backend to camelCase for frontend
 */
const transformPatientFromBackend = (patient) => {
  if (!patient) return null;
  
  return {
    id: patient.id,
    firstName: patient.first_name,
    lastName: patient.last_name,
    email: patient.email,
    phone: patient.phone,
    dateOfBirth: patient.date_of_birth,
    gender: patient.gender?.toLowerCase(), // Convert back to lowercase
    address: patient.address,
    city: patient.city,
    state: patient.state,
    zipCode: patient.postal_code,
    emergencyContactName: patient.emergency_contact_name,
    emergencyContactPhone: patient.emergency_contact_phone,
    medicalHistory: patient.medical_notes,
    allergies: patient.allergies,
    dietaryRestrictions: patient.dietary_preferences,
    isActive: patient.is_active,
    assignedDietitianId: patient.assigned_dietitian_id,
    createdAt: patient.created_at,
    updatedAt: patient.updated_at,
    assignedDietitian: patient.assignedDietitian,
  };
};

/**
 * Get all patients with filters and pagination
 */
export const getPatients = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.page) {
      params.append('page', filters.page);
    }
    if (filters.limit) {
      params.append('limit', filters.limit);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }

    const response = await api.get(`/patients?${params.toString()}`);
    console.log('[PatientService] Get patients response:', response.data);
    // Backend returns {success, data: {patients, total, limit, offset}}
    const data = response.data.data || { patients: [], total: 0 };
    // Transform patients from snake_case to camelCase
    const transformedPatients = (data.patients || []).map(transformPatientFromBackend);
    return {
      patients: transformedPatients,
      total: data.total,
      limit: data.limit,
      offset: data.offset
    };
  } catch (error) {
    console.error('[PatientService] Get patients error:', error);
    const message = error.response?.data?.message || 'Failed to fetch patients';
    throw new Error(message);
  }
};

/**
 * Get single patient by ID
 */
export const getPatient = async (id) => {
  try {
    // Force fresh data by adding timestamp query param (cache busting)
    const response = await api.get(`/patients/${id}?_t=${Date.now()}`);
    console.log('[PatientService] Get patient response:', response.data);
    // Backend returns {success, data: {patient}}
    const patient = response.data.data?.patient;
    return transformPatientFromBackend(patient) || {};
  } catch (error) {
    console.error('[PatientService] Get patient error:', error);
    const message = error.response?.data?.message || 'Failed to fetch patient';
    throw new Error(message);
  }
};

/**
 * Create new patient
 */
export const createPatient = async (data) => {
  console.log('[PatientService] Creating patient with data:', data);
  
  // Helper to convert empty strings to null
  const toNullIfEmpty = (value) => (value === '' || value === undefined) ? null : value;
  
  // Transform camelCase to snake_case for backend
  const transformedData = {
    first_name: data.firstName,
    last_name: data.lastName,
    date_of_birth: toNullIfEmpty(data.dateOfBirth),
  };
  
  // Only add optional fields if they have values
  if (data.email && data.email.trim()) transformedData.email = data.email.trim();
  if (data.phone && data.phone.trim()) transformedData.phone = data.phone.trim();
  if (data.gender) transformedData.gender = data.gender.toUpperCase();
  if (data.address && data.address.trim()) transformedData.address = data.address.trim();
  if (data.city && data.city.trim()) transformedData.city = data.city.trim();
  if (data.state && data.state.trim()) transformedData.state = data.state.trim();
  if (data.zipCode && data.zipCode.trim()) transformedData.postal_code = data.zipCode.trim();
  if (data.emergencyContactName && data.emergencyContactName.trim()) transformedData.emergency_contact_name = data.emergencyContactName.trim();
  if (data.emergencyContactPhone && data.emergencyContactPhone.trim()) transformedData.emergency_contact_phone = data.emergencyContactPhone.trim();
  if (data.medicalHistory && data.medicalHistory.trim()) transformedData.medical_notes = data.medicalHistory.trim();
  if (data.allergies && data.allergies.trim()) transformedData.allergies = data.allergies.trim();
  if (data.dietaryRestrictions && data.dietaryRestrictions.trim()) transformedData.dietary_preferences = data.dietaryRestrictions.trim();
  
  console.log('[PatientService] Transformed data:', transformedData);
  
  try {
    const response = await api.post('/patients', transformedData);
    console.log('[PatientService] Patient created successfully:', response.data);
    // Backend returns {success, message, data: {patient}}
    const patient = response.data.data?.patient;
    return transformPatientFromBackend(patient);
  } catch (error) {
    console.error('[PatientService] Create patient error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
      validationDetails: error.response?.data?.error?.details
    });
    // Extract detailed error message
    const errorData = error.response?.data?.error;
    let message = 'Failed to create patient';
    
    if (errorData?.details && Array.isArray(errorData.details)) {
      // Show validation errors
      message = errorData.details.map(d => d.message).join(', ');
    } else if (errorData?.message) {
      message = errorData.message;
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    }
    
    throw new Error(message);
  }
};

/**
 * Update existing patient
 */
export const updatePatient = async (id, data) => {
  console.log('[PatientService] Updating patient', id, 'with data:', data);
  
  // Transform camelCase to snake_case for backend
  const transformedData = {
    first_name: data.firstName,
    last_name: data.lastName,
    date_of_birth: data.dateOfBirth || null,
  };
  
  // Only add optional fields if they have values
  if (data.email && data.email.trim()) transformedData.email = data.email.trim();
  if (data.phone && data.phone.trim()) transformedData.phone = data.phone.trim();
  if (data.gender) transformedData.gender = data.gender.toUpperCase();
  if (data.address && data.address.trim()) transformedData.address = data.address.trim();
  if (data.city && data.city.trim()) transformedData.city = data.city.trim();
  if (data.state && data.state.trim()) transformedData.state = data.state.trim();
  if (data.zipCode && data.zipCode.trim()) transformedData.postal_code = data.zipCode.trim();
  if (data.emergencyContactName && data.emergencyContactName.trim()) transformedData.emergency_contact_name = data.emergencyContactName.trim();
  if (data.emergencyContactPhone && data.emergencyContactPhone.trim()) transformedData.emergency_contact_phone = data.emergencyContactPhone.trim();
  if (data.medicalHistory && data.medicalHistory.trim()) transformedData.medical_notes = data.medicalHistory.trim();
  if (data.allergies && data.allergies.trim()) transformedData.allergies = data.allergies.trim();
  if (data.dietaryRestrictions && data.dietaryRestrictions.trim()) transformedData.dietary_preferences = data.dietaryRestrictions.trim();
  
  console.log('[PatientService] Transformed data for backend:', transformedData);
  
  try {
    const response = await api.put(`/patients/${id}`, transformedData);
    console.log('[PatientService] Update response:', response.data);
    console.log('[PatientService] Patient updated successfully');
    // Backend returns {success, message, data: {patient}}
    const patient = response.data.data?.patient;
    console.log('[PatientService] Patient from response:', patient);
    const transformedPatient = transformPatientFromBackend(patient);
    console.log('[PatientService] Transformed patient to return:', transformedPatient);
    return transformedPatient;
  } catch (error) {
    console.error('[PatientService] Update patient error:', error);
    console.error('[PatientService] Error response:', error.response?.data);
    const errorData = error.response?.data?.error;
    let message = 'Failed to update patient';
    
    if (errorData?.details && Array.isArray(errorData.details)) {
      // Show validation errors
      message = errorData.details.map(d => d.message).join(', ');
    } else if (errorData?.message) {
      message = errorData.message;
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    }
    
    throw new Error(message);
  }
};

/**
 * Delete patient
 */
export const deletePatient = async (id) => {
  try {
    const response = await api.delete(`/patients/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to delete patient';
    throw new Error(message);
  }
};

/**
 * Search patients by query
 */
export const searchPatients = async (query) => {
  try {
    const response = await api.get(`/patients/search?q=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to search patients';
    throw new Error(message);
  }
};

export default {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  searchPatients
};
