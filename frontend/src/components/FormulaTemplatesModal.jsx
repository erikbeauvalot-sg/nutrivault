/**
 * FormulaTemplatesModal Component
 *
 * Browse and apply pre-built formula templates for common calculations.
 * Templates include BMI, Weight Change, BSA, MAP, and more.
 *
 * Sprint 4: US-5.4.2 - Calculated Measures
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, ListGroup, Badge, Alert, Spinner } from 'react-bootstrap';
import { getMeasureTemplates } from '../services/measureService';

function FormulaTemplatesModal({ show, onHide, onApply }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch templates when modal opens
  useEffect(() => {
    if (show) {
      fetchTemplates();
      setSelectedTemplate(null);
    }
  }, [show]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMeasureTemplates();
      setTemplates(data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (selectedTemplate) {
      onApply(selectedTemplate);
      onHide();
    }
  };

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {});

  const categoryNames = {
    anthropometric: 'Anthropometric',
    vitals: 'Vital Signs',
    trends: 'Trends & Changes',
    lab_results: 'Lab Results',
    other: 'Other'
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" fullscreen="md-down" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Formula Templates</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading templates...</span>
            </Spinner>
            <p className="text-muted mt-2">Loading templates...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">
            <strong>Error:</strong> {error}
            <div className="mt-2">
              <Button size="sm" variant="outline-danger" onClick={fetchTemplates}>
                Retry
              </Button>
            </div>
          </Alert>
        ) : templates.length === 0 ? (
          <Alert variant="info">No templates available.</Alert>
        ) : (
          <>
            <p className="text-muted mb-3">
              Select a template to quickly apply a pre-built formula. You can modify it after applying.
            </p>

            {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category} className="mb-4">
                <h6 className="text-muted text-uppercase small mb-2">
                  {categoryNames[category] || category}
                </h6>
                <ListGroup>
                  {categoryTemplates.map(template => (
                    <ListGroup.Item
                      key={template.id}
                      action
                      active={selectedTemplate?.id === template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className="cursor-pointer"
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{template.name}</h6>
                          {template.description && (
                            <p className="mb-2 text-muted small">{template.description}</p>
                          )}
                          <code className="small d-block bg-light p-2 rounded">
                            {template.formula}
                          </code>
                          <div className="mt-2">
                            <Badge bg="secondary" className="me-1">
                              {template.dependencies?.join(', ')}
                            </Badge>
                            {template.unit && (
                              <Badge bg="info" className="me-1">
                                Unit: {template.unit}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            ))}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleApply}
          disabled={!selectedTemplate}
        >
          Apply Template
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default FormulaTemplatesModal;
