/**
 * AI Follow-up Service
 * US-5.5.5: AI-Generated Follow-ups
 *
 * Generates personalized follow-up email content using AI
 * Supports multiple providers: Anthropic, OpenAI, Mistral
 */

const aiProviderService = require('./aiProvider.service');
const db = require('../../../models');
const Visit = db.Visit;
const Patient = db.Patient;
const User = db.User;

// Supported languages (FR primary, EN optional)
const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Francais', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
];

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

  // Check if there's enough content to generate follow-up
  const hasContent = visit.chief_complaint || visit.assessment || visit.recommendations || visit.notes;
  if (!hasContent) {
    throw new Error('Visit has no clinical notes to generate follow-up from. Please add assessment, recommendations, or notes first.');
  }

  // Check if any AI provider is available
  if (!aiProviderService.isAnyProviderAvailable()) {
    // Return mock response for development/testing without API keys
    return generateMockFollowup(visit, { ...options, language: validLanguage });
  }

  // Build context for AI
  const patientName = `${visit.patient.first_name} ${visit.patient.last_name}`;
  const dietitianName = visit.dietitian
    ? `${visit.dietitian.first_name || ''} ${visit.dietitian.last_name || ''}`.trim()
    : 'Votre diététicien(ne)';

  const visitDate = new Date(visit.visit_date).toLocaleDateString(
    validLanguage === 'fr' ? 'fr-FR' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  const nextVisitInfo = visit.next_visit_date && includeNextAppointment
    ? new Date(visit.next_visit_date).toLocaleDateString(
        validLanguage === 'fr' ? 'fr-FR' : 'en-US',
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      )
    : null;

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

  // Build the prompts
  const systemPrompt = `You are an assistant helping a dietitian/nutritionist write follow-up emails to their patients.
${languageInstructions}
${toneInstructions[tone] || toneInstructions.professional}

Your task is to generate a personalized follow-up email based on the visit notes provided.
The email should:
1. Be warm and encouraging
2. Summarize the key points discussed during the consultation
3. Highlight the main recommendations in a clear, actionable way
${includeNextSteps ? '4. Include a "Next Steps" section with specific actions for the patient' : ''}
${nextVisitInfo ? '5. Mention the next scheduled appointment' : ''}

Output format:
Return a JSON object with exactly these fields:
{
  "subject": "Email subject line",
  "greeting": "Personalized greeting",
  "summary": "Brief summary of the consultation (2-3 sentences)",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "recommendations": "Detailed recommendations paragraph",
  "nextSteps": ["Action 1", "Action 2", "Action 3"],
  "closing": "Warm closing message",
  "signature": "Professional signature"
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks.`;

  const userPrompt = `Generate a follow-up email for this patient consultation:

PATIENT: ${patientName}
DIETITIAN: ${dietitianName}
CONSULTATION DATE: ${visitDate}
VISIT TYPE: ${visit.visit_type || 'Consultation'}

${visit.chief_complaint ? `CHIEF COMPLAINT/REASON FOR VISIT:
${visit.chief_complaint}

` : ''}${visit.assessment ? `ASSESSMENT:
${visit.assessment}

` : ''}${visit.recommendations ? `RECOMMENDATIONS:
${visit.recommendations}

` : ''}${visit.notes ? `ADDITIONAL NOTES:
${visit.notes}

` : ''}${nextVisitInfo ? `NEXT APPOINTMENT: ${nextVisitInfo}` : ''}

Please generate a personalized follow-up email based on this information.`;

  try {
    // Get current AI configuration
    const aiConfig = await aiProviderService.getAIConfiguration();

    // Generate content using configured provider
    const responseText = await aiProviderService.generateContent(systemPrompt, userPrompt, {
      maxTokens: 2000
    });

    // Parse JSON response
    let aiContent;
    try {
      // Remove potential markdown code blocks
      let jsonText = responseText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      aiContent = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', responseText);
      throw new Error('AI response was not valid JSON. Please try again.');
    }

    // Build HTML email body from AI content
    const htmlBody = buildHtmlEmail(aiContent, {
      patientName,
      dietitianName,
      nextVisitInfo,
      language: validLanguage
    });

    // Build plain text version
    const textBody = buildTextEmail(aiContent, {
      patientName,
      dietitianName,
      nextVisitInfo,
      language: validLanguage
    });

    return {
      subject: aiContent.subject,
      body_html: htmlBody,
      body_text: textBody,
      ai_content: aiContent,
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
        generated_at: new Date().toISOString()
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

  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
    <p>${language === 'fr' ? 'Cet email a été généré avec l\'assistance de l\'IA et vérifié par votre praticien.' : 'This email was generated with AI assistance and reviewed by your practitioner.'}</p>
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
${language === 'fr' ? 'Cet email a été généré avec l\'assistance de l\'IA et vérifié par votre praticien.' : 'This email was generated with AI assistance and reviewed by your practitioner.'}
`;

  return text.trim();
}

/**
 * Generate mock follow-up content for development/testing
 */
function generateMockFollowup(visit, options) {
  const { language = 'fr' } = options;
  const patientName = `${visit.patient.first_name} ${visit.patient.last_name}`;
  const dietitianName = visit.dietitian
    ? `${visit.dietitian.first_name || ''} ${visit.dietitian.last_name || ''}`.trim()
    : 'Votre diététicien(ne)';

  const nextVisitInfo = visit.next_visit_date
    ? new Date(visit.next_visit_date).toLocaleDateString(
        language === 'fr' ? 'fr-FR' : 'en-US',
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      )
    : null;

  const mockContent = language === 'fr' ? {
    subject: `Suite à votre consultation du ${new Date(visit.visit_date).toLocaleDateString('fr-FR')}`,
    greeting: `Bonjour ${patientName},`,
    summary: 'Suite à notre consultation, je souhaitais vous faire un récapitulatif des points importants que nous avons abordés ensemble. Nous avons fait le point sur votre situation nutritionnelle et défini ensemble des objectifs réalistes.',
    keyPoints: [
      visit.chief_complaint || 'Discussion de vos objectifs nutritionnels',
      visit.assessment || 'Évaluation de votre alimentation actuelle',
      'Définition d\'un plan d\'action personnalisé'
    ].filter(Boolean),
    recommendations: visit.recommendations || 'Je vous encourage à suivre les recommandations que nous avons établies ensemble. N\'hésitez pas à me contacter si vous avez des questions.',
    nextSteps: [
      'Mettre en place les changements alimentaires discutés',
      'Noter vos repas dans un carnet alimentaire',
      'Pratiquer une activité physique régulière'
    ],
    closing: 'Je reste à votre disposition pour toute question. N\'hésitez pas à me contacter.',
    signature: dietitianName
  } : {
    subject: `Follow-up: Your consultation on ${new Date(visit.visit_date).toLocaleDateString('en-US')}`,
    greeting: `Hello ${patientName},`,
    summary: 'Following our consultation, I wanted to provide you with a summary of the key points we discussed. We reviewed your nutritional situation and set realistic goals together.',
    keyPoints: [
      visit.chief_complaint || 'Discussion of your nutritional goals',
      visit.assessment || 'Assessment of your current diet',
      'Definition of a personalized action plan'
    ].filter(Boolean),
    recommendations: visit.recommendations || 'I encourage you to follow the recommendations we established together. Please don\'t hesitate to contact me if you have any questions.',
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
