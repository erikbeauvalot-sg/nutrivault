/**
 * BankAccountSelect
 * A <Form.Select> populated from the configurable bank accounts.
 * Always offers "no account" and keeps the current value selectable, even when
 * it points to a deactivated account. With `showDefault`, an `undefined` value
 * shows the default account (what the backend applies when none is sent).
 */

import { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import bankAccountService from '../services/bankAccountService';

const BankAccountSelect = ({ value, onChange, name = 'bank_account_code', showDefault = false, emptyLabel, ...rest }) => {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    let active = true;
    bankAccountService.getAllBankAccounts()
      .then((res) => { if (active && Array.isArray(res?.data)) setAccounts(res.data); })
      .catch(() => { /* keep the empty list */ });
    return () => { active = false; };
  }, []);

  const effective = value === undefined && showDefault
    ? (accounts.find((a) => a.is_default && a.is_active)?.code || '')
    : value;
  const current = accounts.find((a) => a.code === effective);

  return (
    <Form.Select name={name} value={effective || ''} onChange={onChange} {...rest}>
      <option value="">{emptyLabel || t('bankAccounts.none', '— No account —')}</option>
      {accounts
        .filter((a) => a.is_active || a.code === effective)
        .map((a) => (
          <option key={a.code} value={a.code}>{a.label}</option>
        ))}
      {/* Preserve an unknown value so it isn't silently lost on save */}
      {effective && !current && accounts.length > 0 && <option value={effective}>{effective}</option>}
    </Form.Select>
  );
};

export default BankAccountSelect;
