/**
 * ExpenseCategorySelect
 * A <Form.Select> populated from the admin-configurable expense categories list.
 * Falls back to built-in defaults if the API is unavailable, and always keeps
 * the current value selectable (even if it points to a deactivated/legacy code).
 */

import { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import expenseCategoryService from '../services/expenseCategoryService';

const FALLBACK = [
  { code: 'RENT', label: 'Loyer' },
  { code: 'EQUIPMENT', label: 'Équipement' },
  { code: 'SOFTWARE', label: 'Logiciels' },
  { code: 'INSURANCE', label: 'Assurance' },
  { code: 'TRAINING', label: 'Formation' },
  { code: 'MARKETING', label: 'Marketing' },
  { code: 'UTILITIES', label: 'Charges' },
  { code: 'STAFF', label: 'Personnel' },
  { code: 'PROFESSIONAL_FEES', label: 'Honoraires' },
  { code: 'SUPPLIES', label: 'Fournitures' },
  { code: 'TRAVEL', label: 'Déplacements' },
  { code: 'OTHER', label: 'Autre' }
];

const ExpenseCategorySelect = ({ value, onChange, name = 'category', required = false, includeBlank = false, blankLabel, ...rest }) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState(FALLBACK);

  useEffect(() => {
    let active = true;
    expenseCategoryService.getAllExpenseCategories({ is_active: true })
      .then((res) => { if (active && res?.data?.length) setCategories(res.data); })
      .catch(() => { /* keep fallback */ });
    return () => { active = false; };
  }, []);

  const normalized = (value || '').toString().toUpperCase();
  const known = categories.some((c) => c.code === normalized);

  return (
    <Form.Select name={name} value={known ? normalized : (value || '')} onChange={onChange} required={required} {...rest}>
      {includeBlank && <option value="">{blankLabel || t('common.all', 'Toutes')}</option>}
      {categories.map((c) => (
        <option key={c.code} value={c.code}>{c.label}</option>
      ))}
      {value && !known && <option value={value}>{value}</option>}
    </Form.Select>
  );
};

export default ExpenseCategorySelect;
