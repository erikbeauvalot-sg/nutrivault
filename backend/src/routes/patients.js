const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

// GET /api/patients - Get all patients
router.get('/', patientController.getAllPatients);

// GET /api/patients/:id - Get patient by ID
router.get('/:id', patientController.getPatientById);

// POST /api/patients - Create new patient
router.post('/', patientController.createPatient);

// PUT /api/patients/:id - Update patient
router.put('/:id', patientController.updatePatient);

// DELETE /api/patients/:id - Delete patient
router.delete('/:id', patientController.deletePatient);

module.exports = router;
