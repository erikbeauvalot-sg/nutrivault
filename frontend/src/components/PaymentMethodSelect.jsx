/**
 * PaymentMethodSelect
 * A <Form.Select> populated from the admin-configurable payment methods list.
 * Falls back to built-in defaults if the API is unavailable, and always keeps
 * the current value selectable (even if it points to a deactivated/legacy code).
 */

import { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import paymentMethodService from '../services/paymentMethodService';

// Used only if the API call fails, so the form still works offline.
const FALLBACK = [
  { code: 'CASH', label: 'Espèces' },
  { code: 'CHECK', label: 'Chèque' },
  { code: 'BANK_TRANSFER', label: 'Virement bancaire' },
  { code: 'CREDIT_CARD', label: 'Carte bancaire' },
  { code: 'INSURANCE', label: 'Assurance' },
  { code: 'OTHER', label: 'Autre' }
];

const PaymentMethodSelect = ({ value, onChange, name = 'payment_method', required = false, includeBlank = false, ...rest }) => {
  const { t } = useTranslation();
  const [methods, setMethods] = useState(FALLBACK);

  useEffect(() => {
    let active = true;
    paymentMethodService.getAllPaymentMethods({ is_active: true })
      .then((res) => { if (active && res?.data?.length) setMethods(res.data); })
      .catch(() => { /* keep fallback */ });
    return () => { active = false; };
  }, []);

  // Normalise legacy values (e.g. lowercase "cash") so they match by code.
  const normalized = (value || '').toString().toUpperCase();
  const known = methods.some((m) => m.code === normalized);

  return (
    <Form.Select name={name} value={known ? normalized : (value || '')} onChange={onChange} required={required} {...rest}>
      {includeBlank && <option value="">{t('common.select', '— Sélectionner —')}</option>}
      {methods.map((m) => (
        <option key={m.code} value={m.code}>{m.label}</option>
      ))}
      {/* Preserve an unknown/legacy value so it isn't silently lost on save */}
      {value && !known && <option value={value}>{value}</option>}
    </Form.Select>
  );
};

export default PaymentMethodSelect;
