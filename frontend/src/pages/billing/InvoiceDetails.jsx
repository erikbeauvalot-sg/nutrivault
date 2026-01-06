/**
 * Invoice Details Page
 * Displays detailed information about a specific invoice
 */

import { Container } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

export function InvoiceDetailsPage() {
  const { id } = useParams();

  return (
    <Container>
      <h1>Invoice Details</h1>
      <p>Viewing invoice: {id}</p>
      <p>Invoice details page - Coming soon in Phase 4.6</p>
    </Container>
  );
}

export default InvoiceDetailsPage;
