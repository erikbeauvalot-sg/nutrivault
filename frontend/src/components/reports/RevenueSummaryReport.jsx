import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getRevenueReport, exportReportCSV } from '../../services/reportService';
import { downloadBlob, generateCsvFilename } from '../../utils/csvExport';

/**
 * RevenueSummaryReport Component
 * Displays revenue summary with total revenue, invoices, average value, and outstanding balance
 */
function RevenueSummaryReport({ dateRange }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getRevenueReport(dateRange.startDate, dateRange.endDate);
        setReport(data);
      } catch (err) {
        setError('Failed to load revenue report.');
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
      const blob = await exportReportCSV('revenue', dateRange);
      downloadBlob(blob, generateCsvFilename('revenue_summary'));
    } catch (err) {
      console.error('Failed to export CSV:', err);
      setError('Failed to export report.');
    } finally {
      setExporting(false);
    }
  };
  
  const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { 
    style: 'currency', 
    currency: 'CAD' 
  }).format(amount || 0);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <div className="mt-2 text-muted">Loading revenue report...</div>
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
        <h5 className="mb-0">Revenue Summary</h5>
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
                  <span className="info-box-icon bg-success">
                    <i className="fas fa-dollar-sign"></i>
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text">Total Revenue</span>
                    <span className="info-box-number">{formatCurrency(report.totalRevenue)}</span>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="info-box">
                  <span className="info-box-icon bg-info">
                    <i className="fas fa-file-invoice"></i>
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text">Total Invoices</span>
                    <span className="info-box-number">{report.totalInvoices}</span>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="info-box">
                  <span className="info-box-icon bg-primary">
                    <i className="fas fa-calculator"></i>
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text">Average Invoice Value</span>
                    <span className="info-box-number">{formatCurrency(report.averageInvoiceValue)}</span>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="info-box">
                  <span className="info-box-icon bg-warning">
                    <i className="fas fa-clock"></i>
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text">Outstanding Balance</span>
                    <span className="info-box-number">{formatCurrency(report.outstandingBalance)}</span>
                  </div>
                </div>
              </div>
            </div>

            {report.byStatus && report.byStatus.length > 0 && (
              <div className="mt-4">
                <h6 className="mb-3">Revenue by Status</h6>
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th className="text-end">Count</th>
                      <th className="text-end">Amount</th>
                      <th className="text-end">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byStatus.map((item, index) => (
                      <tr key={index}>
                        <td className="text-capitalize">{item.status}</td>
                        <td className="text-end">{item.count}</td>
                        <td className="text-end">{formatCurrency(item.amount)}</td>
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

RevenueSummaryReport.propTypes = {
  dateRange: PropTypes.shape({
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
  }).isRequired,
};

export default RevenueSummaryReport;
