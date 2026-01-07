import { Card, Table, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import PropTypes from 'prop-types';

/**
 * RecentInvoices Component
 * Displays the 5 most recent invoices with status badges
 */
function RecentInvoices({ invoices, loading }) {
  const getStatusBadge = (status) => {
    const variants = {
      paid: 'success',
      pending: 'warning',
      overdue: 'danger',
      cancelled: 'secondary',
      partial: 'info'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="bg-white">
        <h5 className="mb-0">Recent Invoices</h5>
      </Card.Header>
      <Card.Body className="p-0">
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <div className="mt-2 text-muted">Loading invoices...</div>
          </div>
        ) : invoices && invoices.length > 0 ? (
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Invoice #</th>
                <th>Patient</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <Link to={`/billing/${invoice.id}`} className="text-decoration-none">
                      {invoice.invoice_number}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/patients/${invoice.patient_id}`} className="text-decoration-none">
                      {invoice.Patient?.first_name} {invoice.Patient?.last_name}
                    </Link>
                  </td>
                  <td className="fw-bold">{formatCurrency(invoice.total_amount)}</td>
                  <td>{getStatusBadge(invoice.status)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="text-center text-muted py-4">
            No recent invoices found
          </div>
        )}
      </Card.Body>
      {!loading && invoices && invoices.length > 0 && (
        <Card.Footer className="bg-white text-center">
          <Link to="/billing" className="text-decoration-none">
            View All Invoices →
          </Link>
        </Card.Footer>
      )}
    </Card>
  );
}

RecentInvoices.propTypes = {
  invoices: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      invoice_number: PropTypes.string.isRequired,
      total_amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
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

export default RecentInvoices;
