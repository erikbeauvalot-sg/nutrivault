/**
 * FormulaValidator Component
 *
 * Provides real-time validation feedback for formulas with debouncing.
 * Shows validation status and dependencies.
 *
 * Sprint 4: US-5.4.2 - Calculated Measures
 */

import React, { useState, useEffect } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { validateFormula } from '../services/measureService';

function FormulaValidator({ formula }) {
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!formula || formula.trim() === '') {
      setValidation(null);
      return;
    }

    // Debounce validation requests
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await validateFormula(formula);
        setValidation(result);
      } catch (error) {
        setValidation({
          valid: false,
          error: error.response?.data?.error || error.message || 'Validation failed',
          dependencies: []
        });
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [formula]);

  if (loading) {
    return (
      <div className="mt-2">
        <Spinner animation="border" size="sm" className="me-2" />
        <span className="small text-muted">Validating formula...</span>
      </div>
    );
  }

  if (!validation) return null;

  return (
    <Alert
      variant={validation.valid ? 'success' : 'danger'}
      className="mt-2 small mb-0"
    >
      {validation.valid ? (
        <div>
          <strong>✓ Formula is valid</strong>
          {validation.dependencies && validation.dependencies.length > 0 && (
            <div className="mt-1">
              <small className="text-muted">
                Dependencies: {validation.dependencies.join(', ')}
              </small>
            </div>
          )}
        </div>
      ) : (
        <div>
          <strong>✗ Invalid formula</strong>
          <div className="mt-1">{validation.error}</div>
        </div>
      )}
    </Alert>
  );
}

export default FormulaValidator;
