import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { exportPatients, exportVisits, exportBilling, downloadBlob, generateFilename } from '../services/exportService';

/**
 * ExportModal Component
 * Modal for selecting export format and downloading data
 */
const ExportModal = ({ show, onHide, dataType }) => {
  const { t } = useTranslation();
  const [format, setFormat] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get data type label for display
  const getDataTypeLabel = () => {
    switch (dataType) {
      case 'patients':
        return t('patients.title', 'Patients');
      case 'visits':
        return t('visits.title', 'Visits');
      case 'billing':
        return t('billing.title', 'Billing');
      default:
        return dataType;
    }
  };

  // Handle export
  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      let response;

      // Call appropriate export function based on data type
      switch (dataType) {
        case 'patients':
          response = await exportPatients(format);
          break;
        case 'visits':
          response = await exportVisits(format);
          break;
        case 'billing':
          response = await exportBilling(format);
          break;
        default:
          throw new Error('Invalid data type');
      }

      // Create blob and download
      const blob = new Blob([response.data], {
        type: response.headers['content-type']
      });

      const filename = generateFilename(dataType, format);
      downloadBlob(blob, filename);

      // Close modal on success
      onHide();

    } catch (err) {
      console.error('Export error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        t('common.exportError', 'Failed to export data')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {t('common.export', 'Export')} {getDataTypeLabel()}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form.Group className="mb-3">
          <Form.Label>{t('common.format', 'Format')}</Form.Label>
          <Form.Select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={loading}
          >
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="pdf">PDF</option>
          </Form.Select>
          <Form.Text className="text-muted">
            {t('common.exportFormatHelp', 'Choose the format for your exported data')}
          </Form.Text>
        </Form.Group>

        <div className="mb-3">
          <strong>{t('common.dataType', 'Data Type')}:</strong> {getDataTypeLabel()}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={onHide}
          disabled={loading}
        >
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              {t('common.exporting', 'Exporting...')}
            </>
          ) : (
            <>
              <i className="bi bi-download me-2"></i>
              {t('common.export', 'Export')}
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ExportModal;