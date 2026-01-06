/**
 * Edit User Page
 * Form to edit an existing user
 */

import { Container } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

export function EditUserPage() {
  const { id } = useParams();

  return (
    <Container>
      <h1>Edit User</h1>
      <p>Editing user: {id}</p>
      <p>User edit form - Coming soon in Phase 4.7</p>
    </Container>
  );
}

export default EditUserPage;
