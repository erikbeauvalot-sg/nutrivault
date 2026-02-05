import { hasAnalyticsConsent } from './analyticsService';

/**
 * GTM DataLayer Service
 * Pushes events to window.dataLayer for Google Tag Manager
 */

const getDataLayer = () => {
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
};

/**
 * Push a generic event to dataLayer (only if consent granted)
 */
export const pushEvent = (eventName, params = {}) => {
  if (!hasAnalyticsConsent()) return;
  getDataLayer().push({ event: eventName, ...params });
};

/**
 * Push a page_view event
 */
export const pushPageView = (pagePath, pageTitle) => {
  pushEvent('page_view', { page_path: pagePath, page_title: pageTitle });
};

/**
 * Push a cta_click event (e.g. Doctolib buttons)
 */
export const pushCtaClick = (ctaName, ctaUrl) => {
  pushEvent('cta_click', { cta_name: ctaName, cta_url: ctaUrl });
};

/**
 * Push a social_click event (Instagram, LinkedIn, etc.)
 */
export const pushSocialClick = (platform, url) => {
  pushEvent('social_click', { platform, social_url: url });
};

/**
 * Push a form_submit event
 */
export const pushFormSubmit = (formName, success) => {
  pushEvent('form_submit', { form_name: formName, form_success: success });
};

/**
 * Push a section_navigate event
 */
export const pushSectionNavigate = (sectionId) => {
  pushEvent('section_navigate', { section_id: sectionId });
};

/**
 * Push consent state to dataLayer for GTM Consent Mode
 */
export const initConsent = (granted) => {
  getDataLayer().push({
    event: 'consent_update',
    analytics_consent: granted ? 'granted' : 'denied',
  });
};
