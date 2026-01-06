/**
 * Footer Component
 * Application footer
 */

import { Container, Row, Col } from 'react-bootstrap';
import '../../styles/layout.css';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer bg-dark text-light mt-5">
      <Container fluid className="py-4 px-4">
        <Row className="justify-content-between align-items-center">
          <Col md={6} className="mb-3 mb-md-0">
            <p className="mb-0">
              © 
              {' '}
              {currentYear}
              {' '}
              NutriVault. All rights reserved.
            </p>
          </Col>
          <Col md={6} className="text-md-end">
            <small className="text-muted">
              Version 1.0.0 | 
              {' '}
              <a href="#privacy" className="text-decoration-none text-muted">
                Privacy
              </a>
              {' '}
              | 
              {' '}
              <a href="#terms" className="text-decoration-none text-muted">
                Terms
              </a>
            </small>
          </Col>
        </Row>
      </Container>
    </footer>
  );
}

export default Footer;
