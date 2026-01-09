import { useState, useEffect } from 'react'
import PatientForm from './components/PatientForm'
import PatientList from './components/PatientList'
import axios from 'axios'

function App() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingPatient, setEditingPatient] = useState(null)

  // Fetch patients on mount
  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/patients')
      setPatients(response.data.data)
      setError(null)
    } catch (err) {
      setError('Failed to load patients. Make sure the backend server is running.')
      console.error('Error fetching patients:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePatient = async (patientData) => {
    try {
      const response = await axios.post('/api/patients', patientData)
      setPatients([response.data.data, ...patients])
      setError(null)
      return true
    } catch (err) {
      setError('Failed to create patient: ' + (err.response?.data?.error || err.message))
      return false
    }
  }

  const handleUpdatePatient = async (id, patientData) => {
    try {
      const response = await axios.put(`/api/patients/${id}`, patientData)
      setPatients(patients.map(p => p.id === id ? response.data.data : p))
      setEditingPatient(null)
      setError(null)
      return true
    } catch (err) {
      setError('Failed to update patient: ' + (err.response?.data?.error || err.message))
      return false
    }
  }

  const handleDeletePatient = async (id) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) {
      return
    }

    try {
      await axios.delete(`/api/patients/${id}`)
      setPatients(patients.filter(p => p.id !== id))
      setError(null)
    } catch (err) {
      setError('Failed to delete patient: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleEditPatient = (patient) => {
    setEditingPatient(patient)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingPatient(null)
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🏥 NutriVault POC</h1>
        <p>Simple Patient Management System</p>
      </div>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <PatientForm
        onSubmit={editingPatient ? handleUpdatePatient : handleCreatePatient}
        editingPatient={editingPatient}
        onCancel={handleCancelEdit}
      />

      <PatientList
        patients={patients}
        loading={loading}
        onEdit={handleEditPatient}
        onDelete={handleDeletePatient}
      />
    </div>
  )
}

export default App
