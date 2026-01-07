/**
 * InvoiceForm Component
 * Reusable form for creating/editing invoices with line items
 */

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Form, Button, Row, Col, Table, Card } from 'react-bootstrap';
import { Plus, Trash } from 'react-bootstrap-icons';

// Validation schema
const invoiceSchema = yup.object().shape({
  patient_id: yup.string().required('Patient is required'),
  visit_id: yup.string(),
  due_date: yup.date().required('Due date is required').min(new Date(), 'Due date cannot be in the past'),
  items: yup.array().of(
    yup.object().shape({
      description: yup.string().required('Description is required'),
      amount: yup.number().positive('Amount must be positive').required('Amount is required')
    })
  ).min(1, 'At least one item is required'),
  tax_rate: yup.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%'),
  notes: yup.string().max(1000, 'Notes cannot exceed 1000 characters')
});

export function InvoiceForm({ initialData, patients = [], visits = [], onSubmit, onCancel, isLoading = false }) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(invoiceSchema),
    defaultValues: initialData || {
      patient_id: '',
      visit_id: '',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      items: [{ description: '', amount: 0 }],
      tax_rate: 0,
      notes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  // Watch fields for calculations
  const items = watch('items');
  const taxRate = watch('tax_rate') || 0;

  // Calculate totals
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * taxRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleFormSubmit = (data) => {
    // Calculate and add totals to submission data
    const submissionData = {
      ...data,
      subtotal: calculateSubtotal(),
      tax_amount: calculateTax(),
      total_amount: calculateTotal()
    };
    onSubmit(submissionData);
  };

  return (
    <Form onSubmit={handleSubmit(handleFormSubmit)}>
      {/* Patient and Visit Selection */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              Patient <span className="text-danger">*</span>
            </Form.Label>
            <Form.Select
              {...register('patient_id')}
              isInvalid={!!errors.patient_id}
              disabled={isLoading}
            >
              <option value="">Select a patient...</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name || `${patient.first_name} ${patient.last_name}`}
                </option>
              ))}
            </Form.Select>
            {errors.patient_id && (
              <Form.Control.Feedback type="invalid">
                {errors.patient_id.message}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Related Visit (Optional)</Form.Label>
            <Form.Select
              {...register('visit_id')}
              disabled={isLoading}
            >
              <option value="">No related visit</option>
              {visits.map((visit) => (
                <option key={visit.id} value={visit.id}>
                  {visit.visit_type} - {new Date(visit.visit_date).toLocaleDateString()}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {/* Due Date */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              Due Date <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="date"
              {...register('due_date')}
              isInvalid={!!errors.due_date}
              disabled={isLoading}
            />
            {errors.due_date && (
              <Form.Control.Feedback type="invalid">
                {errors.due_date.message}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Tax Rate (%)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('tax_rate')}
              isInvalid={!!errors.tax_rate}
              disabled={isLoading}
            />
            {errors.tax_rate && (
              <Form.Control.Feedback type="invalid">
                {errors.tax_rate.message}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        </Col>
      </Row>

      {/* Line Items */}
      <Card className="mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Invoice Items</h5>
          <Button
            variant="success"
            size="sm"
            onClick={() => append({ description: '', amount: 0 })}
            disabled={isLoading}
          >
            <Plus size={16} className="me-1" />
            Add Item
          </Button>
        </Card.Header>
        <Card.Body>
          {errors.items && typeof errors.items.message === 'string' && (
            <div className="text-danger mb-2">{errors.items.message}</div>
          )}
          <Table responsive>
            <thead>
              <tr>
                <th style={{ width: '60%' }}>Description</th>
                <th style={{ width: '30%' }}>Amount</th>
                <th style={{ width: '10%' }}></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td>
                    <Form.Control
                      type="text"
                      placeholder="Service description..."
                      {...register(`items.${index}.description`)}
                      isInvalid={!!errors.items?.[index]?.description}
                      disabled={isLoading}
                    />
                    {errors.items?.[index]?.description && (
                      <Form.Control.Feedback type="invalid">
                        {errors.items[index].description.message}
                      </Form.Control.Feedback>
                    )}
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register(`items.${index}.amount`)}
                      isInvalid={!!errors.items?.[index]?.amount}
                      disabled={isLoading}
                    />
                    {errors.items?.[index]?.amount && (
                      <Form.Control.Feedback type="invalid">
                        {errors.items[index].amount.message}
                      </Form.Control.Feedback>
                    )}
                  </td>
                  <td className="text-center">
                    {fields.length > 1 && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={isLoading}
                      >
                        <Trash size={16} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Totals */}
          <div className="d-flex justify-content-end">
            <div style={{ minWidth: '300px' }}>
              <div className="d-flex justify-content-between mb-2">
                <strong>Subtotal:</strong>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <strong>Tax ({taxRate}%):</strong>
                <span>{formatCurrency(calculateTax())}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <strong className="fs-5">Total:</strong>
                <strong className="fs-5">{formatCurrency(calculateTotal())}</strong>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Notes */}
      <Form.Group className="mb-3">
        <Form.Label>Notes (Optional)</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          placeholder="Add any additional notes..."
          {...register('notes')}
          isInvalid={!!errors.notes}
          disabled={isLoading}
        />
        {errors.notes && (
          <Form.Control.Feedback type="invalid">
            {errors.notes.message}
          </Form.Control.Feedback>
        )}
      </Form.Group>

      {/* Action Buttons */}
      <div className="d-flex justify-content-end gap-2">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Invoice'}
        </Button>
      </div>
    </Form>
  );
}

export default InvoiceForm;
