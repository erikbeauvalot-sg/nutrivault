import { Card, Table, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import PropTypes from 'prop-types';

/**
 * RecentVisits Component
 * Displays the 5 most recent visits in a table
 */
function RecentVisits({ visits, loading }) {
  const getStatusBadge = (status) => {
    const variants = {
      scheduled: 'primary',
      completed: 'success',
      cancelled: 'danger',
      'no-show': 'warning'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="bg-white">
        <h5 className="mb-0">Recent Visits</h5>
      </Card.Header>
      <Card.Body className="p-0">
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <div className="mt-2 text-muted">Loading visits...</div>
          </div>
        ) : visits && visits.length > 0 ? (
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.id}>
                  <td>
                    <Link to={`/visits/${visit.id}`} className="text-decoration-none">
                      {format(new Date(visit.visit_date), 'MMM dd, yyyy')}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/patients/${visit.patient_id}`} className="text-decoration-none">
                      {visit.Patient?.first_name} {visit.Patient?.last_name}
                    </Link>
                  </td>
                  <td className="text-capitalize">{visit.visit_type?.replace('_', ' ')}</td>
                  <td>{getStatusBadge(visit.status)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="text-center text-muted py-4">
            No recent visits found
          </div>
        )}
      </Card.Body>
      {!loading && visits && visits.length > 0 && (
        <Card.Footer className="bg-white text-center">
          <Link to="/visits" className="text-decoration-none">
            View All Visits →
          </Link>
        </Card.Footer>
      )}
    </Card>
  );
}

RecentVisits.propTypes = {
  visits: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      visit_date: PropTypes.string.isRequired,
      visit_type: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      patient_id: PropTypes.number.isRequired,
      Patient: PropTypes.shape({
        first_name: PropTypes.string,
        last_name: PropTypes.string
      })
    })
  ),
  loading: PropTypes.bool
};

export default RecentVisits;
