import { useTranslation } from 'react-i18next';

function PatientList({ patients, loading, onEdit, onDelete, onView }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="patients-list">
        <div className="loading">{t('common.loading')}</div>
      </div>
    )
  }

  if (patients.length === 0) {
    return (
      <div className="patients-list">
        <h2>👥 {t('patients.title')}</h2>
        <div className="empty-state">
          <h3>{t('patients.noPatients')}</h3>
          <p>{t('patients.createFirstPatient')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="patients-list">
      <h2>👥 {t('patients.title')}</h2>
      <div className="patient-count">
        {t('patients.totalPatients', {
          count: patients.length,
          plural: patients.length !== 1 ? 's' : ''
        })}
      </div>

      {patients.map(patient => (
        <div key={patient.id} className="patient-card">
          <div className="patient-header">
            <div>
              <div className="patient-name">
                {patient.first_name} {patient.last_name}
              </div>
              <span className={`status-badge ${patient.is_active ? 'status-active' : 'status-inactive'}`}>
                {patient.is_active ? t('common.active') : t('common.inactive')}
              </span>
            </div>
            <div className="patient-actions">
              <button
                className="btn btn-info btn-sm me-1"
                onClick={() => onView(patient)}
                title={t('patients.viewPatient')}
              >
                👁️ {t('common.view')}
              </button>
              <button
                className="btn btn-primary btn-sm me-1"
                onClick={() => onEdit(patient)}
              >
                ✏️ {t('common.edit')}
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onDelete(patient.id)}
              >
                🗑️ {t('common.delete')}
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
