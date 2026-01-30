import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import api from '../services/api';

/**
 * SyncConflictModal Component
 *
 * Displays a side-by-side comparison of NutriVault vs Google Calendar data
 * and allows users to resolve conflicts.
 */
const SyncConflictModal = ({ isOpen, visitId, onClose, onResolved }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [resolution, setResolution] = useState('keep_local');
  const [mergedData, setMergedData] = useState({});

  useEffect(() => {
    if (isOpen && visitId) {
      loadConflictDetails();
    }
  }, [isOpen, visitId]);

  const loadConflictDetails = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/calendar/conflict/${visitId}`);
      if (response.data.success) {
        setConflictData(response.data.data);
        // Initialize merged data with local values
        setMergedData({
          visit_date: response.data.data.local.visit_date,
          visit_type: response.data.data.local.visit_type,
          status: response.data.data.local.status,
          duration_minutes: response.data.data.local.duration_minutes
        });
      }
    } catch (error) {
      console.error('Error loading conflict details:', error);
      toast.error(t('googleCalendar.conflict.loadError', 'Failed to load conflict details'));
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async () => {
    try {
      setIsResolving(true);

      const payload = {
        resolution,
        ...(resolution === 'merge' && { mergedData })
      };

      const response = await api.post(`/calendar/resolve-conflict/${visitId}`, payload);

      if (response.data.success) {
        toast.success(t('googleCalendar.conflict.resolved', 'Conflict resolved successfully'));
        onResolved && onResolved(response.data.data);
        onClose();
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error(t('googleCalendar.conflict.resolveError', 'Failed to resolve conflict'));
    } finally {
      setIsResolving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const parseGoogleDateTime = (googleDateTime) => {
    if (!googleDateTime) return '-';
    const dateTime = googleDateTime.dateTime || googleDateTime.date;
    return dateTime ? formatDate(dateTime) : '-';
  };

  const calculateGoogleDuration = (start, end) => {
    if (!start?.dateTime || !end?.dateTime) return '-';
    const startTime = new Date(start.dateTime);
    const endTime = new Date(end.dateTime);
    return Math.round((endTime - startTime) / 60000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {t('googleCalendar.conflict.title', 'Sync Conflict Detected')}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">{t('common.loading', 'Loading...')}</span>
                </div>
              </div>
            ) : conflictData ? (
              <>
                <div className="alert alert-warning mb-3">
                  <i className="bi bi-info-circle me-2"></i>
                  {t('googleCalendar.conflict.description', 'This visit was modified in both NutriVault and Google Calendar. Choose which version to keep or merge the changes.')}
                </div>

                {/* Patient Info */}
                <div className="mb-3">
                  <strong>{t('visits.patient', 'Patient')}:</strong> {conflictData.local.patient}
                </div>

                {/* Comparison Table */}
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '25%' }}>{t('googleCalendar.conflict.field', 'Field')}</th>
                        <th style={{ width: '35%' }} className="table-primary">
                          <i className="bi bi-laptop me-1"></i>
                          {t('googleCalendar.conflict.nutrivault', 'NutriVault')}
                        </th>
                        <th style={{ width: '35%' }} className="table-warning">
                          <i className="bi bi-google me-1"></i>
                          {t('googleCalendar.conflict.google', 'Google Calendar')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>{t('visits.visitDate', 'Visit Date')}</strong></td>
                        <td>{formatDate(conflictData.local.visit_date)}</td>
                        <td>
                          {conflictData.remote?.deleted
                            ? <span className="text-danger">{t('googleCalendar.conflict.deleted', 'Deleted')}</span>
                            : parseGoogleDateTime(conflictData.remote?.start)
                          }
                        </td>
                      </tr>
                      <tr>
                        <td><strong>{t('visits.duration', 'Duration')}</strong></td>
                        <td>{conflictData.local.duration_minutes} {t('visits.min', 'min')}</td>
                        <td>
                          {conflictData.remote?.deleted
                            ? '-'
                            : `${calculateGoogleDuration(conflictData.remote?.start, conflictData.remote?.end)} ${t('visits.min', 'min')}`
                          }
                        </td>
                      </tr>
                      <tr>
                        <td><strong>{t('visits.visitType', 'Visit Type')}</strong></td>
                        <td>{conflictData.local.visit_type || '-'}</td>
                        <td>{conflictData.remote?.summary || '-'}</td>
                      </tr>
                      <tr>
                        <td><strong>{t('visits.status', 'Status')}</strong></td>
                        <td>{conflictData.local.status}</td>
                        <td>
                          {conflictData.remote?.deleted
                            ? <span className="text-danger">{t('googleCalendar.conflict.eventDeleted', 'Event deleted')}</span>
                            : '-'
                          }
                        </td>
                      </tr>
                      <tr>
                        <td><strong>{t('googleCalendar.conflict.lastModified', 'Last Modified')}</strong></td>
                        <td>{formatDate(conflictData.local.local_modified_at)}</td>
                        <td>{conflictData.remote?.deleted ? '-' : formatDate(conflictData.remote?.updated)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Resolution Options */}
                <div className="mt-4">
                  <h6>{t('googleCalendar.conflict.resolution', 'Resolution')}</h6>

                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="resolution"
                      id="keep_local"
                      value="keep_local"
                      checked={resolution === 'keep_local'}
                      onChange={(e) => setResolution(e.target.value)}
                    />
                    <label className="form-check-label" htmlFor="keep_local">
                      <strong>{t('googleCalendar.conflict.keepLocal', 'Keep NutriVault version')}</strong>
                      <br />
                      <small className="text-muted">
                        {t('googleCalendar.conflict.keepLocalDesc', 'Overwrite Google Calendar with NutriVault data')}
                      </small>
                    </label>
                  </div>

                  {!conflictData.remote?.deleted && (
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="resolution"
                        id="keep_remote"
                        value="keep_remote"
                        checked={resolution === 'keep_remote'}
                        onChange={(e) => setResolution(e.target.value)}
                      />
                      <label className="form-check-label" htmlFor="keep_remote">
                        <strong>{t('googleCalendar.conflict.keepRemote', 'Keep Google Calendar version')}</strong>
                        <br />
                        <small className="text-muted">
                          {t('googleCalendar.conflict.keepRemoteDesc', 'Update NutriVault with Google Calendar data')}
                        </small>
                      </label>
                    </div>
                  )}

                  {/* Merge option could be added here in the future */}
                </div>
              </>
            ) : (
              <div className="alert alert-danger">
                {t('googleCalendar.conflict.noData', 'No conflict data available')}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isResolving}
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleResolve}
              disabled={isLoading || isResolving}
            >
              {isResolving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  {t('googleCalendar.conflict.resolving', 'Resolving...')}
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-1"></i>
                  {t('googleCalendar.conflict.resolve', 'Resolve Conflict')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

SyncConflictModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  visitId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onResolved: PropTypes.func
};

export default SyncConflictModal;
