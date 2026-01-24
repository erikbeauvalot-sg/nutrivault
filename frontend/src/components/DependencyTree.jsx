import React from 'react';
import { Card } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * DependencyTree Component
 *
 * Visualizes the dependency tree for calculated custom fields.
 * Shows which fields a calculated field depends on in a hierarchical tree view.
 *
 * @param {Object} props - Component props
 * @param {string} props.fieldName - Name of the current field
 * @param {string} props.formula - Formula expression
 * @param {Array<string>} props.dependencies - List of field names this field depends on
 */
const DependencyTree = ({ fieldName, formula, dependencies }) => {
  if (!dependencies || dependencies.length === 0) {
    return null;
  }

  return (
    <Card className="mt-3 border-primary">
      <Card.Header className="bg-primary text-white">
        <strong>📊 Dependency Tree</strong>
      </Card.Header>
      <Card.Body>
        <div className="dependency-tree">
          {/* Root node - the calculated field */}
          <div className="tree-node root-node mb-3">
            <div className="d-flex align-items-center">
              <span className="badge bg-success me-2">Calculated</span>
              <strong>{fieldName || 'This Field'}</strong>
            </div>
            {formula && (
              <div className="ms-4 text-muted small mt-1">
                <code>{formula}</code>
              </div>
            )}
          </div>

          {/* Dependencies */}
          <div className="tree-children ms-4">
            <div className="tree-connector-line"></div>
            {dependencies.map((dep, index) => (
              <div key={index} className="tree-node dependency-node mb-2">
                <div className="d-flex align-items-center">
                  <span className="tree-connector me-2">└─</span>
                  <span className="badge bg-info me-2">Depends on</span>
                  <code className="text-primary">{dep}</code>
                </div>
              </div>
            ))}
          </div>

          {/* Info message */}
          <div className="alert alert-info mt-3 mb-0 small">
            <strong>ℹ️ Auto-recalculation:</strong> When any of the fields above change,
            this calculated field will automatically update.
          </div>
        </div>
      </Card.Body>

      <style jsx>{`
        .tree-node {
          position: relative;
          padding: 8px 0;
        }

        .root-node {
          border-bottom: 2px solid #e9ecef;
          padding-bottom: 12px;
        }

        .dependency-node {
          position: relative;
          padding-left: 8px;
        }

        .tree-connector {
          color: #6c757d;
          font-weight: bold;
        }

        .tree-connector-line {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #dee2e6;
        }

        .tree-children {
          position: relative;
        }

        code {
          background: #f8f9fa;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.9em;
        }
      `}</style>
    </Card>
  );
};

DependencyTree.propTypes = {
  fieldName: PropTypes.string,
  formula: PropTypes.string,
  dependencies: PropTypes.arrayOf(PropTypes.string).isRequired
};

DependencyTree.defaultProps = {
  fieldName: '',
  formula: ''
};

export default DependencyTree;
