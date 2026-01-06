/**
 * Visit Details Page
 * Displays detailed information about a specific visit
 */

import { Container } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

export function VisitDetailsPage() {
  const { id } = useParams();

  return (
    <Container>
      <h1>Visit Details</h1>
      <p>Viewing visit: {id}</p>
      <p>Visit details page - Coming soon in Phase 4.5</p>
    </Container>
  );
}

export default VisitDetailsPage;
