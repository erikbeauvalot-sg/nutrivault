/**
 * User Details Page
 * Displays detailed information about a specific user
 */

import { Container } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

export function UserDetailsPage() {
  const { id } = useParams();

  return (
    <Container>
      <h1>User Details</h1>
      <p>Viewing user: {id}</p>
      <p>User details page - Coming soon in Phase 4.7</p>
    </Container>
  );
}

export default UserDetailsPage;
