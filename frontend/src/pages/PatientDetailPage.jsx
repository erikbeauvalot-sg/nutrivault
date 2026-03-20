/**
 * PatientDetailPage Component
 * Detailed patient view with tabbed interface
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import useModalParam from '../hooks/useModalParam';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Dropdown, Modal, Form, InputGroup } from 'react-bootstrap';
import ResponsiveTabs, { Tab } from '../components/ResponsiveTabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import DocumentListComponent from '../components/DocumentListComponent';
import MeasurementCharts from '../components/MeasurementCharts';
import InvoiceList from '../components/InvoiceList';
import CustomFieldInput from '../components/CustomFieldInput';
import CustomFieldDisplay from '../components/CustomFieldDisplay';
import CustomFieldRadarChart from '../components/CustomFieldRadarChart';
import VisitFieldHistoryPanel from '../components/VisitFieldHistoryPanel';
import MeasureHistory from '../components/MeasureHistory';
import MeasureComparison from '../components/MeasureComparison';
import EmailHistory from '../components/EmailHistory';
import SharingHistory from '../components/SharingHistory';
import PatientHealthScore from '../components/PatientHealthScore';
import ActionButton from '../components/ActionButton';
import ConfirmModal from '../components/ConfirmModal';
import CreateVisitModal from '../components/CreateVisitModal';
import customFieldService from '../services/customFieldService';
import { formatDate as utilFormatDate } from '../utils/dateUtils';
import { getBMICategory, calculateBMI } from '../utils/bmiUtils';
import { applyTranslationsToMeasures, fetchMeasureTranslations } from '../utils/measureTranslations';
import { toast } from 'react-toastify';
import * as gdprService from '../services/gdprService';
import * as billingService from '../services/billingService';
import * as measureService from '../services/measureService';
import api from '../services/api';
import consultationNoteService from '../services/consultationNoteService';
import * as patientService from '../services/patientService';
import * as documentService from '../services/documentService';
import visitService from '../services/visitService';
import * as recipeService from '../services/recipeService';
import * as mealPlanService from '../services/mealPlanService';
import userService from '../services/userService';
import PortalStatusCard from '../components/PortalStatusCard';
import PatientJournalTab from '../components/PatientJournalTab';
import PatientGoalsTab from '../components/PatientGoalsTab';
import { FiSend } from 'react-icons/fi';
import './PatientDetailPage.css';

const PatientDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const getStatusText = (status) => {
    const statusMap = {
      SCHEDULED: t('visits.scheduled'),
      COMPLETED: t('visits.completed'),
      CANCELLED: t('visits.cancelled'),
      NO_SHOW: t('visits.noShow')
    };
    return statusMap[status] || status;
  };

  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'basic-info');
  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [goalsSummary, setGoalsSummary] = useState(null);
  const [consultationNotes, setConsultationNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [customFieldCategories, setCustomFieldCategories] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [savingFields, setSavingFields] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientMeasures, setPatientMeasures] = useState([]);
  const [measuresLoading, setMeasuresLoading] = useState(false);
  const [measuresDisplayLimit, setMeasuresDisplayLimit] = useState(20);
  const [measureTranslations, setMeasureTranslations] = useState({});
  const [showDeleteVisitConfirm, setShowDeleteVisitConfirm] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [showDeleteInvoiceConfirm, setShowDeleteInvoiceConfirm] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [patientRecipes, setPatientRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [patientMealPlans, setPatientMealPlans] = useState([]);
  const [mealPlansLoading, setMealPlansLoading] = useState(false);
  const [showCreateVisitModal, openCreateVisitModal, closeCreateVisitModal] = useModalParam('new-visit');
  const [allDietitians, setAllDietitians] = useState([]);
  const [addingDietitian, setAddingDietitian] = useState(false);
  const [selectedNewDietitianId, setSelectedNewDietitianId] = useState('');
  const [availableGuides, setAvailableGuides] = useState([]);
  const [sharingGuide, setSharingGuide] = useState(false);

  // Inline editing state
  const [localPatient, setLocalPatient] = useState({});
  const [fieldSaving, setFieldSaving] = useState({});
  const [fieldSaved, setFieldSaved] = useState({});
  const saveTimers = useRef({});
  const birthFieldDefIdRef = useRef(null);
  const addressFieldDefIdRef = useRef(null);
  const genderFieldDefIdRef = useRef(null);

  // Gender value mapping between patient model (Male/Female/Other) and custom field (Masculin/Féminin/Autre)
  const GENDER_TO_CUSTOM = { Male: 'Masculin', Female: 'Féminin', Other: 'Autre' };
  const CUSTOM_TO_GENDER = { Masculin: 'Male', Féminin: 'Female', Autre: 'Other' };

  useEffect(() => {
    if (id) {
      fetchPatientDetails();
      fetchPatientDocuments();
      fetchPatientInvoices();
      fetchPatientMeasures();
      fetchPatientRecipes();
      fetchPatientMealPlans();
      fetchAvailableGuides();
      fetchGoalsSummary();
      fetchConsultationNotes();
    }
  }, [id]);

  // Separate effect for custom fields that depends on language
  useEffect(() => {
    if (id) {
      fetchCustomFields();
    }
  }, [id, i18n.resolvedLanguage, i18n.language]);

  const [accessDenied, setAccessDenied] = useState(false);

  // Sync localPatient whenever patient data loads
  useEffect(() => {
    if (patient) {
      setLocalPatient({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        email: patient.email || '',
        phone: patient.phone || '',
        date_of_birth: patient.date_of_birth || '',
        gender: patient.gender || '',
        address: patient.address || '',
        medical_notes: patient.medical_notes || '',
        allergies: patient.allergies || '',
        dietary_preferences: patient.dietary_preferences || '',
        is_active: !!patient.is_active,
        appointment_reminders_enabled: !!patient.appointment_reminders_enabled,
      });
    }
  }, [patient]);

  // Inline edit: save a single patient field
  const savePatientField = useCallback(async (field, value) => {
    setFieldSaving(prev => ({ ...prev, [field]: true }));
    try {
      const updated = await patientService.updatePatient(id, { [field]: value });
      setPatient(updated);
      setFieldSaved(prev => ({ ...prev, [field]: true }));
      setTimeout(() => setFieldSaved(prev => ({ ...prev, [field]: false })), 2000);
      // Sync standard fields → custom field counterparts
      const customSyncs = [];
      if (field === 'date_of_birth' && value && birthFieldDefIdRef.current)
        customSyncs.push({ definition_id: birthFieldDefIdRef.current, value });
      if (field === 'address' && addressFieldDefIdRef.current)
        customSyncs.push({ definition_id: addressFieldDefIdRef.current, value: value || '' });
      if (field === 'gender' && genderFieldDefIdRef.current) {
        const customVal = GENDER_TO_CUSTOM[value] || value;
        customSyncs.push({ definition_id: genderFieldDefIdRef.current, value: customVal });
      }
      if (customSyncs.length > 0) {
        await customFieldService.updatePatientCustomFields(id, customSyncs);
        setFieldValues(prev => {
          const next = { ...prev };
          customSyncs.forEach(s => { next[s.definition_id] = s.value; });
          return next;
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || t('patients.failedToUpdate', 'Erreur lors de la sauvegarde'));
      // Reset to server value
      setLocalPatient(prev => ({ ...prev, [field]: patient?.[field] ?? '' }));
    } finally {
      setFieldSaving(prev => ({ ...prev, [field]: false }));
    }
  }, [id, patient, t]);

  const handlePatientFieldChange = (field, value) => {
    setLocalPatient(prev => ({ ...prev, [field]: value }));
  };

  const handlePatientFieldBlur = (field) => {
    const current = localPatient[field];
    const original = patient?.[field] ?? '';
    if (current !== original) {
      savePatientField(field, current);
    }
  };

  const handleToggleChange = (field) => {
    const newValue = !localPatient[field];
    setLocalPatient(prev => ({ ...prev, [field]: newValue }));
    savePatientField(field, newValue);
  };

  // Auto-save a single custom field (debounced 800ms)
  const handleCustomFieldAutoSave = useCallback((definitionId, value) => {
    if (saveTimers.current[definitionId]) {
      clearTimeout(saveTimers.current[definitionId]);
    }
    saveTimers.current[definitionId] = setTimeout(async () => {
      try {
        await customFieldService.updatePatientCustomFields(id, [{ definition_id: definitionId, value }]);
        const key = `cf_${definitionId}`;
        setFieldSaved(prev => ({ ...prev, [key]: true }));
        setTimeout(() => setFieldSaved(prev => ({ ...prev, [key]: false })), 2000);
        // Sync custom field → standard patient fields
        const defId = String(definitionId);
        if (defId === String(birthFieldDefIdRef.current) && value) {
          await patientService.updatePatient(id, { date_of_birth: value });
          setPatient(prev => ({ ...prev, date_of_birth: value }));
          setLocalPatient(prev => ({ ...prev, date_of_birth: value }));
        } else if (defId === String(addressFieldDefIdRef.current)) {
          await patientService.updatePatient(id, { address: value || '' });
          setPatient(prev => ({ ...prev, address: value || '' }));
          setLocalPatient(prev => ({ ...prev, address: value || '' }));
        } else if (defId === String(genderFieldDefIdRef.current) && value) {
          const patientVal = CUSTOM_TO_GENDER[value] || value;
          await patientService.updatePatient(id, { gender: patientVal });
          setPatient(prev => ({ ...prev, gender: patientVal }));
          setLocalPatient(prev => ({ ...prev, gender: patientVal }));
        }
      } catch (err) {
        toast.error(err.response?.data?.error || t('patients.failedToUpdate', 'Erreur lors de la sauvegarde'));
      }
    }, 800);
  }, [id, t]);

  // Fetch all dietitians for ADMIN management
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      userService.getDietitians()
        .then(data => setAllDietitians(Array.isArray(data) ? data : []))
        .catch(() => setAllDietitians([]));
    }
  }, [user?.role]);

  const handleAddDietitian = async () => {
    if (!selectedNewDietitianId || !patient?.id) return;
    setAddingDietitian(true);
    try {
      await api.post(`/patients/${patient.id}/dietitians`, { dietitian_id: selectedNewDietitianId });
      setSelectedNewDietitianId('');
      await fetchPatientDetails();
    } catch (err) {
      console.error('Error adding dietitian:', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'ajout du diététicien');
    } finally {
      setAddingDietitian(false);
    }
  };

  const handleRemoveDietitian = async (dietitianId) => {
    if (!patient?.id) return;
    try {
      await api.delete(`/patients/${patient.id}/dietitians/${dietitianId}`);
      await fetchPatientDetails();
    } catch (err) {
      console.error('Error removing dietitian:', err);
      setError(err.response?.data?.error || 'Erreur lors du retrait du diététicien');
    }
  };

  const fetchConsultationNotes = async () => {
    setNotesLoading(true);
    try {
      const res = await consultationNoteService.getNotes({ patient_id: id });
      setConsultationNotes(res.data || []);
    } catch {
      // silent
    } finally {
      setNotesLoading(false);
    }
  };

  const fetchGoalsSummary = async () => {
    try {
      const [goalsRes, achRes] = await Promise.all([
        api.get(`/patients/${id}/goals`),
        api.get(`/patients/${id}/achievements`)
      ]);
      const goals = goalsRes.data?.data || [];
      const achievements = achRes.data?.data || [];
      setGoalsSummary({
        active: goals.filter(g => g.status === 'active'),
        completed: goals.filter(g => g.status === 'completed').length,
        achievements,
        totalPoints: achievements.reduce((s, a) => s + (a.reward_points || 0), 0)
      });
    } catch {
      // silent — goals feature may not exist yet for this patient
    }
  };

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      setAccessDenied(false);
      const patientData = await patientService.getPatientDetails(id);
      setPatient(patientData);
      setVisits(patientData?.visits || []);
      setError(null);
    } catch (err) {
      if (err.response?.status === 403) {
        setAccessDenied(true);
      } else {
        setError(t('patients.failedToLoad') + ': ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientDocuments = async () => {
    try {
      const response = await documentService.getDocuments({
        resource_type: 'patient',
        resource_id: id
      });
      const documentsData = response?.data || response;
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
    } catch (err) {
      console.error('Error fetching patient documents:', err);
      // Don't set error for documents failure
    }
  };

  const fetchAvailableGuides = async () => {
    try {
      const response = await documentService.getConsultationGuides();
      const data = response.data?.data || response.data || [];
      setAvailableGuides(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching guides:', err);
    }
  };

  const handleShareGuide = async (guideId) => {
    try {
      setSharingGuide(true);
      await documentService.sendToPatient(guideId, id, { sent_via: 'portal' });
      fetchPatientDocuments();
    } catch (err) {
      console.error('Error sharing guide:', err);
    } finally {
      setSharingGuide(false);
    }
  };

  const fetchPatientInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const response = await billingService.getInvoices({ patient_id: id, limit: 1000 });
      const invoicesData = response.data?.data || response.data || [];
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (err) {
      console.error('Error fetching patient invoices:', err);
      // Don't set error for invoices failure
    } finally {
      setInvoicesLoading(false);
    }
  };

  const fetchPatientRecipes = async () => {
    try {
      setRecipesLoading(true);
      const { data } = await recipeService.getPatientRecipes(id);
      setPatientRecipes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching patient recipes:', err);
      // Don't set error for recipes failure
    } finally {
      setRecipesLoading(false);
    }
  };

  const fetchPatientMealPlans = async () => {
    try {
      setMealPlansLoading(true);
      const result = await mealPlanService.getMealPlans({ patient_id: id });
      setPatientMealPlans(result.data || []);
    } catch (err) {
      console.error('Error fetching patient meal plans:', err);
    } finally {
      setMealPlansLoading(false);
    }
  };

  const fetchPatientMeasures = async () => {
    try {
      setMeasuresLoading(true);
      const measuresData = await measureService.getPatientMeasures(id);
      const measuresArray = Array.isArray(measuresData) ? measuresData : [];

      // Get unique measure definition IDs
      const measureDefIds = [...new Set(
        measuresArray
          .filter(m => m.measure_definition_id)
          .map(m => m.measure_definition_id)
      )];

      // Fetch translations for all measure definitions
      if (measureDefIds.length > 0) {
        const translations = await fetchMeasureTranslations(
          measureDefIds,
          measureService.getAllMeasureTranslations
        );
        setMeasureTranslations(translations);

        // Apply translations based on current language
        const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
        const translatedMeasures = applyTranslationsToMeasures(
          measuresArray,
          translations,
          currentLanguage
        );
        setPatientMeasures(translatedMeasures);
      } else {
        setPatientMeasures(measuresArray);
      }
    } catch (err) {
      console.error('Error fetching patient measures:', err);
      // Don't set error for measures failure
    } finally {
      setMeasuresLoading(false);
    }
  };

  const fetchCustomFields = async () => {
    try {
      let language = i18n.resolvedLanguage || i18n.language;
      if (!language) {
        language = localStorage.getItem('i18nextLng') || 'fr';
      }
      const data = await customFieldService.getPatientCustomFields(id, language);
      setCustomFieldCategories(data || []);

      // Build initial values map
      const values = {};
      data.forEach(category => {
        category.fields.forEach(field => {
          values[field.definition_id] = field.value;
        });
      });
      setFieldValues(values);

      // Sync standard patient fields with their custom field counterparts
      const syncUpdates = {};
      for (const category of data) {
        for (const field of category.fields) {
          const name = field.field_name || '';
          if (name.includes('naissance') || name.includes('birth')) {
            birthFieldDefIdRef.current = field.definition_id;
            if (field.value && !patient?.date_of_birth) syncUpdates.date_of_birth = field.value;
          } else if (name === 'adresse' || name.includes('address')) {
            addressFieldDefIdRef.current = field.definition_id;
            if (field.value && !patient?.address) syncUpdates.address = field.value;
          } else if (name === 'sexe' || name.includes('gender') || name.includes('genre')) {
            genderFieldDefIdRef.current = field.definition_id;
            if (field.value && !patient?.gender) {
              const mapped = CUSTOM_TO_GENDER[field.value] || field.value;
              syncUpdates.gender = mapped;
            }
          }
        }
      }
      if (Object.keys(syncUpdates).length > 0) {
        setLocalPatient(prev => ({ ...prev, ...syncUpdates }));
      }
    } catch (err) {
      console.error('Error fetching custom fields:', err);
      // Don't set error for custom fields failure
    }
  };

  const handleFieldChange = (definitionId, value) => {
    setFieldValues(prev => ({
      ...prev,
      [definitionId]: value
    }));

    // Clear error for this field
    if (fieldErrors[definitionId]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[definitionId];
        return newErrors;
      });
    }
  };

  const handleSaveCustomFields = async () => {
    try {
      setSavingFields(true);

      // Build fields array for API
      const fieldsToUpdate = [];
      Object.keys(fieldValues).forEach(definitionId => {
        const value = fieldValues[definitionId];
        // Only include fields that have a value
        if (value !== null && value !== undefined && value !== '') {
          fieldsToUpdate.push({
            definition_id: definitionId,
            value: value
          });
        }
      });

      if (fieldsToUpdate.length > 0) {
        await customFieldService.updatePatientCustomFields(id, fieldsToUpdate);
        await fetchCustomFields();
      }
    } catch (err) {
      console.error('Error saving custom fields:', err);
      setError(err.response?.data?.error || 'Failed to save custom fields');
    } finally {
      setSavingFields(false);
    }
  };

  const handleBack = () => {
    navigate('/patients');
  };

  const handleEditPatient = () => {
    navigate(`/patients/${id}/edit`);
  };

  // Search across custom fields
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return { hasResults: false, matchingFields: [], matchingCategory: null };
    }

    const query = searchQuery.toLowerCase();
    const matchingFields = [];
    let matchingCategory = null;

    customFieldCategories.forEach(category => {
      category.fields.forEach(field => {
        const fieldLabel = field.field_label?.toLowerCase() || '';
        const fieldValue = fieldValues[field.definition_id]?.toString()?.toLowerCase() || '';
        const categoryName = category.name?.toLowerCase() || '';

        if (fieldLabel.includes(query) || fieldValue.includes(query) || categoryName.includes(query)) {
          matchingFields.push({
            ...field,
            categoryId: category.id,
            categoryName: category.name
          });
          if (!matchingCategory) {
            matchingCategory = category.id;
          }
        }
      });
    });

    return {
      hasResults: matchingFields.length > 0,
      matchingFields,
      matchingCategory
    };
  }, [searchQuery, customFieldCategories, fieldValues]);

  // Auto-switch to tab with search results
  useEffect(() => {
    if (searchResults.hasResults && searchResults.matchingCategory) {
      setActiveTab(`category-${searchResults.matchingCategory}`);
    }
  }, [searchResults]);

  // Highlight matching text
  const highlightText = (text, query) => {
    if (!text || !query.trim()) return text;

    const parts = text.toString().split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} style={{ backgroundColor: '#fff3cd', padding: '0 2px', fontWeight: 'bold' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleExportData = async (format) => {
    try {
      setIsExporting(true);
      setError(null);
      await gdprService.exportPatientData(id, format);
      toast.success(t('gdpr.exportSuccess', 'Patient data exported successfully'));
    } catch (err) {
      setError(t('gdpr.exportFailed') + ': ' + (err.response?.data?.error || err.message));
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeletePermanently = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await gdprService.deletePatientPermanently(id);
      toast.success(t('gdpr.deleteSuccess', 'Patient permanently deleted'));
      navigate('/patients');
    } catch (err) {
      setError(t('gdpr.deleteFailed') + ': ' + (err.response?.data?.error || err.message));
      console.error('Delete error:', err);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewVisit = (visitId) => {
    navigate(`/visits/${visitId}`);
  };

  const handleEditVisit = (visitId) => {
    navigate(`/visits/${visitId}/edit`);
  };

  const handleDeleteVisit = (visitId) => {
    setVisitToDelete(visitId);
    setShowDeleteVisitConfirm(true);
  };

  const confirmDeleteVisit = async () => {
    if (!visitToDelete) return;

    try {
      await visitService.deleteVisit(visitToDelete);
      // Refresh patient details to update visit list
      fetchPatientDetails();
    } catch (err) {
      console.error('Error deleting visit:', err);
      setError(t('errors.failedToDeleteVisit', { error: err.response?.data?.error || err.message }));
    } finally {
      setVisitToDelete(null);
    }
  };

  const handleAddVisit = () => {
    openCreateVisitModal();
  };

  const handleAddPayment = () => {
    navigate('/billing/create', { state: { selectedPatient: patient } });
  };

  const handleViewInvoice = (invoice) => {
    navigate(`/billing/${invoice.id}`);
  };

  const handleEditInvoice = (invoice) => {
    navigate(`/billing/${invoice.id}/edit`);
  };

  const handleRecordPayment = (invoice) => {
    navigate(`/billing/${invoice.id}/record-payment`);
  };

  const handleDeleteInvoice = (invoiceId) => {
    setInvoiceToDelete(invoiceId);
    setShowDeleteInvoiceConfirm(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await billingService.deleteInvoice(invoiceToDelete);
      // Refresh invoices list
      fetchPatientInvoices();
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setError(t('errors.failedToDeleteInvoice', { error: err.response?.data?.error || err.message }));
    } finally {
      setInvoiceToDelete(null);
    }
  };



  const formatDate = (dateString) => {
    return utilFormatDate(dateString, i18n.language);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(dateString).toLocaleString(locale);
  };

  // Helper to get column width based on display_layout
  const getColumnWidth = (columns) => {
    const columnMap = {
      1: 12,
      2: 6,
      3: 4,
      4: 3,
      6: 2
    };
    return columnMap[columns] || 6;
  };

  // Check permissions
  const canEditPatient = user?.role === 'ADMIN' || user?.role === 'DIETITIAN';
  const canReadMealPlans = user?.role === 'ADMIN' || user?.role === 'DIETITIAN' || user?.role === 'ASSISTANT' || user?.role === 'VIEWER';
  const canCreateMealPlans = user?.role === 'ADMIN' || user?.role === 'DIETITIAN' || user?.role === 'ASSISTANT';
  const canViewMedicalData = user?.role === 'ADMIN' || user?.role === 'DIETITIAN' || user?.role === 'ASSISTANT';
  const canEditVisits = user?.role === 'ADMIN' || user?.role === 'DIETITIAN' || user?.role === 'ASSISTANT';
  const canDeleteVisits = user?.role === 'ADMIN' || user?.role === 'DIETITIAN';

  if (loading) {
    return (
      <Layout>
        <Container fluid>
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2">{t('patients.loadingPatientDetails', 'Loading patient details...')}</div>
          </div>
        </Container>
      </Layout>
    );
  }

  if (accessDenied) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="warning" className="mt-4">
            <Alert.Heading>{t('patients.accessDeniedTitle', 'Accès refusé')}</Alert.Heading>
            <p>{t('patients.accessDeniedMessage', 'Vous n\'êtes pas lié à ce patient. Créez une visite pour ce patient ou demandez à un administrateur de vous lier.')}</p>
            <Button variant="outline-warning" onClick={handleBack}>
              {t('patients.backToPatients')}
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="danger">
            <Alert.Heading>{t('patients.errorLoadingPatient')}</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={handleBack}>
              {t('patients.backToPatients')}
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="warning">
            <Alert.Heading>{t('patients.patientNotFound')}</Alert.Heading>
            <p>{t('patients.patientNotFoundMessage')}</p>
            <Button variant="outline-warning" onClick={handleBack}>
              {t('patients.backToPatients')}
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid>
        {/* Header */}
        <div className="mb-4">
          <Button
            variant="outline-secondary"
            onClick={handleBack}
            className="patient-detail-back-btn mb-3"
          >
            ← {t('patients.backToPatients', 'Back to Patients')}
          </Button>

          <div className="patient-detail-header d-flex justify-content-between align-items-center">
            <div>
              <h1 className="mb-0">
                {patient.first_name} {patient.last_name}
              </h1>
              <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                <Badge bg={patient.is_active ? 'success' : 'secondary'}>
                  {patient.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                </Badge>
                {patient.medical_record_number && (
                  <small className="text-muted">
                    {t('patients.mrn', 'MRN')}: {patient.medical_record_number}
                  </small>
                )}
              </div>
            </div>

            <div className="patient-detail-actions d-flex gap-2 flex-wrap">
              <Button
                variant="success"
                onClick={handleAddVisit}
                title={t('patients.addVisit')}
              >
                ➕ {t('patients.addVisit')}
              </Button>
              <Button
                variant="info"
                onClick={handleAddPayment}
                title={t('patients.addPayment')}
              >
                💰 {t('patients.addPayment')}
              </Button>
              {canEditPatient && (
                <Button
                  variant="primary"
                  onClick={handleEditPatient}
                >
                  {t('patients.editPatient')}
                </Button>
              )}
              {canEditPatient && (
                <Dropdown>
                  <Dropdown.Toggle
                    variant="secondary"
                    id="gdpr-actions"
                    style={{ minHeight: '38px' }}
                  >
                    🔒 {t('gdpr.actions', 'RGPD')}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item
                      onClick={() => handleExportData('json')}
                      disabled={isExporting}
                    >
                      📄 {t('gdpr.exportJSON', 'Export Data (JSON)')}
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => handleExportData('csv')}
                      disabled={isExporting}
                    >
                      📊 {t('gdpr.exportCSV', 'Export Data (CSV)')}
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      onClick={() => setShowDeleteModal(true)}
                      className="text-danger"
                    >
                      🗑️ {t('gdpr.deletePermanently', 'Delete Permanently')}
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </div>
          </div>
        </div>

        {/* Health Score */}
        <Row className="mb-3">
          <Col xs={12} md={6} lg={4}>
            <PatientHealthScore patientId={id} />
          </Col>
        </Row>

        {/* Patient Details Tabs */}
        <Card>
          <Card.Body>
            {/* Search Bar for Custom Fields */}
            <Row className="mb-3">
              <Col xs={12} md={6}>
                <InputGroup>
                  <InputGroup.Text>🔍</InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <Button
                      variant="outline-secondary"
                      onClick={() => setSearchQuery('')}
                      title="Effacer la recherche"
                    >
                      ✕
                    </Button>
                  )}
                </InputGroup>
                {searchQuery && (
                  <Form.Text className="text-muted">
                    {searchResults.hasResults ? (
                      <>
                        {searchResults.matchingFields.length} champ{searchResults.matchingFields.length !== 1 ? 's' : ''} trouvé
                        {searchResults.matchingCategory && ' - basculé vers l\'onglet correspondant'}
                      </>
                    ) : (
                      'Aucun champ ne correspond à votre recherche'
                    )}
                  </Form.Text>
                )}
              </Col>
            </Row>

            <ResponsiveTabs activeKey={activeTab} onSelect={handleTabSelect} id="patient-detail-tabs">
              {/* 1. Aperçu Tab */}
              <Tab eventKey="basic-info" title={`📋 ${t('patients.basicInformation', 'Overview')}`}>
                {/* Inline-editable patient info */}
                <Card className="mb-3">
                  <Card.Header className="bg-primary text-white d-flex align-items-center justify-content-between">
                    <h6 className="mb-0">{t('patients.basicInformationTitle', 'Patient Basic Information')}</h6>
                    <small className="opacity-75" style={{ fontSize: '0.72rem' }}>
                      ✏️ {t('patients.clickToEdit', 'Cliquer pour modifier — sauvegarde automatique')}
                    </small>
                  </Card.Header>
                  <Card.Body>
                    {/* Helper to render one inline editable row */}
                    {(() => {
                      const InlineRow = ({ label, field, type = 'text', children }) => (
                        <Row className="mb-2 align-items-center">
                          <Col sm={4}>
                            <small className="text-muted fw-semibold">{label}</small>
                          </Col>
                          <Col sm={8}>
                            <div className="d-flex align-items-center gap-1">
                              {children}
                              {fieldSaving[field] && <Spinner animation="border" size="sm" style={{ width: '12px', height: '12px', borderWidth: '2px' }} />}
                              {fieldSaved[field] && <span className="inline-saved-indicator">✓</span>}
                            </div>
                          </Col>
                        </Row>
                      );

                      return canEditPatient ? (
                        <>
                          <Row>
                            <Col xs={12} md={6}>
                              <InlineRow label={t('patients.firstName', 'Prénom')} field="first_name">
                                <input
                                  className="inline-field"
                                  type="text"
                                  value={localPatient.first_name ?? ''}
                                  onChange={e => handlePatientFieldChange('first_name', e.target.value)}
                                  onBlur={() => handlePatientFieldBlur('first_name')}
                                />
                              </InlineRow>
                              <InlineRow label={t('patients.lastName', 'Nom')} field="last_name">
                                <input
                                  className="inline-field"
                                  type="text"
                                  value={localPatient.last_name ?? ''}
                                  onChange={e => handlePatientFieldChange('last_name', e.target.value)}
                                  onBlur={() => handlePatientFieldBlur('last_name')}
                                />
                              </InlineRow>
                              <InlineRow label={t('patients.email', 'Email')} field="email">
                                <input
                                  className="inline-field"
                                  type="email"
                                  value={localPatient.email ?? ''}
                                  onChange={e => handlePatientFieldChange('email', e.target.value)}
                                  onBlur={() => handlePatientFieldBlur('email')}
                                />
                              </InlineRow>
                              <InlineRow label={t('patients.phone', 'Téléphone')} field="phone">
                                <input
                                  className="inline-field"
                                  type="tel"
                                  value={localPatient.phone ?? ''}
                                  onChange={e => handlePatientFieldChange('phone', e.target.value)}
                                  onBlur={() => handlePatientFieldBlur('phone')}
                                />
                              </InlineRow>
                              <InlineRow label={t('patients.dateOfBirth', 'Date de naissance')} field="date_of_birth">
                                <input
                                  className="inline-field"
                                  type="date"
                                  value={localPatient.date_of_birth ?? ''}
                                  onChange={e => handlePatientFieldChange('date_of_birth', e.target.value)}
                                  onBlur={() => handlePatientFieldBlur('date_of_birth')}
                                />
                              </InlineRow>
                              <InlineRow label={t('patients.gender', 'Genre')} field="gender">
                                <select
                                  className="inline-field inline-field-select"
                                  value={localPatient.gender ?? ''}
                                  onChange={e => { handlePatientFieldChange('gender', e.target.value); savePatientField('gender', e.target.value); }}
                                >
                                  <option value="">{t('patients.selectGender', '—')}</option>
                                  <option value="Male">{t('patients.male', 'Homme')}</option>
                                  <option value="Female">{t('patients.female', 'Femme')}</option>
                                  <option value="Other">{t('patients.other', 'Autre')}</option>
                                  <option value="Prefer not to say">{t('patients.preferNotToSay', 'Non renseigné')}</option>
                                </select>
                              </InlineRow>
                            </Col>
                            <Col xs={12} md={6}>
                              <InlineRow label={t('patients.address', 'Adresse')} field="address">
                                <textarea
                                  className="inline-field inline-field-textarea"
                                  rows={2}
                                  value={localPatient.address ?? ''}
                                  onChange={e => handlePatientFieldChange('address', e.target.value)}
                                  onBlur={() => handlePatientFieldBlur('address')}
                                />
                              </InlineRow>
                              <InlineRow label={t('patients.medicalNotes', 'Notes médicales')} field="medical_notes">
                                <textarea
                                  className="inline-field inline-field-textarea"
                                  rows={2}
                                  value={localPatient.medical_notes ?? ''}
                                  onChange={e => handlePatientFieldChange('medical_notes', e.target.value)}
                                  onBlur={() => handlePatientFieldBlur('medical_notes')}
                                />
                              </InlineRow>
                              <InlineRow label={t('patients.allergies', 'Allergies')} field="allergies">
                                <textarea
                                  className="inline-field inline-field-textarea"
                                  rows={2}
                                  value={localPatient.allergies ?? ''}
                                  onChange={e => handlePatientFieldChange('allergies', e.target.value)}
                                  onBlur={() => handlePatientFieldBlur('allergies')}
                                />
                              </InlineRow>
                              <InlineRow label={t('patients.dietaryPreferences', 'Préférences alimentaires')} field="dietary_preferences">
                                <textarea
                                  className="inline-field inline-field-textarea"
                                  rows={2}
                                  value={localPatient.dietary_preferences ?? ''}
                                  onChange={e => handlePatientFieldChange('dietary_preferences', e.target.value)}
                                  onBlur={() => handlePatientFieldBlur('dietary_preferences')}
                                />
                              </InlineRow>
                            </Col>
                          </Row>
                          <hr />
                          <Row>
                            <Col xs={12} md={6} className="mb-2 d-flex align-items-center gap-2">
                              <small className="text-muted fw-semibold">{t('patients.status', 'Statut')} :</small>
                              <Form.Check
                                type="switch"
                                id="inline-is_active"
                                checked={!!localPatient.is_active}
                                onChange={() => handleToggleChange('is_active')}
                                label={localPatient.is_active ? t('patients.active', 'Actif') : t('patients.inactive', 'Inactif')}
                              />
                              {fieldSaving.is_active && <Spinner animation="border" size="sm" style={{ width: '12px', height: '12px' }} />}
                              {fieldSaved.is_active && <span className="inline-saved-indicator">✓</span>}
                            </Col>
                            <Col xs={12} md={6} className="mb-2 d-flex align-items-center gap-2">
                              <small className="text-muted fw-semibold">{t('patients.acceptsEmails', 'Rappels email')} :</small>
                              <Form.Check
                                type="switch"
                                id="inline-reminders"
                                checked={!!localPatient.appointment_reminders_enabled}
                                onChange={() => handleToggleChange('appointment_reminders_enabled')}
                                label={localPatient.appointment_reminders_enabled ? t('common.yes', 'Oui') : t('common.no', 'Non')}
                              />
                              {fieldSaving.appointment_reminders_enabled && <Spinner animation="border" size="sm" style={{ width: '12px', height: '12px' }} />}
                              {fieldSaved.appointment_reminders_enabled && <span className="inline-saved-indicator">✓</span>}
                            </Col>
                          </Row>
                        </>
                      ) : (
                        // Read-only for non-editors
                        <Row>
                          <Col xs={12} md={6}>
                            <Row className="mb-2"><Col sm={5}><strong>{t('patients.firstName', 'Prénom')}:</strong></Col><Col sm={7}>{patient.first_name}</Col></Row>
                            <Row className="mb-2"><Col sm={5}><strong>{t('patients.lastName', 'Nom')}:</strong></Col><Col sm={7}>{patient.last_name}</Col></Row>
                            <Row className="mb-2"><Col sm={5}><strong>{t('patients.email', 'Email')}:</strong></Col><Col sm={7}>{patient.email || '-'}</Col></Row>
                            <Row className="mb-2"><Col sm={5}><strong>{t('patients.phone', 'Téléphone')}:</strong></Col><Col sm={7}>{patient.phone || '-'}</Col></Row>
                          </Col>
                          <Col xs={12} md={6}>
                            <Row className="mb-2"><Col sm={5}><strong>{t('patients.status', 'Statut')}:</strong></Col><Col sm={7}><Badge bg={patient.is_active ? 'success' : 'secondary'}>{patient.is_active ? t('patients.active') : t('patients.inactive')}</Badge></Col></Row>
                            <Row className="mb-2"><Col sm={5}><strong>{t('patients.acceptsEmails', 'Rappels email')}:</strong></Col><Col sm={7}><Badge bg={patient.appointment_reminders_enabled ? 'success' : 'warning'}>{patient.appointment_reminders_enabled ? t('common.yes') : t('common.no')}</Badge></Col></Row>
                          </Col>
                        </Row>
                      );
                    })()}
                    <hr />
                    <Row>
                      <Col xs={12} className="mt-2">
                        <strong>{t('patients.linkedDietitians', 'Diététiciens liés')}:</strong>{' '}
                        {patient.linked_dietitians && patient.linked_dietitians.length > 0 ? (
                          <div className="d-flex flex-wrap gap-2 mt-1 align-items-center">
                            {patient.linked_dietitians.map(d => (
                              <Badge key={d.id} bg="info" className="d-flex align-items-center gap-1 py-1 px-2">
                                {d.first_name} {d.last_name}
                                {user?.role === 'ADMIN' && (
                                  <span
                                    role="button"
                                    className="ms-1 opacity-75"
                                    style={{ cursor: 'pointer', fontSize: '0.85em' }}
                                    onClick={() => handleRemoveDietitian(d.id)}
                                    title={t('common.remove', 'Remove')}
                                  >
                                    &times;
                                  </span>
                                )}
                              </Badge>
                            ))}
                            {user?.role === 'ADMIN' && (
                              <div className="d-flex gap-1 align-items-center">
                                <Form.Select
                                  size="sm"
                                  value={selectedNewDietitianId}
                                  onChange={(e) => setSelectedNewDietitianId(e.target.value)}
                                  style={{ width: '180px' }}
                                  disabled={addingDietitian}
                                >
                                  <option value="">{t('patients.addDietitian', '+ Add...')}</option>
                                  {allDietitians
                                    .filter(d => !patient.linked_dietitians.some(ld => ld.id === d.id))
                                    .map(d => (
                                      <option key={d.id} value={d.id}>
                                        {d.first_name} {d.last_name}
                                      </option>
                                    ))
                                  }
                                </Form.Select>
                                {selectedNewDietitianId && (
                                  <Button
                                    size="sm"
                                    variant="outline-primary"
                                    onClick={handleAddDietitian}
                                    disabled={addingDietitian}
                                  >
                                    {addingDietitian ? <Spinner animation="border" size="sm" /> : '+'}
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">{t('patients.noDietitianLinked', 'No dietitian linked')}</span>
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* Goals Summary */}
                <Card className="mb-3 border-0 shadow-sm" style={{ borderLeft: '4px solid #52b788' }}>
                  <Card.Header className="bg-white border-0 pb-0 pt-3 px-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="mb-0" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                        🎯 {t('goals.tabTitle', 'Objectifs')}
                      </h6>
                      <Button
                        size="sm"
                        variant="link"
                        className="p-0 text-decoration-none"
                        style={{ color: '#2d6a4f', fontSize: '0.8rem' }}
                        onClick={() => setActiveTab('goals')}
                      >
                        {t('common.view', 'Voir')} →
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body className="pt-2 px-3 pb-3">
                    {!goalsSummary ? (
                      <p className="text-muted mb-0 small">{t('common.loading', 'Chargement...')}</p>
                    ) : goalsSummary.active.length === 0 && goalsSummary.completed === 0 ? (
                      <p className="text-muted mb-0 small">{t('goals.noGoals', 'Aucun objectif défini pour ce patient.')}</p>
                    ) : (
                      <>
                        {/* Stats row */}
                        <div className="d-flex gap-3 mb-3 flex-wrap">
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2d6a4f', lineHeight: 1 }}>
                              {goalsSummary.active.length}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#74c69d' }}>{t('goals.statusActive', 'En cours')}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1b4332', lineHeight: 1 }}>
                              {goalsSummary.completed}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#74c69d' }}>{t('goals.statusCompleted', 'Atteints')}</div>
                          </div>
                          {goalsSummary.totalPoints > 0 && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#b7791f', lineHeight: 1 }}>
                                {goalsSummary.totalPoints}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#d4a017' }}>{t('goals.achievementPoints', 'pts')}</div>
                            </div>
                          )}
                        </div>

                        {/* Active goals list (up to 3) */}
                        {goalsSummary.active.slice(0, 3).map(goal => {
                          const pct = goal.progress_pct;
                          const color = pct >= 100 ? '#1b4332' : pct >= 75 ? '#2d6a4f' : pct >= 50 ? '#52b788' : '#74c69d';
                          return (
                            <div key={goal.id} className="mb-2">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1b2d1f' }} className="text-truncate me-2">
                                  {goal.title}
                                </span>
                                {pct !== null && (
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color, flexShrink: 0 }}>
                                    {pct}%
                                  </span>
                                )}
                              </div>
                              {pct !== null && (
                                <div style={{ height: '4px', borderRadius: '10px', background: '#e9f5ee', overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '10px' }} />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Badges */}
                        {goalsSummary.achievements.length > 0 && (
                          <div className="d-flex gap-1 flex-wrap mt-2">
                            {goalsSummary.achievements.slice(0, 5).map(a => (
                              <span key={a.id} title={a.title} style={{ fontSize: '1.1rem', cursor: 'default' }}>
                                {a.badge_icon || '🏅'}
                              </span>
                            ))}
                            {goalsSummary.achievements.length > 5 && (
                              <span style={{ fontSize: '0.75rem', color: '#adb5bd', alignSelf: 'center' }}>
                                +{goalsSummary.achievements.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </Card.Body>
                </Card>

                {/* Custom Fields marked as "show_in_basic_info" — inline editable */}
                {customFieldCategories
                  .filter(category => category.fields.some(field => field.show_in_basic_info))
                  .map((category) => {
                    const basicInfoFields = category.fields.filter(field => field.show_in_basic_info);
                    if (basicInfoFields.length === 0) return null;

                    return (
                      <Card key={category.id} className="mb-3">
                        <Card.Header
                          style={{
                            backgroundColor: category.color || '#3498db',
                            color: '#fff',
                            borderLeft: `4px solid ${category.color || '#3498db'}`
                          }}
                        >
                          <h6 className="mb-0">
                            <span
                              style={{
                                display: 'inline-block',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#fff',
                                borderRadius: '50%',
                                marginRight: '8px',
                                opacity: 0.8
                              }}
                            />
                            {category.name}
                          </h6>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            {basicInfoFields.map((field) => (
                              <Col xs={12} md={6} key={field.definition_id} className={(field.field_type === 'separator' || field.field_type === 'blank') ? 'mb-3' : 'mb-2'}>
                                <div className="d-flex align-items-start gap-1">
                                  <div style={{ flex: 1 }}>
                                    <CustomFieldInput
                                      fieldDefinition={field}
                                      value={fieldValues[field.definition_id]}
                                      onChange={(_defId, val) => {
                                        handleFieldChange(field.definition_id, val);
                                        handleCustomFieldAutoSave(field.definition_id, val);
                                      }}
                                      error={fieldErrors[field.definition_id]}
                                    />
                                  </div>
                                  {fieldSaved[`cf_${field.definition_id}`] && (
                                    <span className="inline-saved-indicator mt-1">✓</span>
                                  )}
                                </div>
                              </Col>
                            ))}
                          </Row>
                        </Card.Body>
                      </Card>
                    );
                  })}
              </Tab>

              {/* Notes de visite Tab */}
              <Tab eventKey="consultation-notes" title={`📝 ${t('consultationNotes.tab', 'Notes de visite')} ${consultationNotes.length > 0 ? `(${consultationNotes.length})` : ''}`}>
                <Card className="border-0">
                  <Card.Body className="p-3">
                    {notesLoading ? (
                      <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
                    ) : consultationNotes.length === 0 ? (
                      <div className="text-center py-5" style={{ background: '#f8fdf9', borderRadius: '14px', border: '1px dashed #b7e4c7' }}>
                        <div style={{ fontSize: '2.5rem', opacity: 0.4, marginBottom: '12px' }}>📝</div>
                        <p className="text-muted mb-0">{t('consultationNotes.noNotes', 'Aucune note de consultation pour ce patient.')}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {consultationNotes.map(note => {
                          const isCompleted = note.status === 'completed';
                          return (
                            <div
                              key={note.id}
                              onClick={() => navigate(`/consultation-notes/${note.id}`)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '12px 16px',
                                background: '#fff',
                                border: `1px solid ${isCompleted ? '#b7e4c7' : '#fde8a0'}`,
                                borderLeft: `4px solid ${isCompleted ? '#2d6a4f' : '#f6c90e'}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'box-shadow 0.15s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)'}
                              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                            >
                              <span style={{ fontSize: '1.3rem' }}>{isCompleted ? '✅' : '📋'}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1b2d1f', fontFamily: "'Space Grotesk', sans-serif" }}>
                                  {note.template?.name || t('consultationNotes.untitled', 'Note de consultation')}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '2px' }}>
                                  {note.visit?.visit_date
                                    ? `${t('visits.visitDate', 'Consultation')} · ${new Date(note.visit.visit_date).toLocaleDateString('fr-FR')}`
                                    : new Date(note.created_at).toLocaleDateString('fr-FR')}
                                  {note.dietitian && ` · ${note.dietitian.first_name} ${note.dietitian.last_name}`}
                                </div>
                              </div>
                              <Badge
                                bg="none"
                                style={{
                                  background: isCompleted ? '#d8f3dc' : '#fff8e1',
                                  color: isCompleted ? '#2d6a4f' : '#b5830a',
                                  border: `1px solid ${isCompleted ? '#b7e4c7' : '#fde8a0'}`,
                                  fontSize: '0.72rem',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  flexShrink: 0
                                }}
                              >
                                {isCompleted
                                  ? t('consultationNotes.statusCompleted', 'Terminée')
                                  : t('consultationNotes.statusDraft', 'Brouillon')}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Tab>

              {/* Goals Tab */}
              <Tab eventKey="goals" title={`🎯 ${t('goals.tabTitle', 'Objectifs')}`}>
                <Card>
                  <Card.Body className="p-4">
                    <PatientGoalsTab patientId={id} />
                  </Card.Body>
                </Card>
              </Tab>

              {/* Measures Tab */}
              <Tab eventKey="measures" title={`📊 ${t('patients.measures', 'Measures')}`}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">{t('patients.measuresTab', 'Patient Measures')}</h5>
                    <p className="text-muted mb-0 small">
                      {t('patients.measuresDescription', 'View and track patient health measures over time')}
                    </p>
                  </Card.Header>
                  <Card.Body>
                    <MeasureHistory patientId={id} />
                  </Card.Body>
                </Card>
              </Tab>

              {/* Éolienne / Radar tabs */}
              {customFieldCategories.filter(c => (c.display_layout?.type || 'columns') === 'radar').map((category) => {
                const displayLayout = category.display_layout || { type: 'columns', columns: 2 };
                const columnWidth = getColumnWidth(displayLayout.columns || 2);
                const entityTypes = category.entity_types || ['patient'];
                const isVisitOnly = entityTypes.includes('visit') && !entityTypes.includes('patient');
                const showHistory = isVisitOnly && category.show_history_at_patient_level;
                return (
                  <Tab
                    key={category.id}
                    eventKey={`category-${category.id}`}
                    title={
                      <span>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: category.color || '#3498db', borderRadius: '50%', marginRight: '8px', verticalAlign: 'middle', border: '2px solid rgba(255,255,255,0.5)' }} />
                        {category.name}
                      </span>
                    }
                  >
                    <div className="mb-3" style={{ borderLeft: `4px solid ${category.color || '#3498db'}`, paddingLeft: '15px' }}>
                      {category.description && (
                        <Alert variant="info" style={{ borderLeft: `4px solid ${category.color || '#3498db'}`, backgroundColor: `${category.color || '#3498db'}10` }}>
                          {category.description}
                        </Alert>
                      )}
                      {showHistory ? (
                        <VisitFieldHistoryPanel patientId={id} categoryId={category.id} categoryColor={category.color} />
                      ) : category.fields.length === 0 ? (
                        <Alert variant="warning">Aucun champ défini pour cette catégorie</Alert>
                      ) : displayLayout.type === 'radar' ? (
                        <CustomFieldRadarChart category={category} fieldValues={fieldValues} options={displayLayout.options || {}} />
                      ) : (
                        <Row>
                          {category.fields.map(field => (
                            <Col key={field.definition_id} xs={12} md={columnWidth} className={(field.field_type === 'separator' || field.field_type === 'blank') ? 'mb-3' : ''}>
                              <CustomFieldDisplay fieldDefinition={field} value={fieldValues[field.definition_id]} searchQuery={searchQuery} highlightText={highlightText} />
                            </Col>
                          ))}
                        </Row>
                      )}
                    </div>
                  </Tab>
                );
              })}

              {/* 4. Documents Tab */}
              <Tab eventKey="documents" title={`📄 Documents (${documents.length})`}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">{t('documents.patientDocuments', 'Patient Documents')}</h5>
                  <div className="d-flex gap-2">
                    {availableGuides.length > 0 && (
                      <Dropdown>
                        <Dropdown.Toggle
                          variant="outline-success"
                          size="sm"
                          disabled={sharingGuide}
                        >
                          {sharingGuide ? (
                            <Spinner animation="border" size="sm" className="me-1" />
                          ) : (
                            <i className="fas fa-book-medical me-1"></i>
                          )}
                          {t('documents.guides.shareGuide', 'Partager un guide')}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Header>{t('documents.guides.selectGuide', 'Choisir un guide')}</Dropdown.Header>
                          {availableGuides.map(guide => {
                            const tags = typeof guide.tags === 'string' ? JSON.parse(guide.tags || '[]') : (guide.tags || []);
                            const slug = Array.isArray(tags) ? tags.find(t => t !== 'consultation-guide') : '';
                            return (
                              <Dropdown.Item
                                key={guide.id}
                                onClick={() => handleShareGuide(guide.id)}
                              >
                                {guide.file_name?.replace('.pdf', '').replace('Guide : ', '') || slug}
                              </Dropdown.Item>
                            );
                          })}
                        </Dropdown.Menu>
                      </Dropdown>
                    )}
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => navigate(`/documents/upload?resourceType=patient&resourceId=${id}`)}
                    >
                      <i className="fas fa-upload me-1"></i>
                      {t('documents.upload', 'Upload Document')}
                    </Button>
                  </div>
                </div>
                <DocumentListComponent
                  documents={documents}
                  onDocumentDeleted={fetchPatientDocuments}
                  showResourceColumn={false}
                />
              </Tab>

              {/* 5. Visits Tab */}
              <Tab eventKey="visits" title={`${t('patients.visitsTab', 'Visits')} (${visits?.length || 0})`}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">{t('visits.visitHistory', 'Visit History')}</h5>
                  </Card.Header>
                  <Card.Body>
                    {(!visits || visits.length === 0) ? (
                      <p className="text-muted">{t('visits.noVisits', 'No visits recorded yet.')}</p>
                    ) : (
                      <>
                        {/* Desktop Table View */}
                        <div className="visits-table-desktop table-responsive">
                          <table className="table table-striped">
                            <thead>
                              <tr>
                                <th>{t('visits.date', 'Date')}</th>
                                <th>{t('visits.type', 'Type')}</th>
                                <th>{t('visits.notes', 'Notes')}</th>
                                <th>{t('visits.status', 'Status')}</th>
                                <th>{t('common.actions', 'Actions')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visits.map(visit => (
                                <tr
                                  key={visit.id}
                                  onClick={() => handleViewVisit(visit.id)}
                                  style={{ cursor: 'pointer' }}
                                  className="visit-row"
                                >
                                  <td>{formatDateTime(visit.visit_date)}</td>
                                  <td>{visit.visit_type || t('visits.generalVisit', 'General')}</td>
                                  <td>{visit.notes || '-'}</td>
                                  <td>
                                    <Badge bg={visit.status === 'completed' ? 'success' : 'warning'}>
                                      {getStatusText(visit.status) || t('visits.scheduled')}
                                    </Badge>
                                  </td>
                                  <td onClick={(e) => e.stopPropagation()}>
                                    <div className="action-buttons">
                                      {canEditVisits && (
                                        <ActionButton
                                          action="edit"
                                          onClick={() => handleEditVisit(visit.id)}
                                          title={t('visits.editVisit', 'Edit Visit')}
                                        />
                                      )}
                                      {canDeleteVisits && (
                                        <ActionButton
                                          action="delete"
                                          onClick={() => handleDeleteVisit(visit.id)}
                                          title={t('visits.deleteVisit', 'Delete Visit')}
                                        />
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="visits-cards-mobile">
                          {visits.map(visit => (
                            <div
                              key={visit.id}
                              className="visit-card-mobile"
                              onClick={() => handleViewVisit(visit.id)}
                            >
                              <div className="visit-card-header">
                                <div className="visit-card-date">
                                  {formatDateTime(visit.visit_date)}
                                </div>
                                <div className="visit-card-status">
                                  <Badge bg={visit.status === 'completed' ? 'success' : 'warning'}>
                                    {getStatusText(visit.status) || t('visits.scheduled')}
                                  </Badge>
                                </div>
                              </div>

                              <div className="visit-card-body">
                                <div className="visit-card-row">
                                  <div className="visit-card-label">{t('visits.type', 'Type')}:</div>
                                  <div className="visit-card-value">{visit.visit_type || t('visits.generalVisit', 'General')}</div>
                                </div>
                                {visit.notes && (
                                  <div className="visit-card-row">
                                    <div className="visit-card-label">{t('visits.notes', 'Notes')}:</div>
                                    <div className="visit-card-value">{visit.notes}</div>
                                  </div>
                                )}
                              </div>

                              <div
                                className="visit-card-actions action-buttons"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {canEditVisits && (
                                  <ActionButton
                                    action="edit"
                                    onClick={() => handleEditVisit(visit.id)}
                                    title={t('common.edit', 'Edit')}
                                  />
                                )}
                                {canDeleteVisits && (
                                  <ActionButton
                                    action="delete"
                                    onClick={() => handleDeleteVisit(visit.id)}
                                    title={t('common.delete', 'Delete')}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </Card.Body>
                </Card>
              </Tab>

              {/* 6. Invoices Tab */}
              <Tab eventKey="invoices" title={`💰 ${t('billing.invoices', 'Factures')} (${invoices.length})`}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">{t('billing.patientInvoices', 'Factures du patient')}</h5>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={handleAddPayment}
                  >
                    ➕ {t('billing.createInvoice', 'Créer une facture')}
                  </Button>
                </div>
                {invoicesLoading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">{t('common.loading')}</span>
                    </Spinner>
                    <p className="mt-2">{t('billing.loadingInvoices', 'Chargement des factures...')}</p>
                  </div>
                ) : invoices.length === 0 ? (
                  <Card className="text-center py-5">
                    <Card.Body>
                      <div className="mb-3">💰</div>
                      <h6>{t('billing.noInvoices', 'Aucune facture')}</h6>
                      <p className="text-muted">
                        {t('billing.noInvoicesForPatient', 'Aucune facture trouvée pour ce patient')}
                      </p>
                      <Button variant="outline-primary" onClick={handleAddPayment}>
                        ➕ {t('billing.createFirstInvoice', 'Créer la première facture')}
                      </Button>
                    </Card.Body>
                  </Card>
                ) : (
                  <InvoiceList
                    invoices={invoices}
                    loading={false}
                    filters={{}}
                    pagination={null}
                    onFilterChange={() => {}}
                    onPageChange={() => {}}
                    onView={handleViewInvoice}
                    onEdit={handleEditInvoice}
                    onRecordPayment={handleRecordPayment}
                    onDelete={handleDeleteInvoice}
                    canCreate={canEditPatient}
                    canUpdate={canEditPatient}
                    canDelete={canEditPatient}
                  />
                )}
              </Tab>

              {/* 7. Journal Tab */}
              <Tab eventKey="journal" title={`📓 ${t('journal.tab', 'Journal')}`}>
                <PatientJournalTab patientId={id} />
              </Tab>

              {/* 8. Recipes Tab */}
              <Tab eventKey="recipes" title={`🍽️ ${t('recipes.title', 'Recettes')} (${patientRecipes.length})`}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">{t('recipes.sharedWithPatient', 'Recettes partagées avec ce patient')}</h5>
                  </Card.Header>
                  <Card.Body>
                    {recipesLoading ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" role="status">
                          <span className="visually-hidden">{t('common.loading')}</span>
                        </Spinner>
                        <p className="mt-2">{t('common.loading', 'Chargement...')}</p>
                      </div>
                    ) : patientRecipes.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="mb-3" style={{ fontSize: '3rem' }}>🍽️</div>
                        <h6>{t('recipes.noSharedRecipes', 'Aucune recette partagée')}</h6>
                        <p className="text-muted">
                          {t('recipes.noSharedRecipesDescription', 'Aucune recette n\'a encore été partagée avec ce patient.')}
                        </p>
                        <Button
                          variant="outline-primary"
                          onClick={() => navigate('/recipes')}
                        >
                          {t('recipes.goToRecipes', 'Aller aux recettes')}
                        </Button>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead>
                            <tr>
                              <th>{t('recipes.recipeTitle', 'Recette')}</th>
                              <th>{t('recipes.category', 'Catégorie')}</th>
                              <th>{t('recipes.sharedAt', 'Partagée le')}</th>
                              <th>{t('recipes.sharedBy', 'Par')}</th>
                              <th>{t('recipes.notes', 'Notes')}</th>
                              <th className="text-end">{t('common.actions', 'Actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {patientRecipes.map(share => (
                              <tr
                                key={share.id}
                                style={{ cursor: 'pointer' }}
                                onClick={() => share.recipe && navigate(`/recipes/${share.recipe.id}`)}
                              >
                                <td>
                                  <strong>{share.recipe?.title || t('recipes.unknown', 'Recette inconnue')}</strong>
                                  {share.recipe?.difficulty && (
                                    <Badge bg="light" text="dark" className="ms-2">
                                      {t(`recipes.difficulty.${share.recipe.difficulty}`, share.recipe.difficulty)}
                                    </Badge>
                                  )}
                                </td>
                                <td>
                                  {share.recipe?.category && (
                                    <span>
                                      {share.recipe.category.icon} {share.recipe.category.name}
                                    </span>
                                  )}
                                </td>
                                <td>{formatDate(share.shared_at)}</td>
                                <td>
                                  {share.sharedByUser
                                    ? `${share.sharedByUser.first_name} ${share.sharedByUser.last_name}`
                                    : '-'}
                                </td>
                                <td>
                                  {share.notes ? (
                                    <span className="text-truncate d-inline-block" style={{ maxWidth: '200px' }} title={share.notes}>
                                      {share.notes}
                                    </span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td className="text-end" onClick={(e) => e.stopPropagation()}>
                                  <ActionButton
                                    action="view"
                                    onClick={() => share.recipe && navigate(`/recipes/${share.recipe.id}`)}
                                    title={t('common.view', 'Voir')}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Tab>

              {/* Meal Plans Tab */}
              {canReadMealPlans && (
                <Tab eventKey="meal-plans" title={`📅 ${t('mealPlans.title', 'Plans de repas')} (${patientMealPlans.length})`}>
                  <Card>
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">{t('mealPlans.title', 'Plans de repas')}</h5>
                      {canCreateMealPlans && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate('/meal-plans')}
                        >
                          + {t('mealPlans.new', 'Nouveau plan')}
                        </Button>
                      )}
                    </Card.Header>
                    <Card.Body>
                      {mealPlansLoading ? (
                        <div className="text-center py-5">
                          <Spinner animation="border" role="status">
                            <span className="visually-hidden">{t('common.loading')}</span>
                          </Spinner>
                        </div>
                      ) : patientMealPlans.length === 0 ? (
                        <div className="text-center py-5">
                          <div className="mb-3" style={{ fontSize: '3rem' }}>📅</div>
                          <h6>{t('mealPlans.noPlans', 'Aucun plan de repas')}</h6>
                          <p className="text-muted">{t('mealPlans.noPlansForPatient', 'Aucun plan de repas créé pour ce patient.')}</p>
                          {canCreateMealPlans && (
                            <Button variant="outline-primary" onClick={() => navigate('/meal-plans')}>
                              {t('mealPlans.createFirst', 'Créer un plan de repas')}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover mb-0">
                            <thead>
                              <tr>
                                <th>{t('common.title', 'Titre')}</th>
                                <th>{t('mealPlans.status.label', 'Statut')}</th>
                                <th>{t('mealPlans.duration', 'Durée')}</th>
                                <th>{t('mealPlans.startDate', 'Date début')}</th>
                                <th>{t('mealPlans.goals', 'Objectifs')}</th>
                                <th className="text-end">{t('common.actions', 'Actions')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {patientMealPlans.map(plan => (
                                <tr
                                  key={plan.id}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => navigate(`/meal-plans/${plan.id}`)}
                                >
                                  <td><strong>{plan.title}</strong></td>
                                  <td>
                                    <Badge bg={{ draft: 'secondary', active: 'success', completed: 'primary', archived: 'warning' }[plan.status] || 'secondary'}>
                                      {t(`mealPlans.status.${plan.status}`, plan.status)}
                                    </Badge>
                                  </td>
                                  <td>{plan.duration_weeks ? t('mealPlans.durationWeeks', '{{count}} sem.', { count: plan.duration_weeks }) : '-'}</td>
                                  <td>{plan.start_date ? new Date(plan.start_date).toLocaleDateString() : '-'}</td>
                                  <td>
                                    <div className="d-flex flex-wrap gap-1">
                                      {(plan.goals || []).slice(0, 2).map(g => (
                                        <Badge key={g} bg="success" style={{ fontSize: '0.75rem' }}>
                                          {t(`mealPlans.goalsOptions.${g}`, g)}
                                        </Badge>
                                      ))}
                                      {(plan.goals || []).length > 2 && (
                                        <Badge bg="light" text="dark" style={{ fontSize: '0.75rem' }}>
                                          +{(plan.goals || []).length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="text-end" onClick={e => e.stopPropagation()}>
                                    <ActionButton
                                      action="view"
                                      onClick={() => navigate(`/meal-plans/${plan.id}`)}
                                      title={t('common.view', 'Voir')}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Tab>
              )}

              {/* Administrative Tab */}
              {canEditPatient && (
                <Tab eventKey="admin" title={t('patients.administrativeTab', 'Administratif')}>
                  {/* Administrative Info Card */}
                  <Card className="mb-4">
                    <Card.Header>
                      <h5 className="mb-0">{t('patients.administrativeInfo', 'Informations administratives')}</h5>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col xs={12} md={6}>
                          <Row>
                            <Col sm={5}><strong>{t('patients.assignedDietitian', 'Diététicien assigné')}:</strong></Col>
                            <Col sm={7}>
                              {patient.assigned_dietitian ? (
                                `${patient.assigned_dietitian.first_name} ${patient.assigned_dietitian.last_name}`
                              ) : t('patients.notAssigned', 'Non assigné')}
                            </Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={5}><strong>{t('patients.createdLabel', 'Créé le')}:</strong></Col>
                            <Col sm={7}>{formatDateTime(patient.created_at)}</Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={5}><strong>{t('patients.lastUpdated', 'Mis à jour le')}:</strong></Col>
                            <Col sm={7}>{formatDateTime(patient.updated_at)}</Col>
                          </Row>
                        </Col>
                        <Col xs={12} md={6} className="mt-3 mt-md-0">
                          <Row>
                            <Col sm={4}><strong>{t('patients.notes', 'Notes')}:</strong></Col>
                            <Col sm={8}>
                              {patient.notes ? (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{patient.notes}</div>
                              ) : '-'}
                            </Col>
                          </Row>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>

                  {/* Portal Status */}
                  <PortalStatusCard patientId={id} patientEmail={patient?.email} />

                  {/* Email Communication History */}
                  <EmailHistory patientId={id} />

                  {/* Sharing History (Documents & Recipes) */}
                  <SharingHistory patientId={id} />
                </Tab>
              )}

              {/* 8. Raw Measurements Tab (Development Only) */}
              {import.meta.env.DEV && (
                <Tab eventKey="raw-measurements" title={`🔧 Raw Data`}>
                  <Card>
                    <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">💾 Raw Database Dump</h5>
                      <div className="d-flex align-items-center gap-3">
                        <Form.Group className="mb-0 d-flex align-items-center gap-2">
                          <Form.Label className="mb-0 text-white">Show:</Form.Label>
                          <Form.Select
                            size="sm"
                            value={measuresDisplayLimit}
                            onChange={(e) => setMeasuresDisplayLimit(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                            style={{ width: 'auto' }}
                          >
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                            <option value="all">All</option>
                          </Form.Select>
                        </Form.Group>
                        <Badge bg="light" text="dark">{patientMeasures.length} total records</Badge>
                      </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                      {measuresLoading ? (
                        <div className="text-center py-5">
                          <Spinner animation="border" variant="primary" />
                          <div className="mt-2">Loading measures...</div>
                        </div>
                      ) : patientMeasures.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                          <h4>No data found</h4>
                          <p>No measures have been recorded for this patient yet.</p>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-striped table-bordered table-hover table-sm mb-0">
                            <thead className="table-secondary">
                              <tr>
                                <th>ID</th>
                                <th>Measure ID</th>
                                <th>Measure Name</th>
                                <th>Value</th>
                                <th>Numeric Value</th>
                                <th>Text Value</th>
                                <th>Boolean Value</th>
                                <th>Measured At</th>
                                <th>Visit ID</th>
                                <th>Recorded By</th>
                                <th>Notes</th>
                                <th>Created At</th>
                                <th>Updated At</th>
                                <th>Deleted At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(measuresDisplayLimit === 'all' ? patientMeasures : patientMeasures.slice(0, measuresDisplayLimit)).map((measure) => {
                                const getMeasureValue = (m) => {
                                  if (m.numeric_value !== null && m.numeric_value !== undefined) {
                                    return m.numeric_value;
                                  }
                                  if (m.text_value !== null && m.text_value !== undefined) {
                                    return m.text_value;
                                  }
                                  if (m.boolean_value !== null && m.boolean_value !== undefined) {
                                    return m.boolean_value ? 'Yes' : 'No';
                                  }
                                  return '—';
                                };

                                return (
                                  <tr key={measure.id}>
                                    <td><code style={{ fontSize: '0.8rem' }}>{measure.id}</code></td>
                                    <td><code style={{ fontSize: '0.8rem' }}>{measure.measure_definition_id}</code></td>
                                    <td>
                                      {measure.MeasureDefinition ? (
                                        <a href={`/settings/measures/${measure.measure_definition_id}/view`}>
                                          {measure.MeasureDefinition.display_name || measure.MeasureDefinition.internal_name}
                                        </a>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                    <td><strong>{getMeasureValue(measure)}</strong></td>
                                    <td>{measure.numeric_value !== null ? measure.numeric_value : '—'}</td>
                                    <td>{measure.text_value || '—'}</td>
                                    <td>{measure.boolean_value !== null ? (measure.boolean_value ? '✅' : '❌') : '—'}</td>
                                    <td>{formatDateTime(measure.measured_at)}</td>
                                    <td>
                                      {measure.visit_id ? (
                                        <a href={`/visits/${measure.visit_id}`}>
                                          <code style={{ fontSize: '0.8rem' }}>{measure.visit_id}</code>
                                        </a>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                    <td>{measure.RecordedBy?.username || '—'}</td>
                                    <td style={{ maxWidth: '200px', fontSize: '0.85rem' }}>
                                      {measure.notes || '—'}
                                    </td>
                                    <td>{formatDateTime(measure.created_at)}</td>
                                    <td>{formatDateTime(measure.updated_at)}</td>
                                    <td>{measure.deleted_at ? formatDateTime(measure.deleted_at) : '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Tab>
              )}

{/* Compare Measures Tab - Temporarily disabled, to be improved later
              <Tab eventKey="compare-measures" title="📈 Compare Measures">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">{t('patients.compareMeasuresTab', 'Compare Multiple Measures')}</h5>
                    <p className="text-muted mb-0 small">
                      {t('patients.compareMeasuresDescription', 'Compare and analyze multiple health measures simultaneously')}
                    </p>
                  </Card.Header>
                  <Card.Body>
                    <MeasureComparison patientId={id} />
                  </Card.Body>
                </Card>
              </Tab>
              */}
            </ResponsiveTabs>
          </Card.Body>
        </Card>


        {/* Delete Permanently Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered scrollable>
          <Modal.Header closeButton className="bg-danger text-white">
            <Modal.Title>⚠️ {t('gdpr.confirmDeleteTitle', 'Confirm Permanent Deletion')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="danger">
              <Alert.Heading>{t('gdpr.warningTitle', 'WARNING: This action cannot be undone!')}</Alert.Heading>
              <p>{t('gdpr.deleteWarning', 'Permanently deleting this patient will remove all associated data including:')}</p>
              <ul>
                <li>{t('gdpr.deleteItem1', 'Personal information')}</li>
                <li>{t('gdpr.deleteItem2', 'Visit history and measurements')}</li>
                <li>{t('gdpr.deleteItem3', 'Billing records and invoices')}</li>
                <li>{t('gdpr.deleteItem4', 'Uploaded documents')}</li>
                <li>{t('gdpr.deleteItem5', 'Audit logs (except deletion log)')}</li>
              </ul>
              <p className="mb-0">
                <strong>{t('gdpr.deleteConfirmMessage', 'This action is required only for RGPD "Right to be Forgotten" requests.')}</strong>
              </p>
            </Alert>
            <p>
              {t('gdpr.patientToDelete', 'Patient to delete')}:{' '}
              <strong>{patient?.first_name} {patient?.last_name}</strong>
              {patient?.email && ` (${patient.email})`}
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeletePermanently}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('gdpr.deleting', 'Deleting...')}
                </>
              ) : (
                <>
                  🗑️ {t('gdpr.confirmDelete', 'Yes, Delete Permanently')}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Delete Visit Confirm Modal */}
        <ConfirmModal
          show={showDeleteVisitConfirm}
          onHide={() => {
            setShowDeleteVisitConfirm(false);
            setVisitToDelete(null);
          }}
          onConfirm={confirmDeleteVisit}
          title={t('common.confirmation', 'Confirmation')}
          message={t('visits.confirmDelete')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />

        {/* Delete Invoice Confirm Modal */}
        <ConfirmModal
          show={showDeleteInvoiceConfirm}
          onHide={() => {
            setShowDeleteInvoiceConfirm(false);
            setInvoiceToDelete(null);
          }}
          onConfirm={confirmDeleteInvoice}
          title={t('common.confirmation', 'Confirmation')}
          message={t('billing.confirmDeleteInvoice')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />

        <CreateVisitModal
          show={showCreateVisitModal}
          onHide={closeCreateVisitModal}
          onSuccess={() => {
            closeCreateVisitModal();
            fetchPatientDetails();
          }}
          selectedPatient={patient}
        />


      </Container>
    </Layout>
  );
};

export default PatientDetailPage;