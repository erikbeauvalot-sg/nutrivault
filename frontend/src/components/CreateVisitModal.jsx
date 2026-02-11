/**
 * CreateVisitModal Component
 * Slide panel for creating new visits with organized sections.
 * Uses SlidePanel + FormSection for harmonized UX.
 */

import { useState, useEffect } from 'react';
import { Form, Alert, Spinner, Row, Col, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import visitService from '../services/visitService';
import visitCustomFieldService from '../services/visitCustomFieldService';
import visitTypeService from '../services/visitTypeService';
import { getPatients } from '../services/patientService';
import { getCategories, getPatientCustomFields } from '../services/customFieldService';
import { getTimezone } from '../utils/dateUtils';
import userService from '../services/userService';
import CustomFieldInput from './CustomFieldInput';
import SlidePanel from './ui/SlidePanel';
import FormSection from './ui/FormSection';
import SearchableSelect from './ui/SearchableSelect';
import useFormPersist from '../hooks/useFormPersist';

/**
 * Convert a local datetime string (YYYY-MM-DDTHH:mm) to ISO UTC string
 * The input is interpreted as being in the configured timezone
 */
const localDateTimeToUTC = (localDateTimeStr) => {
  if (!localDateTimeStr) return null;

  const [datePart, timePart] = localDateTimeStr.split('T');
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  const timezone = getTimezone();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const tzParts = formatter.formatToParts(utcDate);
  const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0');
  const tzMinute = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0');

  const utcMinutes = hours * 60 + minutes;
  const tzMinutes = tzHour * 60 + tzMinute;
  let offsetMinutes = tzMinutes - utcMinutes;

  if (offsetMinutes > 720) offsetMinutes -= 1440;
  if (offsetMinutes < -720) offsetMinutes += 1440;

  const finalUtcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  finalUtcDate.setUTCMinutes(finalUtcDate.getUTCMinutes() - offsetMinutes);

  return finalUtcDate.toISOString();
};

const CreateVisitModal = ({ show, onHide, onSuccess, selectedPatient, prefilledDate }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [dietitians, setDietitians] = useState([]);
  const [visitTypes, setVisitTypes] = useState([]);

  // Custom fields state
  const [customFieldCategories, setCustomFieldCategories] = useState([]);
  const [fieldValues, setFieldValues] = useState({});

  const defaultFormData = {
    patient_id: '',
    dietitian_id: '',
    visit_date: '',
    visit_type_id: '',
    visit_type: '',
    duration_minutes: '',
    status: 'SCHEDULED'
  };
  const [formData, setFormData, clearFormStorage] = useFormPersist('create-visit', defaultFormData);

  // Load data when modal opens
  useEffect(() => {
    if (show) {
      fetchPatients();
      fetchDietitians();
      fetchVisitTypes();
      fetchVisitCustomFieldCategories();
      // Only apply defaults if form is empty (no persisted data)
      if (!formData.patient_id && !formData.visit_date) {
        applyDefaults();
      }
    }
  }, [show]);

  // Re-fetch custom fields when language changes
  useEffect(() => {
    if (show) {
      fetchVisitCustomFieldCategories();
    }
  }, [i18n.resolvedLanguage]);

  const applyDefaults = () => {
    const defaultDietitianId = user?.role === 'DIETITIAN'
      ? user.id
      : (selectedPatient?.assigned_dietitian?.id || user?.id || '');

    const defaults = {
      patient_id: selectedPatient?.id || '',
      dietitian_id: defaultDietitianId,
      visit_date: '',
      visit_type_id: '',
      visit_type: '',
      duration_minutes: '',
      status: 'SCHEDULED'
    };

    if (prefilledDate) {
      const d = new Date(prefilledDate);
      const timezone = getTimezone();
      const localTime = new Date(d.toLocaleString('en-US', { timeZone: timezone }));
      const year = localTime.getFullYear();
      const month = String(localTime.getMonth() + 1).padStart(2, '0');
      const day = String(localTime.getDate()).padStart(2, '0');
      const hour = String(localTime.getHours()).padStart(2, '0');
      const min = String(Math.round(localTime.getMinutes() / 15) * 15 % 60).padStart(2, '0');
      defaults.visit_date = `${year}-${month}-${day}T${hour}:${min}`;
    }

    setFormData(defaults);
    setFieldValues({});
    setError(null);
  };

  // Set default duration when visit type changes
  useEffect(() => {
    if (formData.visit_type_id && visitTypes.length > 0) {
      const selectedType = visitTypes.find(vt => vt.id === formData.visit_type_id);
      if (selectedType?.duration_minutes && !formData.duration_minutes) {
        setFormData(prev => ({ ...prev, duration_minutes: selectedType.duration_minutes }));
      }
    }
  }, [formData.visit_type_id, visitTypes]);

  const fetchPatients = async () => {
    try {
      const { data } = await getPatients({ limit: 1000 });
      setPatients(Array.isArray(data) ? data : []);
    } catch {
      setPatients([]);
    }
  };

  const fetchDietitians = async () => {
    try {
      const data = await userService.getDietitians();
      setDietitians(Array.isArray(data) ? data : []);
    } catch {
      setDietitians([]);
    }
  };

  const fetchVisitTypes = async () => {
    try {
      const response = await visitTypeService.getAllVisitTypes({ is_active: true });
      setVisitTypes(response?.data || []);
    } catch {
      setVisitTypes([]);
    }
  };

  const fetchVisitCustomFieldCategories = async () => {
    try {
      let language = i18n.resolvedLanguage || i18n.language;
      if (!language) {
        language = localStorage.getItem('i18nextLng') || 'fr';
      }

      const categories = await getCategories({ is_active: true, language });

      const visitCategories = (categories || []).filter(category => {
        let entityTypes = category.entity_types || ['patient'];
        if (typeof entityTypes === 'string') {
          try { entityTypes = JSON.parse(entityTypes); } catch { entityTypes = ['patient']; }
        }
        return Array.isArray(entityTypes) && entityTypes.includes('visit');
      });

      const transformedCategories = visitCategories.map(category => {
        const defs = category.field_definitions || [];
        const hasVisibleOnCreation = defs.some(def => def.visible_on_creation);

        return {
        id: category.id,
        name: category.name,
        description: category.description,
        display_order: category.display_order,
        color: category.color || '#3498db',
        visit_types: category.visit_types || null,
        entity_types: category.entity_types || ['patient'],
        fields: defs
          .filter(def => {
            if (def.is_active === false) return false;
            // If any field has visible_on_creation set, use that flag
            if (hasVisibleOnCreation) return def.visible_on_creation;
            // Otherwise show all non-utility fields
            return true;
          })
          .map(def => {
          let validationRules = def.validation_rules;
          let selectOptions = def.select_options;

          if (typeof validationRules === 'string' && validationRules) {
            try { validationRules = JSON.parse(validationRules); } catch { validationRules = {}; }
          }
          if (typeof selectOptions === 'string' && selectOptions) {
            try { selectOptions = JSON.parse(selectOptions); } catch { selectOptions = []; }
          }
          if (!Array.isArray(selectOptions)) {
            selectOptions = selectOptions ? [selectOptions] : [];
          }

          return {
            definition_id: def.id,
            field_name: def.field_name,
            field_label: def.field_label,
            field_type: def.field_type,
            is_required: def.is_required,
            validation_rules: validationRules || {},
            select_options: selectOptions,
            help_text: def.help_text,
            display_order: def.display_order,
            value: null
          };
        })
      };
      });

      setCustomFieldCategories(transformedCategories);
    } catch (err) {
      console.error('Error fetching visit custom field categories:', err);
    }
  };

  // Pre-populate custom fields with patient's existing values when patient changes
  useEffect(() => {
    setFieldValues({});
    if (!formData.patient_id || customFieldCategories.length === 0) return;

    const fetchExistingValues = async () => {
      try {
        const language = i18n.resolvedLanguage || i18n.language || 'fr';
        const patientFields = await getPatientCustomFields(formData.patient_id, language);

        if (!patientFields || !Array.isArray(patientFields)) return;

        const existingValues = {};
        patientFields.forEach(category => {
          (category.fields || []).forEach(field => {
            if (field.value !== null && field.value !== undefined && field.value !== '') {
              existingValues[field.definition_id] = field.value;
            }
          });
        });

        const patientLevelFieldIds = new Set();
        customFieldCategories.forEach(cat => {
          let entityTypes = cat.entity_types || ['patient'];
          if (typeof entityTypes === 'string') {
            try { entityTypes = JSON.parse(entityTypes); } catch { entityTypes = ['patient']; }
          }
          if (Array.isArray(entityTypes) && entityTypes.includes('patient')) {
            (cat.fields || []).forEach(f => patientLevelFieldIds.add(f.definition_id));
          }
        });

        const prefilled = {};
        for (const [defId, value] of Object.entries(existingValues)) {
          if (patientLevelFieldIds.has(defId)) {
            prefilled[defId] = value;
          }
        }

        if (Object.keys(prefilled).length > 0) {
          setFieldValues(prev => ({ ...prefilled, ...prev }));
        }
      } catch (err) {
        console.error('Error fetching patient custom field values:', err);
      }
    };

    fetchExistingValues();
  }, [formData.patient_id, customFieldCategories]);

  const handleCustomFieldChange = (definitionId, value) => {
    setFieldValues(prev => ({ ...prev, [definitionId]: value }));
  };

  // Filter custom field categories based on selected visit type
  const currentVisitTypeId = formData.visit_type_id || null;
  const filteredCategories = customFieldCategories.filter(category => {
    if (!category.visit_types || category.visit_types.length === 0) return true;
    if (currentVisitTypeId) return category.visit_types.includes(currentVisitTypeId);
    return false;
  });

  const allCustomFields = filteredCategories.flatMap(cat => cat.fields || []);
  const hasCustomFields = allCustomFields.length > 0;

  const extractDateTimeParts = (dateTimeStr) => {
    if (!dateTimeStr) return { date: '', hour: '09', minute: '00' };
    const [datePart, timePart] = dateTimeStr.split('T');
    const [hour, minute] = (timePart || '09:00').split(':');
    return { date: datePart || '', hour: hour || '09', minute: minute || '00' };
  };

  const combineDateTimeParts = (date, hour, minute) => {
    if (!date) return '';
    return `${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  };

  const handleDateTimeChange = (component, value) => {
    const current = extractDateTimeParts(formData.visit_date);
    let newDateTime;
    if (component === 'date') {
      newDateTime = combineDateTimeParts(value, current.hour, current.minute);
    } else if (component === 'hour') {
      newDateTime = combineDateTimeParts(current.date, value, current.minute);
    } else if (component === 'minute') {
      newDateTime = combineDateTimeParts(current.date, current.hour, value);
    }
    setFormData(prev => ({ ...prev, visit_date: newDateTime }));
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const setToNow = () => {
    const now = new Date();
    const timezone = getTimezone();
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const year = localTime.getFullYear();
    const month = String(localTime.getMonth() + 1).padStart(2, '0');
    const day = String(localTime.getDate()).padStart(2, '0');
    const hour = String(localTime.getHours()).padStart(2, '0');
    const roundedMinutes = String(Math.round(localTime.getMinutes() / 15) * 15 % 60).padStart(2, '0');
    setFormData(prev => ({ ...prev, visit_date: `${year}-${month}-${day}T${hour}:${roundedMinutes}` }));
  };

  const validateForm = () => {
    if (!formData.patient_id) {
      setError(t('visits.requiredFieldsMissing', 'Please fill in the required fields: {{fields}}', {
        fields: t('visits.patient', 'Patient')
      }));
      return false;
    }
    if (!formData.dietitian_id) {
      setError(t('visits.requiredFieldsMissing', 'Please fill in the required fields: {{fields}}', {
        fields: t('visits.dietitian', 'Dietitian')
      }));
      return false;
    }
    if (!formData.visit_date) {
      setError(t('visits.requiredFieldsMissing', 'Please fill in the required fields: {{fields}}', {
        fields: t('visits.visitDateTime', 'Visit date/time')
      }));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line no-unused-vars
      const { visit_type_id, ...dataWithoutTypeId } = formData;
      const submitData = {
        ...dataWithoutTypeId,
        visit_date: localDateTimeToUTC(formData.visit_date),
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        status: 'SCHEDULED'
      };

      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') submitData[key] = null;
      });

      const savedVisit = await visitService.createVisit(submitData);

      if (savedVisit?.id && Object.keys(fieldValues).length > 0) {
        try {
          const fieldsToSave = Object.entries(fieldValues)
            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
            .map(([definitionId, value]) => ({
              definition_id: definitionId,
              value
            }));

          if (fieldsToSave.length > 0) {
            await visitCustomFieldService.updateVisitCustomFields(savedVisit.id, fieldsToSave);
          }
        } catch (cfError) {
          console.error('Error saving custom fields:', cfError);
        }
      }

      if (onSuccess) {
        onSuccess(savedVisit);
      }

      handleClose();
    } catch (err) {
      const errorMsg = err.response?.data?.details
        ? err.response.data.details.map(d => d.msg).join(', ')
        : err.response?.data?.error || t('errors.failedToCreateVisit');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(defaultFormData);
    clearFormStorage();
    setFieldValues({});
    setError(null);
    onHide();
  };

  // Permission check
  const canCreateVisit = user?.role === 'ADMIN' || user?.role === 'DIETITIAN' || user?.role === 'ASSISTANT';
  if (!canCreateVisit) return null;

  const canChooseDietitian = user?.role === 'ADMIN' || user?.role === 'ASSISTANT';

  const dtParts = extractDateTimeParts(formData.visit_date);

  // Progress: count filled required fields
  const filledRequired = [formData.patient_id, formData.dietitian_id, formData.visit_date].filter(Boolean).length;

  return (
    <SlidePanel
      show={show}
      onHide={handleClose}
      title={t('visits.scheduleNewVisit', 'New Appointment')}
      subtitle={t('visits.createVisitSubtitle', 'Schedule a consultation')}
      icon={
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M3 8h14" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 2v4M13 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      }
      size="md"
      onSubmit={handleSubmit}
      submitLabel={t('visits.createVisit', 'Create Appointment')}
      loading={loading}
    >
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        {/* Appointment details */}
        <FormSection
          title={t('visits.appointmentDetails', 'Appointment details')}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          description={`${filledRequired}/3 ${t('common.required', 'required')}`}
          accent="slate"
        >
          <Form.Group className="mb-3">
            <Form.Label>
              {t('visits.patient', 'Patient')} <span className="text-danger">*</span>
            </Form.Label>
            <SearchableSelect
              name="patient_id"
              options={patients.map(p => ({
                value: p.id,
                label: `${p.first_name} ${p.last_name}`,
                subtitle: p.email || p.phone || ''
              }))}
              value={formData.patient_id}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, patient_id: val }));
                setError(null);
              }}
              placeholder={t('visits.selectPatient', 'Select a patient')}
              searchPlaceholder={t('common.searchByName', 'Search by name...')}
              noResultsText={t('common.noResults', 'No results found')}
              disabled={loading || !!selectedPatient}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              {t('visits.dietitian', 'Dietitian')} <span className="text-danger">*</span>
            </Form.Label>
            {canChooseDietitian ? (
              <Form.Select
                name="dietitian_id"
                value={formData.dietitian_id}
                onChange={handleInputChange}
                disabled={loading}
                required
              >
                <option value="">{t('visits.selectDietitian', 'Select a dietitian')}</option>
                {dietitians.map(d => {
                  const displayName = d.first_name || d.last_name
                    ? `${d.first_name || ''} ${d.last_name || ''}`.trim()
                    : d.username;
                  return (
                    <option key={d.id} value={d.id}>{displayName}</option>
                  );
                })}
              </Form.Select>
            ) : (
              <Form.Control
                type="text"
                value={`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || ''}
                disabled
                readOnly
              />
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              {t('visits.visitDateTime', 'Date/Time')} <span className="text-danger">*</span>
            </Form.Label>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <Form.Control
                type="date"
                value={dtParts.date}
                onChange={(e) => handleDateTimeChange('date', e.target.value)}
                required
                disabled={loading}
                className="flex-grow-1"
                style={{ minWidth: '130px' }}
              />
              <div className="d-flex gap-1 align-items-center">
                <Form.Select
                  value={dtParts.hour}
                  onChange={(e) => handleDateTimeChange('hour', e.target.value)}
                  required
                  disabled={loading}
                  style={{ width: '72px' }}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>
                      {String(i).padStart(2, '0')}h
                    </option>
                  ))}
                </Form.Select>
                <Form.Select
                  value={dtParts.minute}
                  onChange={(e) => handleDateTimeChange('minute', e.target.value)}
                  required
                  disabled={loading}
                  style={{ width: '62px' }}
                >
                  <option value="00">00</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="45">45</option>
                </Form.Select>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={setToNow}
                  disabled={loading}
                  title={t('visits.setToNow', 'Set to current time')}
                >
                  {t('visits.now', 'Now')}
                </Button>
              </div>
            </div>
          </Form.Group>
        </FormSection>

        {/* Visit type & duration */}
        <FormSection
          title={t('visits.typeAndDuration', 'Type & Duration')}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2v12M12 2v12M2 6h12M2 10h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          }
          accent="gold"
          collapsible
          defaultOpen
        >
          <Form.Group className="mb-3">
            <Form.Label>{t('visits.visitType', 'Visit Type')}</Form.Label>
            <Form.Select
              name="visit_type_id"
              value={formData.visit_type_id}
              onChange={(e) => {
                const selectedId = e.target.value;
                const selectedType = visitTypes.find(vt => vt.id === selectedId);
                setFormData(prev => ({
                  ...prev,
                  visit_type_id: selectedId,
                  visit_type: selectedType?.name || '',
                  duration_minutes: selectedType?.duration_minutes || prev.duration_minutes
                }));
              }}
              disabled={loading}
            >
              <option value="">{t('visits.selectType', 'Select type')}</option>
              {visitTypes.map(vt => (
                <option key={vt.id} value={vt.id}>
                  {vt.name}
                  {vt.duration_minutes && ` (${vt.duration_minutes} min)`}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('visits.duration', 'Duration (min)')}</Form.Label>
            <Form.Control
              type="number"
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleInputChange}
              placeholder="60"
              min="1"
              max="480"
              disabled={loading}
            />
          </Form.Group>
        </FormSection>

        {/* Custom Fields */}
        {hasCustomFields && (
          <FormSection
            title={t('customFields.additionalInfo', 'Additional Information')}
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3h10v10H3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M6 6h4M6 8h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            }
            accent="info"
            collapsible
            defaultOpen
          >
            {filteredCategories.map(category => (
              <div key={category.id}>
                {(category.fields || []).map(field => (
                  <Form.Group key={field.definition_id} className="mb-3">
                    <CustomFieldInput
                      fieldDefinition={field}
                      value={fieldValues[field.definition_id] ?? ''}
                      onChange={handleCustomFieldChange}
                      disabled={loading}
                      patientId={formData.patient_id}
                    />
                  </Form.Group>
                ))}
              </div>
            ))}
          </FormSection>
        )}
      </Form>
    </SlidePanel>
  );
};

export default CreateVisitModal;
