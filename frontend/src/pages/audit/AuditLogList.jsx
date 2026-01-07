import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Collapse, Alert, Spinner, Pagination } from 'react-bootstrap';
import { format } from 'date-fns';
import { getAuditLogs, exportAuditLogs } from '../../services/auditService';
import { exportToCSV } from '../../utils/csvExport';

function AuditLogList() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 50;

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    action: '',
    resourceType: '',
    status: '',
  });

  // Action types and colors
  const actionColors = {
    CREATE: 'success',
    READ: 'secondary',
    UPDATE: 'primary',
    DELETE: 'danger',
    LOGIN: 'info',
    LOGOUT: 'info',
  };

  // Fetch audit logs
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAuditLogs(filters, currentPage, limit);
      setLogs(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, filters, currentPage]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchLogs();
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      action: '',
      resourceType: '',
      status: '',
    });
    setCurrentPage(1);
  };

  // Toggle row expansion
  const toggleRowExpansion = (logId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      const csvData = logs.map((log) => ({
        Timestamp: format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        User: log.user_email || `User ID: ${log.user_id}`,
        Action: log.action,
        'Resource Type': log.resource_type,
        'Resource ID': log.resource_id || 'N/A',
        'IP Address': log.ip_address || 'N/A',
        Status: log.status,
      }));

      exportToCSV(csvData, 'audit_logs');
    } catch (err) {
      setError('Failed to export audit logs');
    }
  };

  // Get badge variant for action
  const getActionBadge = (action) => {
    const variant = actionColors[action] || 'secondary';
    return <Badge bg={variant}>{action}</Badge>;
  };

  // Get badge variant for status
  const getStatusBadge = (status) => {
    return (
      <Badge bg={status === 'success' ? 'success' : 'danger'}>
        {status}
      </Badge>
    );
  };

  // Render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    items.push(
      <Pagination.First key="first" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
    );

    items.push(
      <Pagination.Prev key="prev" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} />
    );

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === currentPage}
          onClick={() => setCurrentPage(page)}
        >
          {page}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next key="next" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} />
    );

    items.push(
      <Pagination.Last key="last" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
    );

    return <Pagination className="justify-content-center">{items}</Pagination>;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Audit Logs</h2>
          <p className="text-muted">
            Track all system activities and user actions
          </p>
        </Col>
        <Col xs="auto">
          <Button
            variant="outline-primary"
            onClick={() => setShowFilters(!showFilters)}
            className="me-2"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button
            variant="outline-secondary"
            onClick={handleExportCSV}
            disabled={logs.length === 0}
          >
            Export CSV
          </Button>
        </Col>
      </Row>

      {/* Filters Section */}
      <Collapse in={showFilters}>
        <Card className="mb-4">
          <Card.Body>
            <Row className="g-3">
              <Col md={6} lg={3}>
                <Form.Group>
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      handleFilterChange('startDate', e.target.value)
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6} lg={3}>
                <Form.Group>
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      handleFilterChange('endDate', e.target.value)
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6} lg={2}>
                <Form.Group>
                  <Form.Label>User ID</Form.Label>
                  <Form.Control
                    type="number"
                    value={filters.userId}
                    onChange={(e) =>
                      handleFilterChange('userId', e.target.value)
                    }
                    placeholder="Enter ID"
                  />
                </Form.Group>
              </Col>
              <Col md={6} lg={2}>
                <Form.Group>
                  <Form.Label>Action</Form.Label>
                  <Form.Select
                    value={filters.action}
                    onChange={(e) =>
                      handleFilterChange('action', e.target.value)
                    }
                  >
                    <option value="">All</option>
                    <option value="CREATE">Create</option>
                    <option value="READ">Read</option>
                    <option value="UPDATE">Update</option>
                    <option value="DELETE">Delete</option>
                    <option value="LOGIN">Login</option>
                    <option value="LOGOUT">Logout</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6} lg={2}>
                <Form.Group>
                  <Form.Label>Resource Type</Form.Label>
                  <Form.Select
                    value={filters.resourceType}
                    onChange={(e) =>
                      handleFilterChange('resourceType', e.target.value)
                    }
                  >
                    <option value="">All</option>
                    <option value="user">User</option>
                    <option value="patient">Patient</option>
                    <option value="visit">Visit</option>
                    <option value="billing">Billing</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6} lg={2}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange('status', e.target.value)
                    }
                  >
                    <option value="">All</option>
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Button
                  variant="primary"
                  onClick={handleApplyFilters}
                  className="me-2"
                >
                  Apply Filters
                </Button>
                <Button variant="outline-secondary" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Collapse>

      {/* Auto-refresh Toggle */}
      <Row className="mb-3">
        <Col>
          <Form.Check
            type="switch"
            id="auto-refresh-switch"
            label="Auto-refresh every 30 seconds"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
        </Col>
        <Col xs="auto" className="text-muted">
          Total: {totalItems} logs
        </Col>
      </Row>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      {/* Audit Logs Table */}
      {!loading && (
        <Card>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '50px' }}></th>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource Type</th>
                    <th>Resource ID</th>
                    <th>IP Address</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <>
                        <tr
                          key={log.id}
                          onClick={() => toggleRowExpansion(log.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="text-center">
                            {expandedRows[log.id] ? '▼' : '▶'}
                          </td>
                          <td>
                            {format(
                              new Date(log.createdAt),
                              'yyyy-MM-dd HH:mm:ss'
                            )}
                          </td>
                          <td>{log.user_email || `User ID: ${log.user_id}`}</td>
                          <td>{getActionBadge(log.action)}</td>
                          <td>{log.resource_type}</td>
                          <td>{log.resource_id || 'N/A'}</td>
                          <td>{log.ip_address || 'N/A'}</td>
                          <td>{getStatusBadge(log.status)}</td>
                        </tr>
                        {expandedRows[log.id] && (
                          <tr>
                            <td colSpan="8" className="bg-light">
                              <div className="p-3">
                                <h6>Details</h6>
                                <Row>
                                  <Col md={6}>
                                    <p className="mb-1">
                                      <strong>Request Data:</strong>
                                    </p>
                                    <pre className="bg-white p-2 rounded border">
                                      {log.request_data
                                        ? JSON.stringify(
                                            JSON.parse(log.request_data),
                                            null,
                                            2
                                          )
                                        : 'No request data'}
                                    </pre>
                                  </Col>
                                  <Col md={6}>
                                    <p className="mb-1">
                                      <strong>Response Data:</strong>
                                    </p>
                                    <pre className="bg-white p-2 rounded border">
                                      {log.response_data
                                        ? JSON.stringify(
                                            JSON.parse(log.response_data),
                                            null,
                                            2
                                          )
                                        : 'No response data'}
                                    </pre>
                                  </Col>
                                </Row>
                                {log.error_message && (
                                  <div className="mt-2">
                                    <p className="mb-1 text-danger">
                                      <strong>Error Message:</strong>
                                    </p>
                                    <Alert variant="danger" className="mb-0">
                                      {log.error_message}
                                    </Alert>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Pagination */}
      {!loading && logs.length > 0 && (
        <div className="mt-4">
          {renderPagination()}
        </div>
      )}
    </Container>
  );
}

export default AuditLogList;
