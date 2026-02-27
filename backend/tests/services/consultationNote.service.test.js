/**
 * Consultation Note Service Tests
 * Tests for consultationNote.service.js business logic
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let db;
let consultationNoteService;

describe('Consultation Note Service', () => {
  let adminAuth, dietitianAuth, dietitian2Auth;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    consultationNoteService = require('../../src/services/consultationNote.service');
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    dietitian2Auth = await testAuth.createDietitian();

    // ConsultationTemplate and ConsultationTemplateItem are NOT in testDb.reset() list
    // Clean them manually to ensure fresh state
    await db.ConsultationTemplateItem.destroy({ where: {}, force: true });
    await db.ConsultationTemplate.destroy({ where: {}, force: true });
  });

  // ========================================
  // Helpers
  // ========================================
  let emailCounter = 0;

  function uniqueEmail(prefix = 'patient') {
    emailCounter++;
    return `${prefix}_${emailCounter}_${Date.now()}@test.com`;
  }

  async function createPatientInDb(overrides = {}) {
    return db.Patient.create({
      first_name: overrides.first_name || 'Test',
      last_name: overrides.last_name || 'Patient',
      email: overrides.email !== undefined ? overrides.email : uniqueEmail(),
      is_active: true,
      ...overrides
    });
  }

  async function createTemplateInDb(userId, overrides = {}) {
    return db.ConsultationTemplate.create({
      name: overrides.name || 'Test Template',
      description: overrides.description || 'A test template',
      template_type: overrides.template_type || 'general',
      visibility: overrides.visibility || 'private',
      is_default: false,
      created_by: userId,
      tags: []
    });
  }

  async function createVisitInDb(patientId, dietitianId, overrides = {}) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    return db.Visit.create({
      patient_id: patientId,
      dietitian_id: dietitianId,
      visit_date: overrides.visit_date || futureDate,
      visit_type: overrides.visit_type || 'Follow-up',
      status: overrides.status || 'SCHEDULED'
    });
  }

  async function createNoteInDb(patientId, templateId, dietitianId, visitId = null, overrides = {}) {
    return db.ConsultationNote.create({
      patient_id: patientId,
      template_id: templateId,
      dietitian_id: dietitianId,
      visit_id: visitId,
      status: overrides.status || 'draft',
      summary: overrides.summary || null
    });
  }

  // ================================================================
  // createNote
  // ================================================================
  describe('createNote', () => {
    let patient, template, visit;

    beforeEach(async () => {
      patient = await createPatientInDb();
      template = await createTemplateInDb(dietitianAuth.user.id);
      visit = await createVisitInDb(patient.id, dietitianAuth.user.id);
    });

    it('should create a note with required fields', async () => {
      const result = await consultationNoteService.createNote(
        {
          patient_id: patient.id,
          template_id: template.id,
          visit_id: visit.id
        },
        dietitianAuth.user.id
      );

      expect(result).toBeDefined();
      expect(result.patient_id).toBe(patient.id);
      expect(result.template_id).toBe(template.id);
      expect(result.dietitian_id).toBe(dietitianAuth.user.id);
    });

    it('should default status to "draft"', async () => {
      const result = await consultationNoteService.createNote(
        {
          patient_id: patient.id,
          template_id: template.id,
          visit_id: visit.id
        },
        dietitianAuth.user.id
      );

      expect(result.status).toBe('draft');
    });

    it('should create a note without a visit_id (standalone note)', async () => {
      const result = await consultationNoteService.createNote(
        {
          patient_id: patient.id,
          template_id: template.id
        },
        dietitianAuth.user.id
      );

      expect(result).toBeDefined();
      expect(result.visit_id).toBeNull();
    });

    it('should include summary when provided', async () => {
      const result = await consultationNoteService.createNote(
        {
          patient_id: patient.id,
          template_id: template.id,
          summary: 'Initial summary'
        },
        dietitianAuth.user.id
      );

      expect(result.summary).toBe('Initial summary');
    });

    it('should throw "Template not found" when template does not exist', async () => {
      const fakeTemplateId = '00000000-0000-0000-0000-000000000000';

      await expect(
        consultationNoteService.createNote(
          {
            patient_id: patient.id,
            template_id: fakeTemplateId
          },
          dietitianAuth.user.id
        )
      ).rejects.toThrow('Template not found');
    });

    it('should return note enriched with associations (patient, template)', async () => {
      const result = await consultationNoteService.createNote(
        {
          patient_id: patient.id,
          template_id: template.id,
          visit_id: visit.id
        },
        dietitianAuth.user.id
      );

      expect(result.patient).toBeDefined();
      expect(result.patient.id).toBe(patient.id);
      expect(result.template).toBeDefined();
      expect(result.template.id).toBe(template.id);
    });

    it('should persist the note to the database', async () => {
      await consultationNoteService.createNote(
        {
          patient_id: patient.id,
          template_id: template.id
        },
        dietitianAuth.user.id
      );

      const count = await db.ConsultationNote.count({
        where: { patient_id: patient.id, template_id: template.id }
      });
      expect(count).toBe(1);
    });
  });

  // ================================================================
  // getNotes
  // ================================================================
  describe('getNotes', () => {
    let patient1, patient2, template, note1, note2, note3;

    beforeEach(async () => {
      patient1 = await createPatientInDb({ first_name: 'Alice' });
      patient2 = await createPatientInDb({ first_name: 'Bob' });
      template = await createTemplateInDb(dietitianAuth.user.id);

      note1 = await createNoteInDb(patient1.id, template.id, dietitianAuth.user.id);
      note2 = await createNoteInDb(patient1.id, template.id, dietitianAuth.user.id, null, { status: 'completed' });
      note3 = await createNoteInDb(patient2.id, template.id, dietitian2Auth.user.id);
    });

    it('should return all notes for admin', async () => {
      const results = await consultationNoteService.getNotes({}, adminAuth.user);

      expect(results.length).toBe(3);
    });

    it('should return only own notes for dietitian (RBAC)', async () => {
      const results = await consultationNoteService.getNotes({}, dietitianAuth.user);

      expect(results.length).toBe(2);
      const ids = results.map(n => n.id);
      expect(ids).toContain(note1.id);
      expect(ids).toContain(note2.id);
      expect(ids).not.toContain(note3.id);
    });

    it('should filter by patient_id', async () => {
      const results = await consultationNoteService.getNotes(
        { patient_id: patient1.id },
        adminAuth.user
      );

      expect(results.length).toBe(2);
      results.forEach(n => expect(n.patient_id).toBe(patient1.id));
    });

    it('should filter by status', async () => {
      const results = await consultationNoteService.getNotes(
        { status: 'completed' },
        adminAuth.user
      );

      expect(results.length).toBe(1);
      expect(results[0].id).toBe(note2.id);
    });

    it('should filter by visit_id', async () => {
      const visit = await createVisitInDb(patient1.id, dietitianAuth.user.id);
      const visitNote = await createNoteInDb(patient1.id, template.id, dietitianAuth.user.id, visit.id);

      const results = await consultationNoteService.getNotes(
        { visit_id: visit.id },
        adminAuth.user
      );

      expect(results.length).toBe(1);
      expect(results[0].id).toBe(visitNote.id);
    });

    it('should return notes with template, patient, and dietitian associations', async () => {
      const results = await consultationNoteService.getNotes({}, adminAuth.user);

      const note = results.find(n => n.id === note1.id);
      expect(note.template).toBeDefined();
      expect(note.patient).toBeDefined();
      expect(note.dietitian).toBeDefined();
    });

    it('should return empty array when dietitian has no notes', async () => {
      const freshDietitian = await testAuth.createDietitian();
      const results = await consultationNoteService.getNotes({}, freshDietitian.user);

      expect(results).toHaveLength(0);
    });
  });

  // ================================================================
  // getNoteById
  // ================================================================
  describe('getNoteById', () => {
    let patient, template, ownNote, otherNote;

    beforeEach(async () => {
      patient = await createPatientInDb();
      template = await createTemplateInDb(dietitianAuth.user.id);

      ownNote = await createNoteInDb(patient.id, template.id, dietitianAuth.user.id);
      otherNote = await createNoteInDb(patient.id, template.id, dietitian2Auth.user.id);
    });

    it('should return note for owning dietitian', async () => {
      const result = await consultationNoteService.getNoteById(ownNote.id, dietitianAuth.user);

      expect(result).toBeDefined();
      expect(result.id).toBe(ownNote.id);
    });

    it('should allow admin to access any note', async () => {
      const result = await consultationNoteService.getNoteById(otherNote.id, adminAuth.user);

      expect(result.id).toBe(otherNote.id);
    });

    it('should throw "Note not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        consultationNoteService.getNoteById(fakeId, adminAuth.user)
      ).rejects.toThrow('Note not found');
    });

    it('should throw permission error when dietitian accesses another dietitian note', async () => {
      await expect(
        consultationNoteService.getNoteById(otherNote.id, dietitianAuth.user)
      ).rejects.toThrow('You do not have permission to view this note');
    });

    it('should return note with template including items', async () => {
      // Add item to template
      await db.ConsultationTemplateItem.create({
        template_id: template.id,
        item_type: 'instruction',
        instruction_title: 'Welcome',
        instruction_content: 'Greet the patient',
        display_order: 0,
        is_required: false
      });

      const result = await consultationNoteService.getNoteById(ownNote.id, dietitianAuth.user);

      expect(result.template).toBeDefined();
      expect(result.template.items).toBeDefined();
      expect(Array.isArray(result.template.items)).toBe(true);
    });

    it('should return note with entries array', async () => {
      const result = await consultationNoteService.getNoteById(ownNote.id, dietitianAuth.user);

      expect(result.entries).toBeDefined();
      expect(Array.isArray(result.entries)).toBe(true);
    });

    it('should return note with patient and dietitian associations', async () => {
      const result = await consultationNoteService.getNoteById(ownNote.id, dietitianAuth.user);

      expect(result.patient).toBeDefined();
      expect(result.patient.id).toBe(patient.id);
      expect(result.dietitian).toBeDefined();
      expect(result.dietitian.id).toBe(dietitianAuth.user.id);
    });
  });

  // ================================================================
  // saveNoteValues
  // ================================================================
  describe('saveNoteValues', () => {
    let patient, template, note;

    beforeEach(async () => {
      patient = await createPatientInDb();
      template = await createTemplateInDb(dietitianAuth.user.id);
      note = await createNoteInDb(patient.id, template.id, dietitianAuth.user.id);
    });

    it('should save summary to the note', async () => {
      const result = await consultationNoteService.saveNoteValues(
        note.id,
        { summary: 'Patient doing well' },
        dietitianAuth.user.id
      );

      expect(result.summary).toBe('Patient doing well');
    });

    it('should save instruction notes as entries', async () => {
      const templateItem = await db.ConsultationTemplateItem.create({
        template_id: template.id,
        item_type: 'instruction',
        instruction_title: 'Observation',
        display_order: 0,
        is_required: false
      });

      await consultationNoteService.saveNoteValues(
        note.id,
        {
          instructionNotes: [
            { template_item_id: templateItem.id, text: 'Patient notes here' }
          ]
        },
        dietitianAuth.user.id
      );

      const entry = await db.ConsultationNoteEntry.findOne({
        where: {
          note_id: note.id,
          entry_type: 'instruction_note',
          template_item_id: templateItem.id
        }
      });
      expect(entry).not.toBeNull();
      expect(entry.note_text).toBe('Patient notes here');
    });

    it('should throw "Note not found" for invalid note id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        consultationNoteService.saveNoteValues(fakeId, { summary: 'x' }, dietitianAuth.user.id)
      ).rejects.toThrow('Note not found');
    });

    it('should throw permission error when non-owner tries to save values', async () => {
      await expect(
        consultationNoteService.saveNoteValues(
          note.id,
          { summary: 'unauthorized' },
          dietitian2Auth.user.id
        )
      ).rejects.toThrow('You do not have permission to update this note');
    });

    it('should upsert an instruction note entry (update on second call)', async () => {
      const templateItem = await db.ConsultationTemplateItem.create({
        template_id: template.id,
        item_type: 'instruction',
        instruction_title: 'Obs',
        display_order: 0,
        is_required: false
      });

      // First save
      await consultationNoteService.saveNoteValues(
        note.id,
        { instructionNotes: [{ template_item_id: templateItem.id, text: 'First note' }] },
        dietitianAuth.user.id
      );

      // Second save — should upsert, not create a duplicate
      await consultationNoteService.saveNoteValues(
        note.id,
        { instructionNotes: [{ template_item_id: templateItem.id, text: 'Updated note' }] },
        dietitianAuth.user.id
      );

      const entries = await db.ConsultationNoteEntry.findAll({
        where: {
          note_id: note.id,
          entry_type: 'instruction_note',
          template_item_id: templateItem.id
        }
      });

      expect(entries.length).toBe(1);
      expect(entries[0].note_text).toBe('Updated note');
    });

    it('should return the full note after saving', async () => {
      const result = await consultationNoteService.saveNoteValues(
        note.id,
        { summary: 'Test summary' },
        dietitianAuth.user.id
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(note.id);
      expect(result.patient).toBeDefined();
      expect(result.template).toBeDefined();
    });
  });

  // ================================================================
  // completeNote
  // ================================================================
  describe('completeNote', () => {
    let patient, template, note;

    beforeEach(async () => {
      patient = await createPatientInDb();
      template = await createTemplateInDb(dietitianAuth.user.id);
      note = await createNoteInDb(patient.id, template.id, dietitianAuth.user.id);
    });

    it('should mark note as completed', async () => {
      const result = await consultationNoteService.completeNote(note.id, dietitianAuth.user.id);

      expect(result.status).toBe('completed');
      expect(result.completed_at).not.toBeNull();
    });

    it('should throw "Note not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        consultationNoteService.completeNote(fakeId, dietitianAuth.user.id)
      ).rejects.toThrow('Note not found');
    });

    it('should throw permission error when non-owner tries to complete note', async () => {
      await expect(
        consultationNoteService.completeNote(note.id, dietitian2Auth.user.id)
      ).rejects.toThrow('You do not have permission to complete this note');
    });

    it('should persist completed_at timestamp', async () => {
      await consultationNoteService.completeNote(note.id, dietitianAuth.user.id);

      const fresh = await db.ConsultationNote.findByPk(note.id);
      expect(fresh.completed_at).not.toBeNull();
      expect(fresh.status).toBe('completed');
    });
  });

  // ================================================================
  // deleteNote
  // ================================================================
  describe('deleteNote', () => {
    let patient, template, ownNote, otherNote;

    beforeEach(async () => {
      patient = await createPatientInDb();
      template = await createTemplateInDb(dietitianAuth.user.id);

      ownNote = await createNoteInDb(patient.id, template.id, dietitianAuth.user.id);
      otherNote = await createNoteInDb(patient.id, template.id, dietitian2Auth.user.id);
    });

    it('should delete own note as dietitian', async () => {
      const result = await consultationNoteService.deleteNote(ownNote.id, dietitianAuth.user);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/deleted/i);

      const found = await db.ConsultationNote.findByPk(ownNote.id);
      expect(found).toBeNull();
    });

    it('should allow admin to delete any note', async () => {
      const result = await consultationNoteService.deleteNote(otherNote.id, adminAuth.user);

      expect(result.success).toBe(true);

      const found = await db.ConsultationNote.findByPk(otherNote.id);
      expect(found).toBeNull();
    });

    it('should throw "Note not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        consultationNoteService.deleteNote(fakeId, adminAuth.user)
      ).rejects.toThrow('Note not found');
    });

    it('should throw permission error when non-owner dietitian tries to delete', async () => {
      await expect(
        consultationNoteService.deleteNote(otherNote.id, dietitianAuth.user)
      ).rejects.toThrow('You do not have permission to delete this note');
    });

    it('should permanently remove the note from DB', async () => {
      const countBefore = await db.ConsultationNote.count();

      await consultationNoteService.deleteNote(ownNote.id, dietitianAuth.user);

      const countAfter = await db.ConsultationNote.count();
      expect(countAfter).toBe(countBefore - 1);
    });

    it('should cascade-delete associated note entries', async () => {
      // Add an entry to the note
      const templateItem = await db.ConsultationTemplateItem.create({
        template_id: template.id,
        item_type: 'instruction',
        instruction_title: 'Step',
        display_order: 0,
        is_required: false
      });
      await db.ConsultationNoteEntry.create({
        note_id: ownNote.id,
        entry_type: 'instruction_note',
        template_item_id: templateItem.id,
        note_text: 'Some text'
      });

      await consultationNoteService.deleteNote(ownNote.id, dietitianAuth.user);

      const entries = await db.ConsultationNoteEntry.findAll({
        where: { note_id: ownNote.id }
      });
      expect(entries).toHaveLength(0);
    });
  });
});
