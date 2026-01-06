/**
 * Patient Details Page
 * Displays detailed information about a specific patient
 */

import { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Pencil, Trash, ClipboardHeart } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import patientService from '../../services/patientService';

export function PatientDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadPatient();
  }, [id]);

  useEffect(() => {
    // Check for success message from navigation state
    if (location.state?.message) {
      toast.success(location.state.message);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await patientService.getPatient(id);
      setPatient(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await patientService.deletePatient(id);
      navigate('/patients', {
        state: { message: 'Patient deleted successfully', variant: 'success' }
      });
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatGender = (gender) => {
    if (!gender) return '-';
    const genderMap = {
      male: 'Male',
      female: 'Female',
      other: 'Other',
      prefer_not_to_say: 'Prefer not to say'
    };
    return genderMap[gender] || gender;
  };

  if (loading) {
    return (
      <Container>
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (error && !patient) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
        <Button variant="secondary" onClick={() => navigate('/patients')}>
          Back to Patient List
        </Button>
      </Container>
    );
  }

  return (
    <Container>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
          {error}
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Patient Details</h1>
        <div className="d-flex gap-2">
          <Button
            as={Link}
            to={`/patients/${id}/visits`}
            variant="outline-primary"
          >
            <ClipboardHeart size={18} className="me-2" />
            Visit History
          </Button>
          <Button
            as={Link}
            to={`/patients/${id}/edit`}
            variant="primary"
          >
            <Pencil size={18} className="me-2" />
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash size={18} className="me-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Basic Information</h4>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <dl className="row">
                <dt className="col-sm-4">Name:</dt>
                <dd className="col-sm-8">{patient.firstName} {patient.lastName}</dd>

                <dt className="col-sm-4">Email:</dt>
                <dd className="col-sm-8">{patient.email || '-'}</dd>

                <dt className="col-sm-4">Phone:</dt>
                <dd className="col-sm-8">{patient.phone || '-'}</dd>
              </dl>
            </Col>
            <Col md={6}>
              <dl className="row">
                <dt className="col-sm-4">Date of Birth:</dt>
                <dd className="col-sm-8">{formatDate(patient.dateOfBirth)}</dd>

                <dt className="col-sm-4">Gender:</dt>
                <dd className="col-sm-8">{formatGender(patient.gender)}</dd>

                <dt className="col-sm-4">Created:</dt>
                <dd className="col-sm-8">{formatDate(patient.createdAt)}</dd>
              </dl>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Address Information */}
      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Address Information</h4>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={12}>
              <dl className="row">
                <dt className="col-sm-2">Address:</dt>
                <dd className="col-sm-10">{patient.address || '-'}</dd>

                <dt className="col-sm-2">City:</dt>
                <dd className="col-sm-10">{patient.city || '-'}</dd>

                <dt className="col-sm-2">State:</dt>
                <dd className="col-sm-10">{patient.state || '-'}</dd>

                <dt className="col-sm-2">ZIP Code:</dt>
                <dd className="col-sm-10">{patient.zipCode || '-'}</dd>
              </dl>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Emergency Contact */}
      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Emergency Contact</h4>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <dl className="row">
                <dt className="col-sm-4">Name:</dt>
                <dd className="col-sm-8">{patient.emergencyContactName || '-'}</dd>
              </dl>
            </Col>
            <Col md={6}>
              <dl className="row">
                <dt className="col-sm-4">Phone:</dt>
                <dd className="col-sm-8">{patient.emergencyContactPhone || '-'}</dd>
              </dl>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Medical Information */}
      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Medical Information</h4>
        </Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col md={12}>
              <h6>Medical History</h6>
              <p className="text-muted">{patient.medicalHistory || 'None recorded'}</p>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col md={6}>
              <h6>Allergies</h6>
              <p className="text-muted">{patient.allergies || 'None recorded'}</p>
            </Col>
            <Col md={6}>
              <h6>Current Medications</h6>
              <p className="text-muted">{patient.currentMedications || 'None recorded'}</p>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <h6>Dietary Restrictions</h6>
              <p className="text-muted">{patient.dietaryRestrictions || 'None recorded'}</p>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Additional Notes */}
      {patient.notes && (
        <Card className="mb-4">
          <Card.Header>
            <h4 className="mb-0">Additional Notes</h4>
          </Card.Header>
          <Card.Body>
            <p className="mb-0">{patient.notes}</p>
          </Card.Body>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete patient <strong>{patient.firstName} {patient.lastName}</strong>?
          This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Patient'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default PatientDetailsPage;
