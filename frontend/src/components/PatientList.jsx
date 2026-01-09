function PatientList({ patients, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="patients-list">
        <div className="loading">Loading patients...</div>
      </div>
    )
  }

  if (patients.length === 0) {
    return (
      <div className="patients-list">
        <h2>👥 Patients</h2>
        <div className="empty-state">
          <h3>No patients yet</h3>
          <p>Create your first patient using the form above</p>
        </div>
      </div>
    )
  }

  return (
    <div className="patients-list">
      <h2>👥 Patients</h2>
      <div className="patient-count">
        Total: {patients.length} patient{patients.length !== 1 ? 's' : ''}
      </div>

      {patients.map(patient => (
        <div key={patient.id} className="patient-card">
          <div className="patient-header">
            <div>
              <div className="patient-name">
                {patient.first_name} {patient.last_name}
              </div>
              <span className={`status-badge ${patient.is_active ? 'status-active' : 'status-inactive'}`}>
                {patient.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="patient-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onEdit(patient)}
              >
                ✏️ Edit
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onDelete(patient.id)}
              >
                🗑️ Delete
              </button>
            </div>
          </div>

          <div className="patient-info">
            {patient.email && (
              <div className="patient-info-item">
                <strong>📧 Email:</strong> {patient.email}
              </div>
            )}
            {patient.phone && (
              <div className="patient-info-item">
                <strong>📱 Phone:</strong> {patient.phone}
              </div>
            )}
            {patient.date_of_birth && (
              <div className="patient-info-item">
                <strong>🎂 DOB:</strong> {new Date(patient.date_of_birth).toLocaleDateString()}
              </div>
            )}
            {patient.gender && (
              <div className="patient-info-item">
                <strong>Gender:</strong> {patient.gender}
              </div>
            )}
          </div>

          {patient.address && (
            <div className="patient-info-item" style={{ marginTop: '10px' }}>
              <strong>📍 Address:</strong> {patient.address}
            </div>
          )}

          {patient.allergies && (
            <div className="patient-info-item" style={{ marginTop: '10px' }}>
              <strong>⚠️ Allergies:</strong> {patient.allergies}
            </div>
          )}

          {patient.dietary_preferences && (
            <div className="patient-info-item" style={{ marginTop: '10px' }}>
              <strong>🥗 Dietary Preferences:</strong> {patient.dietary_preferences}
            </div>
          )}

          {patient.medical_notes && (
            <div className="patient-info-item" style={{ marginTop: '10px' }}>
              <strong>📋 Medical Notes:</strong> {patient.medical_notes}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default PatientList
