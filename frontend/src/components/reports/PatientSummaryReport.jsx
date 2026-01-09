import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getPatientReport, exportReportCSV } from '../../services/reportService';
import { downloadBlob, generateCsvFilename } from '../../utils/csvExport';

/**
 * PatientSummaryReport Component
 * Displays patient summary with total patients, new patients, and active vs inactive breakdown
 */
function PatientSummaryReport({ dateRange }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPatientReport(dateRange.startDate, dateRange.endDate);
        setReport(data);
      } catch (err) {
        setError('Failed to load patient report.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [dateRange]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportReportCSV('patients', dateRange);
      downloadBlob(blob, generateCsvFilename('patient_summary'));
    } catch (err) {
      console.error('Failed to export CSV:', err);
      setError('Failed to export report.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <div className="mt-2 text-muted">Loading patient report...</div>
      </div>
    );
  }

  if (error) return (
    <div className="alert alert-danger">
      {error}
    </div>
  );

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Patient Summary</h5>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export to CSV'}
        </button>
      </div>
      <div className="card-body">
        {report && (
          <>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="info-box">
                  <span className="info-box-icon bg-primary">
                    <i className="fas fa-users"></i>
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text">Total Patients</span>
                    <span className="info-box-number">{report.totalPatients}</span>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="info-box">
                  <span className="info-box-icon bg-success">
                    <i className="fas fa-user-plus"></i>
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text">New Patients</span>
                    <span className="info-box-number">{report.newPatients}</span>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="info-box">
                  <span className="info-box-icon bg-info">
                    <i className="fas fa-user-check"></i>
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text">Active Patients</span>
                    <span className="info-box-number">{report.activePatients}</span>
                  </div>
                </div>
              </div>
            </div>

            {report.byStatus && report.byStatus.length > 0 && (
              <div className="mt-4">
                <h6 className="mb-3">Patients by Status</h6>
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th className="text-end">Count</th>
                      <th className="text-end">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byStatus.map((item, index) => (
                      <tr key={index}>
                        <td className="text-capitalize">{item.status}</td>
                        <td className="text-end">{item.count}</td>
                        <td className="text-end">{item.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

PatientSummaryReport.propTypes = {
  dateRange: PropTypes.shape({
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
  }).isRequired,
};

export default PatientSummaryReport;
