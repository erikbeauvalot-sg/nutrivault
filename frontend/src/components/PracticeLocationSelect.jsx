/**
 * PracticeLocationSelect
 * A <Form.Select> populated from the configurable consultation locations.
 * Always offers "no location" and keeps the current value selectable, even
 * when it points to a deactivated location. An `undefined` value shows the
 * default location (what the backend applies when no location is sent).
 */

import { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import practiceLocationService from '../services/practiceLocationService';

const PracticeLocationSelect = ({ value, onChange, name = 'location_code', ...rest }) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    let active = true;
    practiceLocationService.getAllPracticeLocations()
      .then((res) => { if (active && Array.isArray(res?.data)) setLocations(res.data); })
      .catch(() => { /* keep the empty list */ });
    return () => { active = false; };
  }, []);

  const effective = value === undefined ? (locations.find((l) => l.is_default && l.is_active)?.code || '') : value;
  const current = locations.find((l) => l.code === effective);

  return (
    <Form.Select name={name} value={effective || ''} onChange={onChange} {...rest}>
      <option value="">{t('locations.none', '— No location —')}</option>
      {locations
        .filter((l) => l.is_active || l.code === effective)
        .map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      {/* Preserve an unknown value so it isn't silently lost on save */}
      {effective && !current && locations.length > 0 && <option value={effective}>{effective}</option>}
    </Form.Select>
  );
};

export default PracticeLocationSelect;
