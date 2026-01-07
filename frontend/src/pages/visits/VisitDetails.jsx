import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
  Badge,
  Modal,
  Table,
} from 'react-bootstrap';
import {
  Calendar2,
  PersonFill,
  PencilSquare,
  Trash,
  ClipboardCheck,
  XCircle,
  ArrowLeft,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { getVisit, deleteVisit, updateVisitStatus } from '../../services/visitService';
import { format } from 'date-fns';

const VisitDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchVisit();
  }, [id]);

  useEffect(() => {
    // Show toast if navigated from another page with a message
    if (location.state?.message) {
      toast.success(location.state.message);
      // Clear the state to avoid showing the message again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const fetchVisit = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getVisit(id);
      setVisit(response.data);
    } catch (err) {
      console.error('Error fetching visit:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await deleteVisit(id);
      toast.success('Visit deleted successfully!');
      navigate('/visits');
    } catch (err) {
      console.error('Error deleting visit:', err);
      toast.error(err.message || 'Failed to delete visit');
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleStatusChange = async () => {
    try {
      setActionLoading(true);
      await updateVisitStatus(id, newStatus);
      toast.success(`Visit status changed to ${newStatus}`);
      setShowStatusModal(false);
      fetchVisit(); // Refresh visit data
    } catch (err) {
      console.error('Error updating visit status:', err);
      toast.error(err.message || 'Failed to update visit status');
    } finally {
      setActionLoading(false);
    }
  };

  const openStatusModal = (status) => {
    setNewStatus(status);
    setShowStatusModal(true);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      Scheduled: 'primary',
      Completed: 'success',
      Cancelled: 'danger',
      'In Progress': 'warning',
    };
    return <Badge bg={statusMap[status] || 'secondary'}>{status}</Badge>;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM dd, yyyy h:mm a');
    } catch (err) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading visit details...</p>
        </div>
      </Container>
    );
  }

  if (error || !visit) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Visit</Alert.Heading>
          <p>{error || 'Visit not found'}</p>
          <Button variant="outline-danger" onClick={() => navigate('/visits')}>
            Back to Visits
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button
                variant="link"
                className="ps-0"
                onClick={() => navigate('/visits')}
              >
                <ArrowLeft className="me-2" />
                Back to Visits
              </Button>
              <h2>
                <Calendar2 className="me-2" />
                Visit Details
              </h2>
            </div>
            <div className="d-flex gap-2">
              {visit.status !== 'Completed' && visit.status !== 'Cancelled' && (
                <Link to={`/visits/${id}/edit`}>
                  <Button variant="warning">
                    <PencilSquare className="me-2" />
                    Edit
                  </Button>
                </Link>
              )}
              <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                <Trash className="me-2" />
                Delete
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Visit Information */}
      <Row className="mb-4">
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Visit Information</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col sm={4}>
                  <strong>Patient:</strong>
                </Col>
                <Col sm={8}>
                  <Link to={`/patients/${visit.patientId}`}>
                    <PersonFill className="me-2" />
                    {visit.Patient?.firstName} {visit.Patient?.lastName}
                  </Link>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col sm={4}>
                  <strong>Visit Date & Time:</strong>
                </Col>
                <Col sm={8}>{formatDateTime(visit.visitDate)}</Col>
              </Row>

              <Row className="mb-3">
                <Col sm={4}>
                  <strong>Visit Type:</strong>
                </Col>
                <Col sm={8}>{visit.visitType}</Col>
              </Row>

              <Row className="mb-3">
                <Col sm={4}>
                  <strong>Status:</strong>
                </Col>
                <Col sm={8}>{getStatusBadge(visit.status)}</Col>
              </Row>

              <Row className="mb-3">
                <Col sm={4}>
                  <strong>Dietitian:</strong>
                </Col>
                <Col sm={8}>
                  {visit.User?.firstName} {visit.User?.lastName}
                </Col>
              </Row>

              {visit.notes && (
                <Row className="mb-3">
                  <Col sm={4}>
                    <strong>Notes:</strong>
                  </Col>
                  <Col sm={8}>
                    <div className="bg-light p-3 rounded">{visit.notes}</div>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>

          {/* Measurements */}
          <Card>
            <Card.Header>
              <h5 className="mb-0">Measurements</h5>
            </Card.Header>
            <Card.Body>
              {!visit.VisitMeasurements || visit.VisitMeasurements.length === 0 ? (
                <p className="text-muted">No measurements recorded for this visit.</p>
              ) : (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Measurement Type</th>
                      <th>Value</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visit.VisitMeasurements.map((measurement) => (
                      <tr key={measurement.id}>
                        <td className="text-capitalize">
                          {measurement.measurementType.replace(/_/g, ' ')}
                        </td>
                        <td>{measurement.value}</td>
                        <td>{measurement.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Actions Sidebar */}
        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                {visit.status === 'Scheduled' && (
                  <>
                    <Button
                      variant="warning"
                      onClick={() => openStatusModal('In Progress')}
                    >
                      Start Visit
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => openStatusModal('Completed')}
                    >
                      <ClipboardCheck className="me-2" />
                      Mark as Completed
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => openStatusModal('Cancelled')}
                    >
                      <XCircle className="me-2" />
                      Cancel Visit
                    </Button>
                  </>
                )}

                {visit.status === 'In Progress' && (
                  <>
                    <Button
                      variant="success"
                      onClick={() => openStatusModal('Completed')}
                    >
                      <ClipboardCheck className="me-2" />
                      Mark as Completed
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => openStatusModal('Cancelled')}
                    >
                      <XCircle className="me-2" />
                      Cancel Visit
                    </Button>
                  </>
                )}

                {(visit.status === 'Completed' || visit.status === 'Cancelled') && (
                  <Alert variant="info" className="mb-0">
                    This visit is {visit.status.toLowerCase()} and cannot be modified.
                  </Alert>
                )}

                <hr />
                
                <Link to={`/patients/${visit.patientId}/visits`}>
                  <Button variant="outline-primary" className="w-100">
                    View Patient Visit History
                  </Button>
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this visit? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
            {actionLoading ? 'Deleting...' : 'Delete Visit'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Status Change Confirmation Modal */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Status Change</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to change the visit status to <strong>{newStatus}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleStatusChange} disabled={actionLoading}>
            {actionLoading ? 'Updating...' : 'Confirm'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default VisitDetails;

