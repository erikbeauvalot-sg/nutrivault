/**
 * BillingTemplateModal Component
 * Modal for creating and editing billing templates
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Card,
  InputGroup,
  Alert,
  Spinner
} from 'react-bootstrap';
import { FaPlus, FaTrash, FaGripVertical } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import billingTemplateService from '../services/billingTemplateService';

const BillingTemplateModal = ({ show, onHide, onSave, mode, template }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState([]);

  // Initialize form when template changes
  useEffect(() => {
    if (mode === 'edit' && template) {
      setName(template.name || '');
      setDescription(template.description || '');
      setIsDefault(template.is_default || false);
      setIsActive(template.is_active !== undefined ? template.is_active : true);
      setItems(
        template.items?.map((item) => ({
          id: item.id || uuidv4(),
          item_name: item.item_name || '',
          description: item.description || '',
          quantity: item.quantity || 1.00,
          unit_price: item.unit_price || 0,
          sort_order: item.sort_order || 0
        })) || []
      );
    } else {
      // Reset form for create mode
      setName('');
      setDescription('');
      setIsDefault(false);
      setIsActive(true);
      setItems([{
        id: uuidv4(),
        item_name: '',
        description: '',
        quantity: 1.00,
        unit_price: 0,
        sort_order: 1
      }]);
    }
    setError(null);
  }, [mode, template, show]);

  /**
   * Add new item
   */
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: uuidv4(),
        item_name: '',
        description: '',
        quantity: 1.00,
        unit_price: 0,
        sort_order: items.length + 1
      }
    ]);
  };

  /**
   * Remove item
   */
  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      alert('Template must have at least one item');
      return;
    }

    const newItems = items.filter((_, i) => i !== index);
    // Update sort order
    newItems.forEach((item, i) => {
      item.sort_order = i + 1;
    });
    setItems(newItems);
  };

  /**
   * Update item field
   */
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  /**
   * Move item up
   */
  const handleMoveUp = (index) => {
    if (index === 0) return;

    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];

    // Update sort order
    newItems.forEach((item, i) => {
      item.sort_order = i + 1;
    });

    setItems(newItems);
  };

  /**
   * Move item down
   */
  const handleMoveDown = (index) => {
    if (index === items.length - 1) return;

    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];

    // Update sort order
    newItems.forEach((item, i) => {
      item.sort_order = i + 1;
    });

    setItems(newItems);
  };

  /**
   * Calculate total amount
   */
  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  };

  /**
   * Validate form
   */
  const validateForm = () => {
    if (!name.trim()) {
      setError('Template name is required');
      return false;
    }

    if (items.length === 0) {
      setError('Template must have at least one item');
      return false;
    }

    for (const item of items) {
      if (!item.item_name.trim()) {
        setError('All items must have a name');
        return false;
      }

      if (parseFloat(item.unit_price) < 0) {
        setError('Item prices cannot be negative');
        return false;
      }

      if (parseFloat(item.quantity) <= 0) {
        setError('Item quantities must be greater than zero');
        return false;
      }
    }

    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const templateData = {
        name: name.trim(),
        description: description.trim(),
        is_default: isDefault,
        is_active: isActive,
        items: items.map(item => ({
          item_name: item.item_name.trim(),
          description: item.description?.trim() || '',
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          sort_order: item.sort_order
        }))
      };

      if (mode === 'edit' && template) {
        await billingTemplateService.updateTemplate(template.id, templateData);
      } else {
        await billingTemplateService.createTemplate(templateData);
      }

      onSave();
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err.response?.data?.error || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format currency
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          {mode === 'edit' ? 'Edit Billing Template' : 'Create Billing Template'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Template Info */}
          <Card className="mb-3">
            <Card.Header>Template Information</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Template Name *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., Consultation Initiale"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Brief description of this template..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Check
                    type="checkbox"
                    label="Set as default template"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                  />
                </Col>
                <Col md={6}>
                  <Form.Check
                    type="checkbox"
                    label="Active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Items */}
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Template Items</span>
              <Button variant="outline-primary" size="sm" onClick={handleAddItem}>
                <FaPlus className="me-1" />
                Add Item
              </Button>
            </Card.Header>
            <Card.Body>
              {items.map((item, index) => (
                <Card key={item.id} className="mb-3" style={{ borderLeft: '3px solid #0d6efd' }}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center">
                        <FaGripVertical className="text-muted me-2" />
                        <strong>Item {index + 1}</strong>
                      </div>
                      <div>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="me-1"
                        >
                          ↑
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === items.length - 1}
                          className="me-1"
                        >
                          ↓
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length === 1}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </div>

                    <Form.Group className="mb-2">
                      <Form.Label className="small mb-1">Item Name *</Form.Label>
                      <Form.Control
                        type="text"
                        size="sm"
                        placeholder="e.g., Consultation diététique"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-2">
                      <Form.Label className="small mb-1">Description</Form.Label>
                      <Form.Control
                        type="text"
                        size="sm"
                        placeholder="Optional details..."
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      />
                    </Form.Group>

                    <Row>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="small mb-1">Quantity</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            step="0.01"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="small mb-1">Unit Price (€)</Form.Label>
                          <InputGroup size="sm">
                            <Form.Control
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                              required
                            />
                            <InputGroup.Text>€</InputGroup.Text>
                          </InputGroup>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="small mb-1">Line Total</Form.Label>
                          <Form.Control
                            type="text"
                            size="sm"
                            value={formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                            readOnly
                            style={{ backgroundColor: '#f8f9fa' }}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))}

              {/* Total */}
              <div className="d-flex justify-content-end">
                <div className="text-end">
                  <strong>Total Amount:</strong>
                  <h4 className="mb-0 text-primary">{formatCurrency(calculateTotal())}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
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
                Saving...
              </>
            ) : (
              mode === 'edit' ? 'Update Template' : 'Create Template'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default BillingTemplateModal;
