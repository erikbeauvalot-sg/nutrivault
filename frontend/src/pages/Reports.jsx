import { useState } from 'react';
import { subDays, format } from 'date-fns';
import RevenueSummaryReport from '../components/reports/RevenueSummaryReport';
import PatientSummaryReport from '../components/reports/PatientSummaryReport';
import VisitSummaryReport from '../components/reports/VisitSummaryReport';

/**
 * Reports Page
 * Displays various reports with date range selector and export functionality
 */
function Reports() {
  const [reportType, setReportType] = useState('revenue');
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [submittedRange, setSubmittedRange] = useState(dateRange);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  const handleGenerateReport = () => {
    setSubmittedRange(dateRange);
  };

  const renderReport = () => {
    switch (reportType) {
      case 'revenue':
        return <RevenueSummaryReport dateRange={submittedRange} />;
      case 'patients':
        return <PatientSummaryReport dateRange={submittedRange} />;
      case 'visits':
        return <VisitSummaryReport dateRange={submittedRange} />;
      default:
        return <p>Please select a report type.</p>;
    }
  };

  return (
    <div className="py-4">
      <h1 className="mb-4">Reports</h1>
      <div className="card card-primary">
        <div className="card-header">
          <h3 className="card-title">Report Configuration</h3>
        </div>
        <div className="card-body">
          <div className="row align-items-end g-3">
            <div className="col-md-4">
              <div className="form-group">
                <label>Report Type</label>
                <select
                  className="form-control"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="revenue">Revenue Summary</option>
                  <option value="patients">Patient Summary</option>
                  <option value="visits">Visit Summary</option>
                </select>
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="startDate"
                  value={dateRange.startDate}
                  onChange={handleDateChange}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateChange}
                />
              </div>
            </div>
            <div className="col-md-2">
              <button onClick={handleGenerateReport} className="btn btn-primary w-100">
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>

      {renderReport()}
    </div>
  );
}

export default Reports;
