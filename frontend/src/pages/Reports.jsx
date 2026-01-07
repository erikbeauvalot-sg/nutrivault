import { useState } from 'react';
import { Container, Row, Col, Form, Card, Button } from 'react-bootstrap';
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
    <Container fluid className="py-4">
      <h1 className="mb-4">Reports</h1>
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row className="align-items-end g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Report Type</Form.Label>
                <Form.Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="revenue">Revenue Summary</option>
                  <option value="patients">Patient Summary</option>
                  <option value="visits">Visit Summary</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={dateRange.startDate}
                  onChange={handleDateChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateChange}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Button onClick={handleGenerateReport} className="w-100">
                Generate
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {renderReport()}
    </Container>
  );
}

export default Reports;
