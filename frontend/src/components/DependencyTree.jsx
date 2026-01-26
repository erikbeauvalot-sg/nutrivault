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
// Inline styles to replace styled-jsx
const styles = {
  treeNode: {
    position: 'relative',
    padding: '8px 0'
  },
  rootNode: {
    position: 'relative',
    padding: '8px 0',
    borderBottom: '2px solid #e9ecef',
    paddingBottom: '12px'
  },
  dependencyNode: {
    position: 'relative',
    padding: '8px 0',
    paddingLeft: '8px'
  },
  treeConnector: {
    color: '#6c757d',
    fontWeight: 'bold'
  },
  treeConnectorLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '2px',
    background: '#dee2e6'
  },
  treeChildren: {
    position: 'relative'
  },
  code: {
    background: '#f8f9fa',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '0.9em'
  }
};

const DependencyTree = ({ fieldName = '', formula = '', dependencies }) => {
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
          <div style={styles.rootNode} className="mb-3">
            <div className="d-flex align-items-center">
              <span className="badge bg-success me-2">Calculated</span>
              <strong>{fieldName || 'This Field'}</strong>
            </div>
            {formula && (
              <div className="ms-4 text-muted small mt-1">
                <code style={styles.code}>{formula}</code>
              </div>
            )}
          </div>

          {/* Dependencies */}
          <div style={styles.treeChildren} className="ms-4">
            <div style={styles.treeConnectorLine}></div>
            {dependencies.map((dep, index) => (
              <div key={index} style={styles.dependencyNode} className="mb-2">
                <div className="d-flex align-items-center">
                  <span style={styles.treeConnector} className="me-2">└─</span>
                  <span className="badge bg-info me-2">Depends on</span>
                  <code style={styles.code} className="text-primary">{dep}</code>
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
    </Card>
  );
};

DependencyTree.propTypes = {
  fieldName: PropTypes.string,
  formula: PropTypes.string,
  dependencies: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default DependencyTree;
