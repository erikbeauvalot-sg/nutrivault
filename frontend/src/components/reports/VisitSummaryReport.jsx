import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Button, Table } from 'react-bootstrap';
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
        <Spinner animation="border" />
        <div className="mt-2 text-muted">Loading visit report...</div>
      </div>
    );
  }

  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Card className="shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center bg-white">
        <h5 className="mb-0">Visit Summary</h5>
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
              <Col md={3}>
                <Card className="border-start border-primary border-4 h-100">
                  <Card.Body>
                    <div className="text-muted text-uppercase small mb-1">Total Visits</div>
                    <div className="h4 mb-0 fw-bold text-primary">{report.totalVisits}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-start border-success border-4 h-100">
                  <Card.Body>
                    <div className="text-muted text-uppercase small mb-1">Completed</div>
                    <div className="h4 mb-0 fw-bold text-success">{report.completed}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-start border-warning border-4 h-100">
                  <Card.Body>
                    <div className="text-muted text-uppercase small mb-1">Scheduled</div>
                    <div className="h4 mb-0 fw-bold text-warning">{report.scheduled}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-start border-danger border-4 h-100">
                  <Card.Body>
                    <div className="text-muted text-uppercase small mb-1">Cancelled</div>
                    <div className="h4 mb-0 fw-bold text-danger">{report.cancelled}</div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {report.byType && report.byType.length > 0 && (
              <div className="mt-4">
                <h6 className="mb-3">Visits by Type</h6>
                <Table bordered hover size="sm">
                  <thead className="table-light">
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
                </Table>
              </div>
            )}

            {report.byStatus && report.byStatus.length > 0 && (
              <div className="mt-4">
                <h6 className="mb-3">Visits by Status</h6>
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

            {report.byDietitian && report.byDietitian.length > 0 && (
              <div className="mt-4">
                <h6 className="mb-3">Visits by Dietitian</h6>
                <Table bordered hover size="sm">
                  <thead className="table-light">
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
                </Table>
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
}

VisitSummaryReport.propTypes = {
  dateRange: PropTypes.shape({
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
  }).isRequired,
};

export default VisitSummaryReport;
