const db = require('../../../models');
const Patient = db.Patient;

// Get all patients
exports.getAllPatients = async (req, res, next) => {
  try {
    const patients = await Patient.findAll({
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      data: patients,
      count: patients.length
    });
  } catch (error) {
    next(error);
  }
};

// Get patient by ID
exports.getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findByPk(id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }
    
    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

// Create new patient
exports.createPatient = async (req, res, next) => {
  try {
    const patientData = req.body;
    const patient = await Patient.create(patientData);
    
    res.status(201).json({
      success: true,
      data: patient,
      message: 'Patient created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update patient
exports.updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const patient = await Patient.findByPk(id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }
    
    await patient.update(updateData);
    
    res.json({
      success: true,
      data: patient,
      message: 'Patient updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete patient
exports.deletePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const patient = await Patient.findByPk(id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }
    
    await patient.destroy();
    
    res.json({
      success: true,
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
