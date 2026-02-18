/**
 * AI Follow-up Service
 * US-5.5.5: AI-Generated Follow-ups
 *
 * Generates personalized follow-up email content using AI
 * Supports multiple providers: Anthropic, OpenAI, Mistral
 * Uses customizable prompts from the database
 */

const aiProviderService = require('./aiProvider.service');
const aiPromptService = require('./aiPrompt.service');
const db = require('../../../models');
const { formatDate, formatDateLong } = require('../utils/timezone');
const Visit = db.Visit;
const Patient = db.Patient;
const User = db.User;
const PatientCustomFieldValue = db.PatientCustomFieldValue;
const CustomFieldDefinition = db.CustomFieldDefinition;
const CustomFieldCategory = db.CustomFieldCategory;
const VisitCustomFieldValue = db.VisitCustomFieldValue;
const PatientMeasure = db.PatientMeasure;
const MeasureDefinition = db.MeasureDefinition;
const MeasureTranslation = db.MeasureTranslation;
const VisitMeasurement = db.VisitMeasurement;

// Supported languages (FR primary, EN optional)
const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Francais', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
];

/**
 * VARIABLE TYPES FOR AI EMAIL GENERATION
 *
 * 1. AI_CONTEXT_VARIABLES: Sent to AI for content generation (anonymized, no PII)
 *    - visit_date, visit_type, visit_custom_fields, visit_measurements
 *    - patient_custom_fields, patient_measures (anonymized)
 *    - tone, language
 *
 * 2. TEMPLATE_VARIABLES: Substituted in final email by backend (can contain PII)
 *    - {{PATIENT_NAME}} - Patient's full name
 *    - {{PATIENT_FIRST_NAME}} - Patient's first name
 *    - {{DIETITIAN_NAME}} - Dietitian's full name
 *    - {{NEXT_APPOINTMENT_DATE}} - Next appointment date
 *    - {{CLINIC_NAME}} - Clinic name (from settings)
 *    - {{CLINIC_PHONE}} - Clinic phone (from settings)
 *
 * The AI is instructed to use {{PLACEHOLDER}} syntax for personal data,
 * which the backend will replace with actual values before sending.
 */
const TEMPLATE_PLACEHOLDERS = {
  PATIENT_NAME: '{{PATIENT_NAME}}',
  PATIENT_FIRST_NAME: '{{PATIENT_FIRST_NAME}}',
  DIETITIAN_NAME: '{{DIETITIAN_NAME}}',
  NEXT_APPOINTMENT_DATE: '{{NEXT_APPOINTMENT_DATE}}',
  CLINIC_NAME: '{{CLINIC_NAME}}',
  CLINIC_PHONE: '{{CLINIC_PHONE}}'
};

/**
 * Substitute template placeholders with actual values in text
 * @param {string} text - Text containing {{PLACEHOLDER}} patterns
 * @param {Object} values - Object with placeholder values
 * @returns {string} Text with substituted values
 */
function substituteTemplatePlaceholders(text, values) {
  if (!text) return '';
  if (typeof text !== 'string') text = Array.isArray(text) ? text.join('\n') : String(text);

  let result = text;
  for (const [key, placeholder] of Object.entries(TEMPLATE_PLACEHOLDERS)) {
    const value = values[key] || '';
    // Replace both {{KEY}} and the placeholder constant
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value);
  }
  return result;
}

/**
 * Fetch and format visit custom fields for AI context
 * @param {string} visitId - Visit UUID
 * @param {string} language - Language code for translations
 * @returns {Promise<string>} Formatted custom fields text
 */
async function getVisitCustomFieldsForAI(visitId, language = 'fr') {
  try {
    const customFieldValues = await VisitCustomFieldValue.findAll({
      where: { visit_id: visitId },
      include: [{
        model: CustomFieldDefinition,
        as: 'field_definition',
        where: { is_active: true },
        include: [{
          model: CustomFieldCategory,
          as: 'category',
          where: { is_active: true }
        }]
      }]
    });

    if (!customFieldValues || customFieldValues.length === 0) {
      return '';
    }

    const formattedFields = customFieldValues
      .filter(cf => cf.field_definition)
      .map(cf => {
        const def = cf.field_definition;
        const fieldLabel = def.field_label || def.field_name;

        // Get the value based on field type
        let value;
        switch (def.field_type) {
          case 'number':
            value = cf.value_number;
            break;
          case 'boolean':
            value = cf.value_boolean ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No');
            break;
          case 'select':
          case 'multiselect':
            value = cf.value_json ? (Array.isArray(cf.value_json) ? cf.value_json.join(', ') : cf.value_json) : cf.value_text;
            break;
          default:
            value = cf.value_text;
        }

        if (value === null || value === undefined || value === '') {
          return null;
        }

        return `- ${fieldLabel}: ${value}`;
      })
      .filter(Boolean);

    return formattedFields.length > 0 ? formattedFields.join('\n') : '';
  } catch (error) {
    console.error('Error fetching visit custom fields:', error);
    return '';
  }
}

/**
 * Fetch and format visit measurements for AI context
 * @param {string} visitId - Visit UUID
 * @param {string} language - Language code for translations
 * @returns {Promise<string>} Formatted measurements text
 */
async function getVisitMeasurementsForAI(visitId, language = 'fr') {
  try {
    const measurements = await VisitMeasurement.findAll({
      where: { visit_id: visitId },
      order: [['created_at', 'DESC']]
    });

    if (!measurements || measurements.length === 0) {
      return '';
    }

    const formattedMeasurements = [];

    for (const m of measurements) {
      if (m.weight_kg) {
        formattedMeasurements.push(`- ${language === 'fr' ? 'Poids' : 'Weight'}: ${m.weight_kg} kg`);
      }
      if (m.height_cm) {
        formattedMeasurements.push(`- ${language === 'fr' ? 'Taille' : 'Height'}: ${m.height_cm} cm`);
      }
      if (m.bmi) {
        formattedMeasurements.push(`- IMC/BMI: ${m.bmi}`);
      }
      if (m.blood_pressure_systolic && m.blood_pressure_diastolic) {
        formattedMeasurements.push(`- ${language === 'fr' ? 'Tension artérielle' : 'Blood Pressure'}: ${m.blood_pressure_systolic}/${m.blood_pressure_diastolic} mmHg`);
      }
      if (m.waist_circumference_cm) {
        formattedMeasurements.push(`- ${language === 'fr' ? 'Tour de taille' : 'Waist circumference'}: ${m.waist_circumference_cm} cm`);
      }
      if (m.body_fat_percentage) {
        formattedMeasurements.push(`- ${language === 'fr' ? 'Masse grasse' : 'Body fat'}: ${m.body_fat_percentage}%`);
      }
      if (m.muscle_mass_percentage) {
        formattedMeasurements.push(`- ${language === 'fr' ? 'Masse musculaire' : 'Muscle mass'}: ${m.muscle_mass_percentage}%`);
      }
      if (m.notes) {
        formattedMeasurements.push(`- ${language === 'fr' ? 'Notes de mesure' : 'Measurement notes'}: ${m.notes}`);
      }
    }

    return formattedMeasurements.length > 0 ? formattedMeasurements.join('\n') : '';
  } catch (error) {
    console.error('Error fetching visit measurements:', error);
    return '';
  }
}

/**
 * Fetch and format patient custom fields for AI context (anonymized)
 * @param {string} patientId - Patient UUID
 * @param {string} language - Language code for translations
 * @returns {Promise<string>} Formatted custom fields text
 */
async function getPatientCustomFieldsForAI(patientId, language = 'fr') {
  try {
    const customFieldValues = await PatientCustomFieldValue.findAll({
      where: { patient_id: patientId },
      include: [{
        model: CustomFieldDefinition,
        as: 'field_definition',
        attributes: ['id', 'field_name', 'field_type', 'unit', 'translations']
      }]
    });

    if (!customFieldValues || customFieldValues.length === 0) {
      return '';
    }

    const formattedFields = customFieldValues
      .filter(cf => cf.field_definition)
      .map(cf => {
        const def = cf.field_definition;
        // Get localized field name
        let fieldName = def.field_name;
        if (def.translations && def.translations[language]) {
          fieldName = def.translations[language].label || fieldName;
        }

        // Get the value based on field type
        let value;
        switch (def.field_type) {
          case 'number':
            value = cf.value_number;
            if (def.unit) value = `${value} ${def.unit}`;
            break;
          case 'boolean':
            value = cf.value_boolean ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No');
            break;
          case 'select':
          case 'multiselect':
            value = cf.value_json ? (Array.isArray(cf.value_json) ? cf.value_json.join(', ') : cf.value_json) : cf.value_text;
            break;
          default:
            value = cf.value_text;
        }

        if (value === null || value === undefined || value === '') {
          return null;
        }

        return `- ${fieldName}: ${value}`;
      })
      .filter(Boolean);

    return formattedFields.length > 0 ? formattedFields.join('\n') : '';
  } catch (error) {
    console.error('Error fetching patient custom fields:', error);
    return '';
  }
}

/**
 * Fetch and format patient measures for AI context (anonymized)
 * @param {string} patientId - Patient UUID
 * @param {string} language - Language code for translations
 * @param {number} limit - Maximum number of recent measures per type
 * @returns {Promise<string>} Formatted measures text
 */
async function getPatientMeasuresForAI(patientId, language = 'fr', limit = 5) {
  try {
    // Get recent measures grouped by measure definition
    const measures = await PatientMeasure.findAll({
      where: { patient_id: patientId },
      include: [{
        model: MeasureDefinition,
        as: 'measureDefinition',
        attributes: ['id', 'name', 'display_name', 'unit', 'measure_type'],
        include: [{
          model: MeasureTranslation,
          as: 'translations',
          where: { language_code: language },
          required: false
        }]
      }],
      order: [['measured_at', 'DESC']],
      limit: 50 // Fetch more to group by type
    });

    if (!measures || measures.length === 0) {
      return '';
    }

    // Group by measure definition and get recent values
    const measuresByType = {};
    for (const measure of measures) {
      const def = measure.measureDefinition;
      if (!def) continue;

      const defId = def.id;
      if (!measuresByType[defId]) {
        // Get localized name (prefer translation, then display_name, then name)
        let measureName = def.display_name || def.name;
        if (def.translations && def.translations.length > 0) {
          // Look for translated display_name
          const translatedName = def.translations.find(t => t.field_name === 'display_name');
          if (translatedName) {
            measureName = translatedName.translated_value || measureName;
          }
        }

        measuresByType[defId] = {
          name: measureName,
          unit: def.unit,
          type: def.measure_type,
          values: []
        };
      }

      if (measuresByType[defId].values.length < limit) {
        let value;
        switch (def.measure_type) {
          case 'numeric':
            value = measure.numeric_value;
            break;
          case 'boolean':
            value = measure.boolean_value ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No');
            break;
          default:
            value = measure.text_value || measure.numeric_value;
        }

        measuresByType[defId].values.push({
          value,
          date: formatDate(measure.measured_at, language)
        });
      }
    }

    // Format output
    const formattedMeasures = Object.values(measuresByType).map(m => {
      const unit = m.unit ? ` ${m.unit}` : '';
      if (m.values.length === 1) {
        return `- ${m.name}: ${m.values[0].value}${unit} (${m.values[0].date})`;
      }
      // Show recent evolution for measures with multiple values
      const latest = m.values[0];
      const oldest = m.values[m.values.length - 1];
      return `- ${m.name}: ${latest.value}${unit} (${latest.date}) - ${language === 'fr' ? 'évolution depuis' : 'evolution since'} ${oldest.date}: ${oldest.value}${unit} → ${latest.value}${unit}`;
    });

    return formattedMeasures.length > 0 ? formattedMeasures.join('\n') : '';
  } catch (error) {
    console.error('Error fetching patient measures:', error);
    return '';
  }
}

/**
 * Create a fallback response when AI doesn't return valid JSON
 * @param {string} rawText - Raw AI response text
 * @param {string} language - Language code
 * @returns {Object} Structured email content
 */
function createFallbackResponse(rawText, language = 'fr') {
  // Try to extract meaningful content from the raw text
  const lines = rawText.split('\n').filter(l => l.trim());

  // Simple heuristic to extract content
  const subject = language === 'fr'
    ? 'Suite à votre consultation'
    : 'Follow-up to your consultation';

  const greeting = language === 'fr'
    ? 'Bonjour,'
    : 'Hello,';

  // Use the first few paragraphs as summary
  const textParagraphs = rawText
    .replace(/\*\*/g, '') // Remove markdown bold
    .replace(/#{1,6}\s/g, '') // Remove markdown headers
    .split('\n\n')
    .filter(p => p.trim() && !p.includes('{{') && p.length > 20);

  const summary = textParagraphs.slice(0, 2).join(' ').substring(0, 500);

  return {
    subject,
    greeting,
    summary: summary || (language === 'fr'
      ? 'Suite à notre consultation, voici un récapitulatif des points abordés.'
      : 'Following our consultation, here is a summary of the points discussed.'),
    keyPoints: [],
    recommendations: language === 'fr'
      ? 'Veuillez suivre les recommandations discutées lors de notre consultation.'
      : 'Please follow the recommendations discussed during our consultation.',
    nextSteps: [],
    closing: language === 'fr'
      ? 'N\'hésitez pas à me contacter si vous avez des questions.'
      : 'Please don\'t hesitate to contact me if you have any questions.',
    signature: ''
  };
}

/**
 * Substitute variables in a template string
 * Supports {{variable}} and {{#if variable}}...{{/if}} syntax
 *
 * @param {string} template - Template string with variables
 * @param {Object} data - Variable values
 * @returns {string} - Template with substituted values
 */
function substituteVariables(template, data) {
  if (!template) return '';
  if (typeof template !== 'string') template = String(template);

  let result = template;

  // Handle conditional blocks {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (match, variable, content) => {
    return data[variable] ? content : '';
  });

  // Replace {{variable}} patterns
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value !== undefined && value !== null ? String(value) : '');
  }

  return result;
}

/**
 * Generate follow-up email content using AI
 *
 * @param {string} visitId - Visit UUID
 * @param {Object} options - Generation options
 * @param {string} options.language - Output language (fr, en)
 * @param {string} options.tone - Email tone (professional, friendly, formal)
 * @param {boolean} options.includeNextSteps - Include next steps section
 * @param {boolean} options.includeNextAppointment - Include next appointment info
 * @returns {Promise<Object>} Generated content with subject and body
 */
async function generateFollowupContent(visitId, options = {}) {
  const {
    language = 'fr',
    tone = 'professional',
    includeNextSteps = true,
    includeNextAppointment = true
  } = options;

  // Validate language
  const validLanguage = SUPPORTED_LANGUAGES.find(l => l.code === language) ? language : 'fr';

  // Fetch visit with full details
  const visit = await Visit.findByPk(visitId, {
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'email']
      },
      {
        model: User,
        as: 'dietitian',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }
    ]
  });

  if (!visit) {
    throw new Error('Visit not found');
  }

  if (!visit.patient) {
    throw new Error('Patient not found for this visit');
  }

  // Fetch visit custom fields and measurements for AI context
  const [visitCustomFieldsText, visitMeasurementsText] = await Promise.all([
    getVisitCustomFieldsForAI(visitId, validLanguage),
    getVisitMeasurementsForAI(visitId, validLanguage)
  ]);

  // No longer require content - AI will generate a basic follow-up even without data

  // Check if any AI provider is available
  if (!aiProviderService.isAnyProviderAvailable()) {
    // Return mock response for development/testing without API keys
    return generateMockFollowup(visit, { ...options, language: validLanguage });
  }

  // Build context for AI - use real name for final email, anonymized for AI
  const patientName = `${visit.patient.first_name} ${visit.patient.last_name}`;
  const anonymizedPatientName = validLanguage === 'fr' ? 'Le patient' : 'The patient';
  const dietitianName = visit.dietitian
    ? `${visit.dietitian.first_name || ''} ${visit.dietitian.last_name || ''}`.trim()
    : 'Votre diététicien(ne)';

  const visitDate = formatDateLong(visit.visit_date, validLanguage);

  const nextVisitInfo = visit.next_visit_date && includeNextAppointment
    ? formatDateLong(visit.next_visit_date, validLanguage)
    : null;

  // Fetch additional patient data for AI context (GDPR-compliant: no identity)
  const [patientCustomFieldsText, patientMeasuresText] = await Promise.all([
    getPatientCustomFieldsForAI(visit.patient.id, validLanguage),
    getPatientMeasuresForAI(visit.patient.id, validLanguage)
  ]);

  // Combine visit and patient data
  const allCustomFieldsText = [visitCustomFieldsText, patientCustomFieldsText].filter(Boolean).join('\n');
  const allMeasuresText = [visitMeasurementsText, patientMeasuresText].filter(Boolean).join('\n');

  // Try to get prompts from database first
  let systemPrompt, userPrompt;
  const dbPrompt = await aiPromptService.getActivePrompt('followup', validLanguage);

  if (dbPrompt) {
    // Use database prompts with variable substitution
    // IMPORTANT: Use anonymized name for AI prompt (GDPR compliance)
    const variables = {
      patient_name: anonymizedPatientName,  // Anonymized for AI
      dietitian_name: dietitianName,
      visit_date: visitDate,
      visit_type: visit.visit_type || 'Consultation',
      // Visit-specific data
      visit_custom_fields: visitCustomFieldsText || '',
      visit_measurements: visitMeasurementsText || '',
      // Patient-level data (separate from visit data)
      patient_custom_fields: patientCustomFieldsText || '',
      patient_measures: patientMeasuresText || '',
      // Combined data (for backwards compatibility)
      custom_fields: allCustomFieldsText,
      measures: allMeasuresText,
      // Keep these for backwards compatibility with old prompts, but they're empty now
      chief_complaint: '',
      assessment: '',
      recommendations: '',
      notes: '',
      next_visit_date: nextVisitInfo || '',
      tone: tone
    };

    systemPrompt = substituteVariables(dbPrompt.system_prompt, variables);
    userPrompt = substituteVariables(dbPrompt.user_prompt_template, variables);
  } else {
    // Fallback to hardcoded prompts
    // Language-specific instructions
    const languageInstructions = validLanguage === 'fr'
      ? 'Rédigez l\'email en français. Utilisez un français correct et professionnel.'
      : 'Write the email in English. Use proper and professional English.';

    const toneInstructions = {
      professional: validLanguage === 'fr'
        ? 'Adoptez un ton professionnel mais chaleureux, typique d\'un praticien de santé.'
        : 'Use a professional but warm tone, typical of a healthcare practitioner.',
      friendly: validLanguage === 'fr'
        ? 'Adoptez un ton amical et accessible tout en restant professionnel.'
        : 'Use a friendly and approachable tone while remaining professional.',
      formal: validLanguage === 'fr'
        ? 'Adoptez un ton formel et soutenu.'
        : 'Use a formal and elevated tone.'
    };

    // Build the prompts with placeholder instructions for GDPR compliance
    const placeholderInstructions = validLanguage === 'fr'
      ? `IMPORTANT - PROTECTION DES DONNÉES (RGPD):
Pour les données personnelles, utilisez ces placeholders EXACTEMENT comme écrits:
- {{PATIENT_NAME}} pour le nom complet du patient
- {{PATIENT_FIRST_NAME}} pour le prénom du patient
- {{DIETITIAN_NAME}} pour le nom du diététicien
- {{NEXT_APPOINTMENT_DATE}} pour la date du prochain RDV (si applicable)

Ces placeholders seront remplacés par les vraies valeurs par le système.
Exemple de greeting: "Bonjour {{PATIENT_FIRST_NAME}}," ou "Bonjour {{PATIENT_NAME}},"`
      : `IMPORTANT - DATA PROTECTION (GDPR):
For personal data, use these placeholders EXACTLY as written:
- {{PATIENT_NAME}} for the patient's full name
- {{PATIENT_FIRST_NAME}} for the patient's first name
- {{DIETITIAN_NAME}} for the dietitian's name
- {{NEXT_APPOINTMENT_DATE}} for the next appointment date (if applicable)

These placeholders will be replaced with actual values by the system.
Example greeting: "Hello {{PATIENT_FIRST_NAME}}," or "Dear {{PATIENT_NAME}},"`;

    systemPrompt = `You are an assistant helping a dietitian/nutritionist write follow-up emails to their patients.
${languageInstructions}
${toneInstructions[tone] || toneInstructions.professional}

${placeholderInstructions}

Your task is to generate a personalized follow-up email based on the visit notes provided.
The email should:
1. Be warm and encouraging
2. Summarize the key points discussed during the consultation
3. Highlight the main recommendations in a clear, actionable way
${includeNextSteps ? '4. Include a "Next Steps" section with specific actions for the patient' : ''}
${nextVisitInfo ? '5. Mention the next scheduled appointment using {{NEXT_APPOINTMENT_DATE}}' : ''}

Output format:
Return a JSON object with exactly these fields:
{
  "subject": "Email subject line",
  "greeting": "Personalized greeting using {{PATIENT_FIRST_NAME}} or {{PATIENT_NAME}}",
  "summary": "Brief summary of the consultation (2-3 sentences)",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "recommendations": "Detailed recommendations paragraph",
  "nextSteps": ["Action 1", "Action 2", "Action 3"],
  "closing": "Warm closing message",
  "signature": "{{DIETITIAN_NAME}}"
}

CRITICAL OUTPUT RULES:
- Return ONLY the raw JSON object. Start your response with { and end with }.
- Do NOT wrap in \`\`\`json code blocks. Do NOT add any text before or after the JSON.
- Do NOT write "Bonjour" or any greeting before the JSON. The greeting goes INSIDE the JSON "greeting" field.
- All string values must be valid JSON (escape newlines as \\n, escape quotes as \\").
- Use the placeholders for all personal data (names, dates).`;

    // Build user prompt with anonymized patient data (GDPR compliance)
    userPrompt = `Generate a follow-up email for this patient consultation:

CONSULTATION DATE: ${visitDate}
VISIT TYPE: ${visit.visit_type || 'Consultation'}

${visitCustomFieldsText ? `VISIT NOTES AND INFORMATION:
${visitCustomFieldsText}

` : ''}${visitMeasurementsText ? `VISIT MEASUREMENTS:
${visitMeasurementsText}

` : ''}${patientCustomFieldsText ? `PATIENT DATA (CUSTOM FIELDS):
${patientCustomFieldsText}

` : ''}${patientMeasuresText ? `PATIENT MEASURES/METRICS:
${patientMeasuresText}

` : ''}${nextVisitInfo ? `NEXT APPOINTMENT: Use {{NEXT_APPOINTMENT_DATE}} placeholder` : ''}

Please generate a personalized follow-up email based on this information.
${!visitCustomFieldsText && !visitMeasurementsText && !patientCustomFieldsText && !patientMeasuresText ? `NOTE: Limited data is available for this visit. Generate a general, warm follow-up email thanking the patient for their visit and encouraging them to follow general nutritional guidelines discussed.

` : ''}REMEMBER: Use {{PATIENT_FIRST_NAME}} or {{PATIENT_NAME}} for addressing the patient, and {{DIETITIAN_NAME}} for the signature.`;
  }

  try {
    // Get current AI configuration
    const aiConfig = await aiProviderService.getAIConfiguration();

    // Generate content using configured provider
    const responseText = await aiProviderService.generateContent(systemPrompt, userPrompt, {
      maxTokens: 2000
    });

    // Parse JSON response — robust multi-strategy extraction
    let aiContent;
    try {
      let jsonText = responseText.trim();
      console.log('[AI Followup] Raw response length:', jsonText.length, 'starts with:', jsonText.substring(0, 80));

      // Strategy 1: Strip code block wrappers
      const codeBlockMatch = jsonText.match(/```(?:json)?[\s\n]*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
      } else {
        // Strip unclosed code block markers
        jsonText = jsonText.replace(/```(?:json)?[\s\n]*/gi, '').trim();
      }

      // Strategy 2: Find outermost JSON object with string-aware balanced braces
      const startIdx = jsonText.indexOf('{');
      if (startIdx === -1) {
        throw new Error('No JSON object found in AI response');
      }

      let depth = 0;
      let inString = false;
      let escaped = false;
      let endIdx = -1;

      for (let i = startIdx; i < jsonText.length; i++) {
        const ch = jsonText[i];
        if (escaped) { escaped = false; continue; }
        if (ch === '\\' && inString) { escaped = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (!inString) {
          if (ch === '{') depth++;
          else if (ch === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
        }
      }

      if (endIdx === -1) {
        throw new Error('Could not find balanced JSON object');
      }

      let jsonCandidate = jsonText.substring(startIdx, endIdx + 1);

      // Strategy 3: Try direct parse
      try {
        aiContent = JSON.parse(jsonCandidate);
      } catch (directErr) {
        // Strategy 4: Fix common AI JSON issues and retry
        // Fix unescaped newlines/tabs inside string values
        let fixed = '';
        let inStr = false;
        let esc = false;
        for (let i = 0; i < jsonCandidate.length; i++) {
          const c = jsonCandidate[i];
          if (esc) { fixed += c; esc = false; continue; }
          if (c === '\\' && inStr) { fixed += c; esc = true; continue; }
          if (c === '"') { inStr = !inStr; fixed += c; continue; }
          if (inStr && c === '\n') { fixed += '\\n'; continue; }
          if (inStr && c === '\r') { fixed += '\\r'; continue; }
          if (inStr && c === '\t') { fixed += '\\t'; continue; }
          fixed += c;
        }
        // Remove trailing commas before ] or }
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

        try {
          aiContent = JSON.parse(fixed);
        } catch (fixedErr) {
          // Strategy 5: Regex-based field extraction as last resort
          console.log('[AI Followup] JSON parse failed after fixes, using regex extraction');
          const extractField = (name) => {
            const re = new RegExp('"' + name + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"');
            const m = jsonCandidate.match(re);
            return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';
          };
          const extractArray = (name) => {
            const re = new RegExp('"' + name + '"\\s*:\\s*\\[([^\\]]*?)\\]');
            const m = jsonCandidate.match(re);
            if (!m) return [];
            const items = [];
            const itemRe = /"((?:[^"\\]|\\.)*)"/g;
            let im;
            while ((im = itemRe.exec(m[1])) !== null) {
              items.push(im[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'));
            }
            return items;
          };

          aiContent = {
            subject: extractField('subject'),
            greeting: extractField('greeting'),
            summary: extractField('summary'),
            keyPoints: extractArray('keyPoints'),
            recommendations: extractField('recommendations'),
            nextSteps: extractArray('nextSteps'),
            closing: extractField('closing'),
            signature: extractField('signature')
          };

          if (!aiContent.subject && !aiContent.greeting) {
            throw new Error('Could not extract fields from AI response');
          }
        }
      }

      // Validate required fields
      if (!aiContent.subject || !aiContent.greeting) {
        throw new Error('Missing required fields in AI response');
      }
    } catch (parseError) {
      console.error('[AI Followup] All parse strategies failed:', parseError.message);
      console.error('[AI Followup] Raw response (first 800 chars):', responseText.substring(0, 800));
      aiContent = createFallbackResponse(responseText, validLanguage);
    }

    // Define template values for placeholder substitution (PII that wasn't sent to AI)
    const templateValues = {
      PATIENT_NAME: patientName,
      PATIENT_FIRST_NAME: visit.patient.first_name,
      DIETITIAN_NAME: dietitianName,
      NEXT_APPOINTMENT_DATE: nextVisitInfo || '',
      CLINIC_NAME: '', // Could be loaded from settings
      CLINIC_PHONE: '' // Could be loaded from settings
    };

    // Substitute placeholders in AI content with real values
    const processedContent = {
      subject: substituteTemplatePlaceholders(aiContent.subject, templateValues),
      greeting: substituteTemplatePlaceholders(aiContent.greeting, templateValues),
      summary: substituteTemplatePlaceholders(aiContent.summary, templateValues),
      keyPoints: Array.isArray(aiContent.keyPoints)
        ? aiContent.keyPoints.map(p => substituteTemplatePlaceholders(p, templateValues))
        : [],
      recommendations: substituteTemplatePlaceholders(aiContent.recommendations, templateValues),
      nextSteps: Array.isArray(aiContent.nextSteps)
        ? aiContent.nextSteps.map(s => substituteTemplatePlaceholders(s, templateValues))
        : [],
      closing: substituteTemplatePlaceholders(aiContent.closing, templateValues),
      signature: substituteTemplatePlaceholders(aiContent.signature, templateValues) || dietitianName
    };

    // Build HTML email body from processed content
    const htmlBody = buildHtmlEmail(processedContent, {
      patientName,
      dietitianName,
      nextVisitInfo,
      language: validLanguage
    });

    // Build plain text version
    const textBody = buildTextEmail(processedContent, {
      patientName,
      dietitianName,
      nextVisitInfo,
      language: validLanguage
    });

    return {
      subject: processedContent.subject,
      body_html: htmlBody,
      body_text: textBody,
      ai_content: processedContent, // Return processed content with substituted values
      ai_content_raw: aiContent, // Keep raw AI response for debugging if needed
      visit: {
        id: visit.id,
        visit_date: visit.visit_date,
        visit_type: visit.visit_type,
        patient_name: patientName
      },
      metadata: {
        provider: aiConfig.provider,
        model: aiConfig.model,
        language: validLanguage,
        tone,
        generated_at: new Date().toISOString(),
        placeholders_used: Object.keys(templateValues).filter(k => templateValues[k])
      }
    };
  } catch (error) {
    console.error('Error generating follow-up:', error);

    // Handle specific API errors
    if (error.status === 401) {
      throw new Error('Invalid API key. Please check your AI provider configuration.');
    } else if (error.status === 429) {
      throw new Error('AI rate limit exceeded. Please try again in a moment.');
    } else if (error.status >= 500) {
      throw new Error('AI service temporarily unavailable. Please try again later.');
    }

    throw error;
  }
}

/**
 * Build HTML email from AI content
 */
function buildHtmlEmail(content, options) {
  const { patientName, dietitianName, nextVisitInfo, language } = options;

  const keyPointsHtml = content.keyPoints && content.keyPoints.length > 0
    ? `<ul style="margin: 15px 0; padding-left: 20px;">
        ${content.keyPoints.map(point => `<li style="margin-bottom: 8px;">${point}</li>`).join('')}
       </ul>`
    : '';

  const nextStepsHtml = content.nextSteps && content.nextSteps.length > 0
    ? `<div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
        <h3 style="margin-top: 0; color: #2e7d32;">${language === 'fr' ? 'Prochaines étapes' : 'Next Steps'}</h3>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${content.nextSteps.map(step => `<li style="margin-bottom: 8px;">${step}</li>`).join('')}
        </ul>
       </div>`
    : '';

  const nextAppointmentHtml = nextVisitInfo
    ? `<div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
        <p style="margin: 0;">
          <strong>${language === 'fr' ? '📅 Prochain rendez-vous :' : '📅 Next appointment:'}</strong> ${nextVisitInfo}
        </p>
       </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
    <p style="margin-top: 0;">${content.greeting || `Bonjour ${patientName},`}</p>

    <p>${content.summary}</p>

    ${keyPointsHtml}

    <p>${content.recommendations}</p>

    ${nextStepsHtml}

    ${nextAppointmentHtml}

    <p>${content.closing}</p>

    <p style="margin-bottom: 0;">
      ${content.signature || dietitianName}<br>
      <em style="color: #666;">${language === 'fr' ? 'Votre diététicien(ne)' : 'Your dietitian'}</em>
    </p>
  </div>

  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #888;">
    <p style="margin-bottom: 5px;">
      ${language === 'fr'
        ? 'Cet email a été généré avec l\'assistance de l\'intelligence artificielle et vérifié par votre praticien.'
        : 'This email was generated with artificial intelligence assistance and reviewed by your practitioner.'}
    </p>
    <p style="margin: 0; font-size: 10px;">
      ${language === 'fr'
        ? 'Conformément au RGPD, aucune donnée personnelle identifiante n\'a été transmise au service d\'IA.'
        : 'In compliance with GDPR, no personally identifiable data was transmitted to the AI service.'}
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Build plain text email from AI content
 */
function buildTextEmail(content, options) {
  const { patientName, dietitianName, nextVisitInfo, language } = options;

  let text = `${content.greeting || `Bonjour ${patientName},`}

${content.summary}

`;

  if (content.keyPoints && content.keyPoints.length > 0) {
    text += content.keyPoints.map(point => `• ${point}`).join('\n') + '\n\n';
  }

  text += `${content.recommendations}

`;

  if (content.nextSteps && content.nextSteps.length > 0) {
    text += `${language === 'fr' ? 'PROCHAINES ÉTAPES :' : 'NEXT STEPS:'}\n`;
    text += content.nextSteps.map(step => `• ${step}`).join('\n') + '\n\n';
  }

  if (nextVisitInfo) {
    text += `${language === 'fr' ? 'Prochain rendez-vous :' : 'Next appointment:'} ${nextVisitInfo}\n\n`;
  }

  text += `${content.closing}

${content.signature || dietitianName}
${language === 'fr' ? 'Votre diététicien(ne)' : 'Your dietitian'}

---
${language === 'fr'
  ? 'Cet email a été généré avec l\'assistance de l\'intelligence artificielle et vérifié par votre praticien.\nConformément au RGPD, aucune donnée personnelle identifiante n\'a été transmise au service d\'IA.'
  : 'This email was generated with artificial intelligence assistance and reviewed by your practitioner.\nIn compliance with GDPR, no personally identifiable data was transmitted to the AI service.'}
`;

  return text.trim();
}

/**
 * Generate mock follow-up content for development/testing
 */
async function generateMockFollowup(visit, options) {
  const { language = 'fr' } = options;
  const patientName = `${visit.patient.first_name} ${visit.patient.last_name}`;
  const dietitianName = visit.dietitian
    ? `${visit.dietitian.first_name || ''} ${visit.dietitian.last_name || ''}`.trim()
    : 'Votre diététicien(ne)';

  const nextVisitInfo = visit.next_visit_date
    ? formatDateLong(visit.next_visit_date, language)
    : null;

  // Mock content uses actual values directly (not going through AI, so no GDPR concern)
  const mockContent = language === 'fr' ? {
    subject: `Suite à votre consultation du ${formatDate(visit.visit_date, 'fr')}`,
    greeting: `Bonjour ${visit.patient.first_name},`,
    summary: 'Suite à notre consultation, je souhaitais vous faire un récapitulatif des points importants que nous avons abordés ensemble. Nous avons fait le point sur votre situation nutritionnelle et défini ensemble des objectifs réalistes.',
    keyPoints: [
      'Discussion de vos objectifs nutritionnels',
      'Évaluation de votre alimentation actuelle',
      'Définition d\'un plan d\'action personnalisé'
    ],
    recommendations: 'Je vous encourage à suivre les recommandations que nous avons établies ensemble. N\'hésitez pas à me contacter si vous avez des questions.',
    nextSteps: [
      'Mettre en place les changements alimentaires discutés',
      'Noter vos repas dans un carnet alimentaire',
      'Pratiquer une activité physique régulière'
    ],
    closing: 'Je reste à votre disposition pour toute question. N\'hésitez pas à me contacter.',
    signature: dietitianName
  } : {
    subject: `Follow-up: Your consultation on ${formatDate(visit.visit_date, 'en')}`,
    greeting: `Hello ${visit.patient.first_name},`,
    summary: 'Following our consultation, I wanted to provide you with a summary of the key points we discussed. We reviewed your nutritional situation and set realistic goals together.',
    keyPoints: [
      'Discussion of your nutritional goals',
      'Assessment of your current diet',
      'Definition of a personalized action plan'
    ],
    recommendations: 'I encourage you to follow the recommendations we established together. Please don\'t hesitate to contact me if you have any questions.',
    nextSteps: [
      'Implement the dietary changes we discussed',
      'Keep a food diary',
      'Maintain regular physical activity'
    ],
    closing: 'I remain at your disposal for any questions. Please don\'t hesitate to reach out.',
    signature: dietitianName
  };

  const htmlBody = buildHtmlEmail(mockContent, {
    patientName,
    dietitianName,
    nextVisitInfo,
    language
  });

  const textBody = buildTextEmail(mockContent, {
    patientName,
    dietitianName,
    nextVisitInfo,
    language
  });

  return {
    subject: mockContent.subject,
    body_html: htmlBody,
    body_text: textBody,
    ai_content: mockContent,
    visit: {
      id: visit.id,
      visit_date: visit.visit_date,
      visit_type: visit.visit_type,
      patient_name: patientName
    },
    metadata: {
      provider: 'mock',
      model: 'mock',
      language,
      tone: options.tone || 'professional',
      generated_at: new Date().toISOString(),
      note: 'Mock response - No AI API key configured'
    }
  };
}

/**
 * Check if AI service is available
 * @returns {boolean} True if any AI service is configured
 */
function isAIAvailable() {
  return aiProviderService.isAnyProviderAvailable();
}

/**
 * Get supported languages
 */
function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

module.exports = {
  generateFollowupContent,
  isAIAvailable,
  getSupportedLanguages,
  SUPPORTED_LANGUAGES
};
