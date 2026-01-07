/**
 * BillingList Page
 * Displays list of invoices with pagination, search, and filtering
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Table, Button, Form, Badge,
  Pagination, InputGroup, Spinner, Alert
} from 'react-bootstrap';
import { Search, Plus, Eye, CashStack } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { getInvoices } from '../../services/billingService';
import { format } from 'date-fns';

export function BillingList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  });
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // Load invoices
  useEffect(() => {
    loadInvoices();
  }, [pagination.page, filters]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getInvoices(filters, pagination.page, pagination.limit);
      setInvoices(response.invoices || response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0,
        totalPages: response.pages || response.totalPages || 0
      }));
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError(err.response?.data?.message || 'Failed to load invoices');
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getStatusBadge = (status) => {
    const variants = {
      PENDING: 'warning',
      PAID: 'success',
      OVERDUE: 'danger',
      CANCELLED: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (err) {
      return 'Invalid date';
    }
  };

  const renderPagination = () => {
    const items = [];
    const maxVisible = 5;
    const startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);

    if (pagination.page > 1) {
      items.push(
        <Pagination.Prev
          key="prev"
          onClick={() => handlePageChange(pagination.page - 1)}
        />
      );
    }

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === pagination.page}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Pagination.Item>
      );
    }

    if (pagination.page < pagination.totalPages) {
      items.push(
        <Pagination.Next
          key="next"
          onClick={() => handlePageChange(pagination.page + 1)}
        />
      );
    }

    return <Pagination>{items}</Pagination>;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <CashStack className="me-2" />
            Billing & Invoices
          </h2>
        </Col>
        <Col xs="auto">
          <Button
            variant="primary"
            onClick={() => navigate('/billing/new')}
          >
            <Plus size={20} className="me-2" />
            Create Invoice
          </Button>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <Search />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by patient name or invoice number..."
                    value={filters.search}
                    onChange={handleSearchChange}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Invoice List */}
      <Card>
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : invoices.length === 0 ? (
            <Alert variant="info">
              No invoices found. Create your first invoice to get started.
            </Alert>
          ) : (
            <>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Patient</th>
                    <th>Visit Date</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <strong>#{invoice.invoice_number || invoice.id.slice(0, 8)}</strong>
                      </td>
                      <td>{invoice.patient?.full_name || 'N/A'}</td>
                      <td>{formatDate(invoice.visit?.visit_date)}</td>
                      <td><strong>{formatCurrency(invoice.total_amount)}</strong></td>
                      <td>{formatDate(invoice.due_date)}</td>
                      <td>{getStatusBadge(invoice.status)}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => navigate(`/billing/${invoice.id}`)}
                        >
                          <Eye size={16} className="me-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* Pagination */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="text-muted">
                  Showing {invoices.length} of {pagination.total} invoices
                </div>
                {pagination.totalPages > 1 && renderPagination()}
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default BillingList;
