import { useState, useEffect } from 'react'

function PatientForm({ onSubmit, editingPatient, onCancel }) {
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
      <h2>{editingPatient ? '✏️ Edit Patient' : '➕ Add New Patient'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Last Name *</label>
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
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
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
            <label>Date of Birth</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Medical Notes</label>
          <textarea
            name="medical_notes"
            value={formData.medical_notes}
            onChange={handleChange}
            placeholder="Any relevant medical history or conditions..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Allergies</label>
            <textarea
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              placeholder="List any known allergies..."
            />
          </div>
          <div className="form-group">
            <label>Dietary Preferences</label>
            <textarea
              name="dietary_preferences"
              value={formData.dietary_preferences}
              onChange={handleChange}
              placeholder="Vegetarian, vegan, gluten-free, etc..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {editingPatient ? '💾 Update Patient' : '➕ Create Patient'}
          </button>
          {editingPatient && (
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              ✖️ Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default PatientForm
