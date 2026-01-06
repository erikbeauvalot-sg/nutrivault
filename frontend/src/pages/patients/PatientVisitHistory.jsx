/**
 * Patient Visit History Page
 * Displays all visits for a specific patient
 */

import { Container } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

export function PatientVisitHistoryPage() {
  const { id } = useParams();

  return (
    <Container>
      <h1>Patient Visit History</h1>
      <p>Viewing visits for patient: {id}</p>
      <p>Visit history page - Coming soon in Phase 4.5</p>
    </Container>
  );
}

export default PatientVisitHistoryPage;
