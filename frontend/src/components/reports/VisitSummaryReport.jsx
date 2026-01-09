import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getVisitReport, exportReportCSV } from '../../services/reportService';
import { downloadBlob, generateCsvFilename } from '../../utils/csvExport';

/**
 * VisitSummaryReport Component
 * Displays visit summary with total visits, breakdown by type, status, and dietitian
 */
function VisitSummaryReport({ dateRange }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getVisitReport(dateRange.startDate, dateRange.endDate);
        setReport(data);
      } catch (err) {
        setError('Failed to load visit report.');
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
      const blob = await exportReportCSV('visits', dateRange);
      downloadBlob(blob, generateCsvFilename('visit_summary'));
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
        <div className="mt-2 text-muted">Loading visit report...</div>
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
        <h5 className="mb-0">Visit Summary</h5>
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
              <div className="col-md-3">
                <div className="info-box">
                  <span className="info-box-icon bg-primary">
                    <i className="fas fa-calendar-check"></i>
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text">Total Visits</span>
                    <span className="info-box-number">{report.totalVisits}</span>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="info-box">
                  <span className="info-box-icon bg-success">
                    <i className="fas fa-check-circle"></i>
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text">Completed</span>
                    <span className="info-box-number">{report.completed}</span>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="info-box">
                  <span className="info-box-icon bg-warning">
                    <i className="fas fa-clock"></i>
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text">Scheduled</span>
                    <span className="info-box-number">{report.scheduled}</span>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="info-box">
                  <span className="info-box-icon bg-danger">
                    <i className="fas fa-times-circle"></i>
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text">Cancelled</span>
                    <span className="info-box-number">{report.cancelled}</span>
                  </div>
                </div>
              </div>
            </div>

            {report.byType && report.byType.length > 0 && (
              <div className="mt-4">
                <h6 className="mb-3">Visits by Type</h6>
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th className="text-end">Count</th>
                      <th className="text-end">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byType.map((item, index) => (
                      <tr key={index}>
                        <td className="text-capitalize">{item.type.replace('_', ' ')}</td>
                        <td className="text-end">{item.count}</td>
                        <td className="text-end">{item.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {report.byStatus && report.byStatus.length > 0 && (
              <div className="mt-4">
                <h6 className="mb-3">Visits by Status</h6>
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

            {report.byDietitian && report.byDietitian.length > 0 && (
              <div className="mt-4">
                <h6 className="mb-3">Visits by Dietitian</h6>
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Dietitian</th>
                      <th className="text-end">Count</th>
                      <th className="text-end">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byDietitian.map((item, index) => (
                      <tr key={index}>
                        <td>{item.dietitian}</td>
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

VisitSummaryReport.propTypes = {
  dateRange: PropTypes.shape({
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
  }).isRequired,
};

export default VisitSummaryReport;
