/**
 * FormulaPreviewModal Component
 *
 * Allows testing formulas with sample values before saving.
 * Provides input fields for each dependency and displays calculation result.
 *
 * Sprint 4: US-5.4.2 - Calculated Measures
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { previewFormula } from '../services/measureService';

function FormulaPreviewModal({ show, onHide, formula, dependencies }) {
  const [sampleValues, setSampleValues] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize sample values when dependencies change
  useEffect(() => {
    if (dependencies && dependencies.length > 0) {
      const initialValues = {};
      dependencies.forEach(dep => {
        initialValues[dep] = '';
      });
      setSampleValues(initialValues);
    }
  }, [dependencies]);

  // Reset result when modal is closed
  useEffect(() => {
    if (!show) {
      setResult(null);
    }
  }, [show]);

  const handleValueChange = (dep, value) => {
    setSampleValues(prev => ({
      ...prev,
      [dep]: value
    }));
  };

  const handlePreview = async () => {
    // Convert string values to numbers
    const numericValues = {};
    Object.keys(sampleValues).forEach(key => {
      const value = parseFloat(sampleValues[key]);
      numericValues[key] = isNaN(value) ? null : value;
    });

    setLoading(true);
    try {
      const response = await previewFormula(formula, numericValues);
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        error: error.response?.data?.error || error.message || 'Preview failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const canCalculate = () => {
    return dependencies && dependencies.every(dep => {
      const value = sampleValues[dep];
      return value !== '' && value !== null && value !== undefined;
    });
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Preview Formula Calculation</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Formula display */}
        <div className="mb-3">
          <strong>Formula:</strong>
          <div className="font-monospace bg-light p-2 rounded mt-1">
            {formula || '(No formula provided)'}
          </div>
        </div>

        {/* Sample value inputs */}
        {dependencies && dependencies.length > 0 ? (
          <>
            <p className="text-muted mb-2">Enter sample values to test the formula:</p>
            {dependencies.map(dep => (
              <Form.Group key={dep} className="mb-3">
                <Form.Label>{dep}</Form.Label>
                <Form.Control
                  type="number"
                  step="any"
                  value={sampleValues[dep] || ''}
                  onChange={(e) => handleValueChange(dep, e.target.value)}
                  placeholder={`Enter value for ${dep}`}
                />
              </Form.Group>
            ))}

            {/* Calculate button */}
            <Button
              variant="primary"
              onClick={handlePreview}
              disabled={!canCalculate() || loading}
              className="w-100"
            >
              {loading ? 'Calculating...' : 'Calculate'}
            </Button>

            {/* Result display */}
            {result && (
              <Alert
                variant={result.success ? 'success' : 'danger'}
                className="mt-3 mb-0"
              >
                {result.success ? (
                  <div>
                    <strong>Result:</strong>
                    <div className="h4 mb-0 mt-2">{result.result}</div>
                  </div>
                ) : (
                  <div>
                    <strong>Error:</strong>
                    <div className="mt-1">{result.error}</div>
                  </div>
                )}
              </Alert>
            )}
          </>
        ) : (
          <Alert variant="warning">
            No dependencies detected. Please enter a valid formula first.
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default FormulaPreviewModal;
