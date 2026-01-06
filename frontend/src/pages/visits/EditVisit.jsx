/**
 * Edit Visit Page
 * Form to edit an existing visit
 */

import { Container } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

export function EditVisitPage() {
  const { id } = useParams();

  return (
    <Container>
      <h1>Edit Visit</h1>
      <p>Editing visit: {id}</p>
      <p>Visit edit form - Coming soon in Phase 4.5</p>
    </Container>
  );
}

export default EditVisitPage;
