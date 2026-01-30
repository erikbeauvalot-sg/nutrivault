/**
 * ICS Generator Unit Tests
 * Tests for the iCalendar file generation utility
 */

const {
  generateVisitICS,
  generateICSAttachment,
  generateICalEvent,
  formatICSDate,
  escapeICSText
} = require('../../src/utils/icsGenerator');

describe('ICS Generator', () => {
  const mockVisit = {
    id: 'visit-123',
    visit_date: '2026-02-15T14:30:00.000Z',
    visit_type: 'Consultation',
    duration_minutes: 60,
    status: 'SCHEDULED'
  };

  const mockPatient = {
    id: 'patient-456',
    first_name: 'Jean',
    last_name: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '0612345678'
  };

  const mockDietitian = {
    id: 'dietitian-789',
    first_name: 'Marie',
    last_name: 'Martin',
    email: 'marie.martin@nutrivault.app',
    phone: '0698765432'
  };

  // ========================================
  // formatICSDate
  // ========================================
  describe('formatICSDate', () => {
    it('should format date to ICS format', () => {
      const date = new Date('2026-02-15T14:30:00.000Z');
      const result = formatICSDate(date);

      expect(result).toMatch(/^\d{8}T\d{6}Z$/);
      expect(result).toBe('20260215T143000Z');
    });

    it('should handle different dates correctly', () => {
      const date1 = new Date('2026-01-01T00:00:00.000Z');
      const date2 = new Date('2026-12-31T23:59:59.000Z');

      expect(formatICSDate(date1)).toBe('20260101T000000Z');
      expect(formatICSDate(date2)).toBe('20261231T235959Z');
    });
  });

  // ========================================
  // escapeICSText
  // ========================================
  describe('escapeICSText', () => {
    it('should escape semicolons', () => {
      expect(escapeICSText('Hello; World')).toBe('Hello\\; World');
    });

    it('should escape commas', () => {
      expect(escapeICSText('Hello, World')).toBe('Hello\\, World');
    });

    it('should escape backslashes', () => {
      expect(escapeICSText('Hello\\ World')).toBe('Hello\\\\ World');
    });

    it('should escape newlines', () => {
      expect(escapeICSText('Hello\nWorld')).toBe('Hello\\nWorld');
    });

    it('should handle null/undefined', () => {
      expect(escapeICSText(null)).toBe('');
      expect(escapeICSText(undefined)).toBe('');
    });

    it('should handle multiple special characters', () => {
      const input = 'Hello; World, test\nNew line\\end';
      const expected = 'Hello\\; World\\, test\\nNew line\\\\end';
      expect(escapeICSText(input)).toBe(expected);
    });
  });

  // ========================================
  // generateVisitICS
  // ========================================
  describe('generateVisitICS', () => {
    it('should generate valid ICS content', () => {
      const icsContent = generateVisitICS({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('END:VCALENDAR');
      expect(icsContent).toContain('BEGIN:VEVENT');
      expect(icsContent).toContain('END:VEVENT');
    });

    it('should include correct version and product ID', () => {
      const icsContent = generateVisitICS({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icsContent).toContain('VERSION:2.0');
      expect(icsContent).toContain('PRODID:-//NutriVault//Appointment//FR');
    });

    it('should include visit UID', () => {
      const icsContent = generateVisitICS({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icsContent).toContain(`UID:${mockVisit.id}@nutrivault.app`);
    });

    it('should include event summary with dietitian name', () => {
      const icsContent = generateVisitICS({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icsContent).toContain('SUMMARY:Consultation diététique - Marie Martin');
    });

    it('should include start and end times', () => {
      const icsContent = generateVisitICS({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icsContent).toContain('DTSTART:');
      expect(icsContent).toContain('DTEND:');
    });

    it('should calculate end time based on duration', () => {
      const shortVisit = { ...mockVisit, duration_minutes: 30 };
      const icsContent = generateVisitICS({
        visit: shortVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      // Should have different end time for 30 min vs 60 min
      expect(icsContent).toContain('DTEND:');
    });

    it('should use default 60 minutes if duration not specified', () => {
      const visitNoDuration = { ...mockVisit };
      delete visitNoDuration.duration_minutes;

      const icsContent = generateVisitICS({
        visit: visitNoDuration,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icsContent).toContain('DTEND:');
    });

    it('should include organizer information', () => {
      const icsContent = generateVisitICS({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icsContent).toContain('ORGANIZER;CN=Marie Martin');
      expect(icsContent).toContain('mailto:marie.martin@nutrivault.app');
    });

    it('should include attendee information', () => {
      const icsContent = generateVisitICS({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      // Check for ATTENDEE with proper attributes for Gmail compatibility
      expect(icsContent).toContain('ATTENDEE;');
      expect(icsContent).toContain('CN=Jean Dupont');
      expect(icsContent).toContain('RSVP=TRUE');
      expect(icsContent).toContain('PARTSTAT=NEEDS-ACTION');
      expect(icsContent).toContain('mailto:jean.dupont@example.com');
    });

    it('should include alarm reminders', () => {
      const icsContent = generateVisitICS({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icsContent).toContain('BEGIN:VALARM');
      expect(icsContent).toContain('END:VALARM');
      expect(icsContent).toContain('TRIGGER:-PT1H'); // 1 hour before
      expect(icsContent).toContain('TRIGGER:-PT1D'); // 1 day before
    });

    it('should include event status as CONFIRMED', () => {
      const icsContent = generateVisitICS({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icsContent).toContain('STATUS:CONFIRMED');
    });

    it('should include method REQUEST for invitation', () => {
      const icsContent = generateVisitICS({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icsContent).toContain('METHOD:REQUEST');
    });

    it('should include location if provided', () => {
      const icsContent = generateVisitICS({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian,
        location: 'Cabinet diététique, 123 rue de Paris'
      });

      expect(icsContent).toContain('LOCATION:Cabinet diététique');
    });

    it('should not include empty location line', () => {
      const icsContent = generateVisitICS({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icsContent).not.toContain('LOCATION:');
    });
  });

  // ========================================
  // generateICSAttachment
  // ========================================
  describe('generateICSAttachment', () => {
    it('should return object with correct properties', () => {
      const attachment = generateICSAttachment({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(attachment).toHaveProperty('filename');
      expect(attachment).toHaveProperty('content');
      expect(attachment).toHaveProperty('contentType');
    });

    it('should generate filename with date and dietitian name', () => {
      const attachment = generateICSAttachment({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(attachment.filename).toMatch(/^rdv-\d{4}-\d{2}-\d{2}-Martin\.ics$/);
    });

    it('should have correct content type', () => {
      const attachment = generateICSAttachment({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(attachment.contentType).toBe('text/calendar; charset=utf-8; method=REQUEST');
    });

    it('should contain valid ICS content', () => {
      const attachment = generateICSAttachment({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(attachment.content).toContain('BEGIN:VCALENDAR');
      expect(attachment.content).toContain('END:VCALENDAR');
    });
  });

  // ========================================
  // generateICalEvent
  // ========================================
  describe('generateICalEvent', () => {
    it('should return object with correct properties for nodemailer', () => {
      const icalEvent = generateICalEvent({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icalEvent).toHaveProperty('filename');
      expect(icalEvent).toHaveProperty('method');
      expect(icalEvent).toHaveProperty('content');
    });

    it('should have method REQUEST for Gmail recognition', () => {
      const icalEvent = generateICalEvent({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icalEvent.method).toBe('REQUEST');
    });

    it('should generate correct filename', () => {
      const icalEvent = generateICalEvent({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      expect(icalEvent.filename).toMatch(/^rdv-\d{4}-\d{2}-\d{2}-Martin\.ics$/);
    });

    it('should contain valid ICS content as Buffer', () => {
      const icalEvent = generateICalEvent({
        visit: mockVisit,
        patient: mockPatient,
        dietitian: mockDietitian
      });

      // Content should be a Buffer for proper MIME encoding
      expect(Buffer.isBuffer(icalEvent.content)).toBe(true);

      // Convert to string to check content
      const contentString = icalEvent.content.toString('utf-8');
      expect(contentString).toContain('BEGIN:VCALENDAR');
      expect(contentString).toContain('METHOD:REQUEST');
      expect(contentString).toContain('END:VCALENDAR');
    });
  });
});
