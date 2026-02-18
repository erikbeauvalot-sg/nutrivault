const consultationNoteService = require('../services/consultationNote.service');

const createNote = async (req, res) => {
  try {
    const { patient_id, template_id } = req.body;
    if (!patient_id || !template_id) {
      return res.status(400).json({ success: false, error: 'patient_id and template_id are required' });
    }
    const note = await consultationNoteService.createNote(req.body, req.user.id);
    res.status(201).json({ success: true, message: 'Note created successfully', data: note });
  } catch (error) {
    console.error('[ConsultationNoteController] Error creating note:', error);
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
};

const getNotes = async (req, res) => {
  try {
    const { visit_id, patient_id, status } = req.query;
    const filters = {};
    if (visit_id) filters.visit_id = visit_id;
    if (patient_id) filters.patient_id = patient_id;
    if (status) filters.status = status;

    const notes = await consultationNoteService.getNotes(filters, req.user);
    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('[ConsultationNoteController] Error getting notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getNoteById = async (req, res) => {
  try {
    const note = await consultationNoteService.getNoteById(req.params.id, req.user);
    res.json({ success: true, data: note });
  } catch (error) {
    console.error('[ConsultationNoteController] Error getting note:', error);
    const status = error.message === 'Note not found' ? 404 : error.message.includes('permission') ? 403 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const saveNoteValues = async (req, res) => {
  try {
    const note = await consultationNoteService.saveNoteValues(req.params.id, req.body, req.user.id);
    res.json({ success: true, message: 'Values saved successfully', data: note });
  } catch (error) {
    console.error('[ConsultationNoteController] Error saving values:', error);
    const status = error.message === 'Note not found' ? 404 : error.message.includes('permission') ? 403 : error.message.includes('completed') ? 400 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
};

const completeNote = async (req, res) => {
  try {
    const note = await consultationNoteService.completeNote(req.params.id, req.user.id);
    res.json({ success: true, message: 'Note completed successfully', data: note });
  } catch (error) {
    console.error('[ConsultationNoteController] Error completing note:', error);
    const status = error.message === 'Note not found' ? 404 : error.message.includes('permission') ? 403 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
};

const deleteNote = async (req, res) => {
  try {
    const result = await consultationNoteService.deleteNote(req.params.id, req.user);
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('[ConsultationNoteController] Error deleting note:', error);
    const status = error.message === 'Note not found' ? 404 : error.message.includes('permission') ? 403 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
};

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  saveNoteValues,
  completeNote,
  deleteNote
};
