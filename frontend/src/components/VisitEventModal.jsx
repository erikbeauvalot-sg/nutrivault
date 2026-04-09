/**
 * VisitEventModal Component
 * Modal to display visit event details from calendar
 */

import { useState } from 'react';
import { Modal, Badge, Button, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import ConfirmModal from './ConfirmModal';

const VisitEventModal = ({ show, onHide, event, onDelete }) => {
  const { t, i18n } = useTranslation();
  const dateFnsLocale = i18n.language?.startsWith('fr') ? fr : enUS;
  const navigate = useNavigate();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!event) return null;

  const { resource } = event;

  const getStatusBadge = (status) => {
    const variants = {
      SCHEDULED: 'info',
      COMPLETED: 'success',
      CANCELLED: 'secondary',
      NO_SHOW: 'danger'
    };
    const statusText = {
      SCHEDULED: t('visits.scheduled'),
      COMPLETED: t('visits.completed'),
      CANCELLED: t('visits.cancelled'),
      NO_SHOW: t('visits.noShow')
    };
    return <Badge bg={variants[status] || 'secondary'}>{statusText[status] || status}</Badge>;
  };

  const getVisitTypeLabel = (type) => {
    const types = {
      INITIAL_CONSULTATION: t('visits.initialConsultation'),
      FOLLOW_UP: t('visits.followUp'),
      FINAL_ASSESSMENT: t('visits.finalAssessment'),
      NUTRITION_COUNSELING: t('visits.nutritionCounseling'),
      OTHER: t('visits.other')
    };
    return types[type] || type;
  };

  const formatDateTime = (date) => {
    return format(new Date(date), 'PPP HH:mm', { locale: dateFnsLocale });
  };

  const handleViewDetails = () => {
    navigate(`/visits/${resource.visitId}`);
    onHide();
  };

  const handleEdit = () => {
    navigate(`/visits/${resource.visitId}/edit`);
    onHide();
  };

  const handleConfirmDelete = () => {
    setShowConfirmDelete(false);
    onHide();
    if (onDelete) onDelete(resource.visitId);
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>{t('agenda.eventDetails')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <Col xs={4} className="text-muted">
              <strong>{t('patients.patient')}:</strong>
            </Col>
            <Col xs={8}>{resource?.patientName || t('common.na')}</Col>
          </Row>

          <Row className="mb-3">
            <Col xs={4} className="text-muted">
              <strong>{t('visits.visitDate')}:</strong>
            </Col>
            <Col xs={8}>{formatDateTime(event.start)}</Col>
          </Row>

          <Row className="mb-3">
            <Col xs={4} className="text-muted">
              <strong>{t('agenda.duration')}:</strong>
            </Col>
            <Col xs={8}>{resource?.duration || 30} {t('visits.min')}</Col>
          </Row>

          <Row className="mb-3">
            <Col xs={4} className="text-muted">
              <strong>{t('agenda.visitType')}:</strong>
            </Col>
            <Col xs={8}>{getVisitTypeLabel(resource?.visitType)}</Col>
          </Row>

          <Row className="mb-3">
            <Col xs={4} className="text-muted">
              <strong>{t('agenda.status')}:</strong>
            </Col>
            <Col xs={8}>{getStatusBadge(resource?.status)}</Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={() => setShowConfirmDelete(true)}>
            {t('visits.deleteVisit', 'Supprimer')}
          </Button>
          <Button variant="secondary" onClick={onHide}>
            {t('common.close')}
          </Button>
          <Button variant="primary" onClick={handleEdit}>
            {t('common.edit')}
          </Button>
          <Button variant="success" onClick={handleViewDetails}>
            {t('agenda.viewFullDetails')}
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal
        show={showConfirmDelete}
        onHide={() => setShowConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title={t('visits.deleteVisit', 'Supprimer la consultation')}
        message={`${t('visits.confirmDelete')} ${t('visits.deleteWarning')}`}
        confirmLabel={t('common.delete', 'Supprimer')}
        variant="danger"
      />
    </>
  );
};

export default VisitEventModal;
