import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Button, Table } from 'react-bootstrap';
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
        <Spinner animation="border" />
        <div className="mt-2 text-muted">Loading patient report...</div>
      </div>
    );
  }

  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Card className="shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center bg-white">
        <h5 className="mb-0">Patient Summary</h5>
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export to CSV'}
        </Button>
      </Card.Header>
      <Card.Body>
        {report && (
          <>
            <Row className="g-3 mb-4">
              <Col md={4}>
                <Card className="border-start border-primary border-4 h-100">
                  <Card.Body>
                    <div className="text-muted text-uppercase small mb-1">Total Patients</div>
                    <div className="h4 mb-0 fw-bold text-primary">{report.totalPatients}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="border-start border-success border-4 h-100">
                  <Card.Body>
                    <div className="text-muted text-uppercase small mb-1">New Patients</div>
                    <div className="h4 mb-0 fw-bold text-success">{report.newPatients}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="border-start border-info border-4 h-100">
                  <Card.Body>
                    <div className="text-muted text-uppercase small mb-1">Active Patients</div>
                    <div className="h4 mb-0 fw-bold text-info">{report.activePatients}</div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {report.byStatus && report.byStatus.length > 0 && (
              <div className="mt-4">
                <h6 className="mb-3">Patients by Status</h6>
                <Table bordered hover size="sm">
                  <thead className="table-light">
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
                </Table>
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
}

PatientSummaryReport.propTypes = {
  dateRange: PropTypes.shape({
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
  }).isRequired,
};

export default PatientSummaryReport;
