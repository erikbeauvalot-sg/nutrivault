import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useEmailCheck from '../hooks/useEmailCheck'

function PatientForm({ onSubmit, editingPatient, onCancel }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    medical_notes: '',
    allergies: '',
    dietary_preferences: ''
  })

  // Email availability check with debouncing
  const { checking: checkingEmail, available: emailAvailable, error: emailCheckError } = useEmailCheck(
    formData.email,
    'patient',
    editingPatient?.id || null,
    500
  )

  useEffect(() => {
    if (editingPatient) {
      setFormData({
        first_name: editingPatient.first_name || '',
        last_name: editingPatient.last_name || '',
        email: editingPatient.email || '',
        phone: editingPatient.phone || '',
        date_of_birth: editingPatient.date_of_birth || '',
        gender: editingPatient.gender || '',
        address: editingPatient.address || '',
        medical_notes: editingPatient.medical_notes || '',
        allergies: editingPatient.allergies || '',
        dietary_preferences: editingPatient.dietary_preferences || ''
      })
    } else {
      resetForm()
    }
  }, [editingPatient])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      gender: '',
      address: '',
      medical_notes: '',
      allergies: '',
      dietary_preferences: ''
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const success = editingPatient
      ? await onSubmit(editingPatient.id, formData)
      : await onSubmit(formData)
    
    if (success) {
      resetForm()
    }
  }

  const handleCancel = () => {
    resetForm()
    onCancel()
  }

  return (
    <div className="patient-form">
      <h2>{editingPatient ? `✏️ ${t('patients.editPatient')}` : `➕ ${t('patients.addNewPatient')}`}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>{t('patients.firstName')} *</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('patients.lastName')} *</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('patients.email')}</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={formData.email && emailAvailable === false ? 'input-error' : formData.email && emailAvailable === true ? 'input-success' : ''}
            />
            {checkingEmail && formData.email && (
              <small className="form-text text-muted">
                ⏳ {t('patients.checkingEmail', 'Checking email availability...')}
              </small>
            )}
            {emailAvailable === false && formData.email && (
              <small className="form-text text-danger">
                ✖ {t('patients.emailTaken', 'This email is already used by another patient')}
              </small>
            )}
            {emailAvailable === true && formData.email && (
              <small className="form-text text-success">
                ✓ {t('patients.emailAvailable', 'Email is available')}
              </small>
            )}
            {emailCheckError && (
              <small className="form-text text-danger">{emailCheckError}</small>
            )}
          </div>
          <div className="form-group">
            <label>{t('patients.phone')}</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('patients.dateOfBirth')}</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>{t('patients.gender')}</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="">{t('patients.selectGender')}</option>
              <option value="Male">{t('patients.male')}</option>
              <option value="Female">{t('patients.female')}</option>
              <option value="Other">{t('patients.other')}</option>
              <option value="Prefer not to say">{t('patients.preferNotToSay')}</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>{t('patients.address')}</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>{t('patients.medicalNotes')}</label>
          <textarea
            name="medical_notes"
            value={formData.medical_notes}
            onChange={handleChange}
            placeholder="Any relevant medical history or conditions..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('patients.allergies')}</label>
            <textarea
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              placeholder="List any known allergies..."
            />
          </div>
          <div className="form-group">
            <label>{t('patients.dietaryPreferences')}</label>
            <textarea
              name="dietary_preferences"
              value={formData.dietary_preferences}
              onChange={handleChange}
              placeholder="Vegetarian, vegan, gluten-free, etc..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={checkingEmail || (formData.email && emailAvailable === false)}
          >
            {editingPatient ? `💾 ${t('patients.editPatient')}` : `➕ ${t('patients.createPatient')}`}
          </button>
          {editingPatient && (
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              {`✖️ ${t('common.cancel')}`}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default PatientForm
