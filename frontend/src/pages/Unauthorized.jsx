/**
 * Unauthorized Page (403)
 */

import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <Container>
      <Row className="justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Col md={6} className="text-center">
          <Card className="shadow-lg">
            <Card.Body className="p-5">
              <h1 className="display-4 mb-3">403</h1>
              <h2 className="mb-3">Access Denied</h2>
              <Card.Text className="mb-4">
                You do not have permission to access this resource.
              </Card.Text>
              <Button as={Link} to="/dashboard" variant="primary">
                Go Back to Dashboard
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default UnauthorizedPage;
