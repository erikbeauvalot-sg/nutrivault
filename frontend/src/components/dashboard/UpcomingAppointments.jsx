import { Card, Table, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import PropTypes from 'prop-types';

/**
 * UpcomingAppointments Component
 * Displays the next 5 scheduled visits
 */
function UpcomingAppointments({ appointments, loading }) {
  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="bg-white">
        <h5 className="mb-0">Upcoming Appointments</h5>
      </Card.Header>
      <Card.Body className="p-0">
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <div className="mt-2 text-muted">Loading appointments...</div>
          </div>
        ) : appointments && appointments.length > 0 ? (
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Type</th>
                <th>Time Until</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>
                    <Link to={`/visits/${appointment.id}`} className="text-decoration-none">
                      {format(new Date(appointment.visit_date), 'MMM dd, yyyy')}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/patients/${appointment.patient_id}`} className="text-decoration-none">
                      {appointment.Patient?.first_name} {appointment.Patient?.last_name}
                    </Link>
                  </td>
                  <td className="text-capitalize">
                    {appointment.visit_type?.replace('_', ' ')}
                  </td>
                  <td className="text-muted small">
                    {formatDistanceToNow(new Date(appointment.visit_date), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="text-center text-muted py-4">
            No upcoming appointments
          </div>
        )}
      </Card.Body>
      {!loading && appointments && appointments.length > 0 && (
        <Card.Footer className="bg-white text-center">
          <Link to="/visits?status=scheduled" className="text-decoration-none">
            View All Appointments →
          </Link>
        </Card.Footer>
      )}
    </Card>
  );
}

UpcomingAppointments.propTypes = {
  appointments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      visit_date: PropTypes.string.isRequired,
      visit_type: PropTypes.string.isRequired,
      patient_id: PropTypes.number.isRequired,
      Patient: PropTypes.shape({
        first_name: PropTypes.string,
        last_name: PropTypes.string
      })
    })
  ),
  loading: PropTypes.bool
};

export default UpcomingAppointments;
