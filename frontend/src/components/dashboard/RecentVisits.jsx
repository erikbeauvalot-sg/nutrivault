import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import PropTypes from 'prop-types';

/**
 * RecentVisits Component
 * Displays the 5 most recent visits in a table
 * Uses AdminLTE card styling
 */
function RecentVisits({ visits, loading }) {
  const getStatusBadge = (status) => {
    const variants = {
      scheduled: 'badge-primary',
      completed: 'badge-success',
      cancelled: 'badge-danger',
      'no-show': 'badge-warning'
    };
    return <span className={`badge ${variants[status] || 'badge-secondary'}`}>{status}</span>;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Recent Visits</h3>
      </div>
      <div className="card-body p-0">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-muted" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <div className="mt-2 text-muted">Loading visits...</div>
          </div>
        ) : visits && visits.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
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
            </table>
          </div>
        ) : (
          <div className="text-center text-muted py-4">
            No recent visits found
          </div>
        )}
      </div>
      {!loading && visits && visits.length > 0 && (
        <div className="card-footer text-center">
          <Link to="/visits" className="text-decoration-none">
            View All Visits →
          </Link>
        </div>
      )}
    </div>
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
