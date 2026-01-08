/**
 * Dashboard Page
 */

import { Row, Col, Card } from 'react-bootstrap';
import useAuth from '../hooks/useAuth';

export function DashboardPage() {
  const { user } = useAuth();

  console.log('[Dashboard] Rendering dashboard, user:', user);

  return (
    <div>
      <h1 className="mb-4">Dashboard</h1>

      <Row>
        <Col md={4} className="mb-3">
          <Card>
            <Card.Body>
              <Card.Title>Welcome</Card.Title>
              <Card.Text>
                Welcome back,
                {' '}
                {user?.first_name || user?.username}
                !
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3">
          <Card>
            <Card.Body>
              <Card.Title>Your Role</Card.Title>
              <Card.Text>{user?.role?.name || 'No role assigned'}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3">
          <Card>
            <Card.Body>
              <Card.Title>Status</Card.Title>
              <Card.Text>System Online</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mt-4">
        <Card.Body>
          <Card.Title>Getting Started</Card.Title>
          <Card.Text>
            Navigate using the sidebar menu to access different sections of the application.
          </Card.Text>
        </Card.Body>
      </Card>
    </div>
  );
}

export default DashboardPage;
