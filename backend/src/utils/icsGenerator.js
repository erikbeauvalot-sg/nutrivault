/**
 * ICS Calendar File Generator
 * Generates iCalendar (.ics) files for appointments
 * Compatible with Google Calendar, Apple Calendar, Outlook, etc.
 */

const { getTimezone } = require('./timezone');

/**
 * Format date to ICS format (YYYYMMDDTHHmmssZ)
 * @param {Date} date - Date object
 * @returns {string} ICS formatted date
 */
function formatICSDate(date) {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Generate a unique UID for the event
 * @param {string} visitId - Visit ID
 * @returns {string} Unique identifier
 */
function generateUID(visitId) {
  return `${visitId}@nutrivault.app`;
}

/**
 * Escape special characters in ICS text fields
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeICSText(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate ICS file content for a visit appointment
 * @param {Object} options - Options
 * @param {Object} options.visit - Visit object
 * @param {Object} options.patient - Patient object
 * @param {Object} options.dietitian - Dietitian/User object
 * @param {string} options.location - Optional location
 * @returns {string} ICS file content
 */
function generateVisitICS({ visit, patient, dietitian, location = '' }) {
  const startDate = new Date(visit.visit_date);
  const durationMinutes = visit.duration_minutes || 60;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  const timezone = getTimezone();
  const now = new Date();

  // Build summary (title)
  const summary = `Consultation diététique - ${dietitian.first_name} ${dietitian.last_name}`;

  // Build description
  let description = `Rendez-vous avec ${dietitian.first_name} ${dietitian.last_name}`;
  if (visit.visit_type) {
    description += `\\nType: ${visit.visit_type}`;
  }
  description += `\\nDurée: ${durationMinutes} minutes`;
  if (dietitian.phone) {
    description += `\\nTéléphone: ${dietitian.phone}`;
  }
  if (dietitian.email) {
    description += `\\nEmail: ${dietitian.email}`;
  }

  // Build organizer info
  const organizerName = `${dietitian.first_name} ${dietitian.last_name}`;
  const organizerEmail = dietitian.email || 'noreply@nutrivault.app';

  // Build attendee info
  const attendeeName = `${patient.first_name} ${patient.last_name}`;
  const attendeeEmail = patient.email;

  // Build ICS content with proper RFC 5545 format for Gmail compatibility
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NutriVault//Appointment//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'X-WR-CALNAME:NutriVault',
    'BEGIN:VEVENT',
    `UID:${generateUID(visit.id)}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICSText(summary)}`,
    `DESCRIPTION:${escapeICSText(description)}`,
    location ? `LOCATION:${escapeICSText(location)}` : null,
    // Organizer with proper format for Gmail
    `ORGANIZER;CN=${escapeICSText(organizerName)};ROLE=CHAIR:mailto:${organizerEmail}`,
    // Attendee with all required attributes for Gmail to show Accept/Decline
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${escapeICSText(attendeeName)};X-NUM-GUESTS=0:mailto:${attendeeEmail}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'SEQUENCE:0',
    'PRIORITY:5',
    'CLASS:PUBLIC',
    // Alarms for reminders
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Rappel de rendez-vous dans 1 heure',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Rappel de rendez-vous demain',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  // Filter out null/empty lines and join with CRLF (required by RFC 5545)
  const icsContent = icsLines.filter(line => line !== null && line !== '').join('\r\n');

  return icsContent;
}

/**
 * Generate ICS attachment object for nodemailer (as file attachment)
 * @param {Object} options - Same as generateVisitICS
 * @returns {Object} Nodemailer attachment object
 */
function generateICSAttachment(options) {
  const icsContent = generateVisitICS(options);
  const { dietitian } = options;

  // Generate filename
  const visitDate = new Date(options.visit.visit_date);
  const dateStr = visitDate.toISOString().split('T')[0];
  const filename = `rdv-${dateStr}-${dietitian.last_name}.ics`;

  return {
    filename,
    content: icsContent,
    contentType: 'text/calendar; charset=utf-8; method=REQUEST'
  };
}

/**
 * Generate iCalendar event object for nodemailer (recognized as calendar invitation by Gmail)
 * This makes Gmail display the event inline with Accept/Decline buttons
 * @param {Object} options - Same as generateVisitICS
 * @returns {Object} Nodemailer icalEvent object
 */
function generateICalEvent(options) {
  const icsContent = generateVisitICS(options);
  const { dietitian } = options;

  // Generate filename
  const visitDate = new Date(options.visit.visit_date);
  const dateStr = visitDate.toISOString().split('T')[0];
  const filename = `rdv-${dateStr}-${dietitian.last_name}.ics`;

  // Return as Buffer for proper MIME encoding (required for Gmail recognition)
  return {
    filename,
    method: 'REQUEST',
    content: Buffer.from(icsContent, 'utf-8')
  };
}

module.exports = {
  generateVisitICS,
  generateICSAttachment,
  generateICalEvent,
  formatICSDate,
  escapeICSText
};
