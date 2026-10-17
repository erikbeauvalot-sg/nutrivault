/**
 * RoleMenuAccess Component
 * Checkbox list of sidebar entries a role can see, grouped like the sidebar,
 * plus the page opened after login (chosen among the checked entries)
 */

import { useMemo } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import SIDEBAR_ITEMS, { GROUP_ORDER, GROUP_LABELS } from '../config/sidebarItemRegistry';

const SETTINGS_GROUP = 'settings';

const RoleMenuAccess = ({ configs, selected, onChange, homePage, onHomePageChange }) => {
  const { t } = useTranslation();
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const groups = useMemo(() => {
    const byGroup = {};
    [...configs]
      .filter(config => SIDEBAR_ITEMS[config.item_key])
      .sort((a, b) => a.display_order - b.display_order)
      .forEach(config => {
        const reg = SIDEBAR_ITEMS[config.item_key];
        const group = config.section === 'settings' ? SETTINGS_GROUP : (reg.group || 'admin');
        (byGroup[group] = byGroup[group] || []).push({ key: config.item_key, icon: reg.icon, labelKey: reg.labelKey });
      });
    return [...GROUP_ORDER, SETTINGS_GROUP]
      .filter(group => byGroup[group])
      .map(group => ({ key: group, items: byGroup[group] }));
  }, [configs]);

  const applySelection = (next) => {
    onChange([...next]);
    // The home page must stay one of the visible entries
    if (homePage && !next.has(homePage)) onHomePageChange?.('');
  };

  const toggle = (key) => {
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key); else next.add(key);
    applySelection(next);
  };

  const toggleGroup = (items) => {
    const allSelected = items.every(item => selectedSet.has(item.key));
    const next = new Set(selectedSet);
    items.forEach(item => (allSelected ? next.delete(item.key) : next.add(item.key)));
    applySelection(next);
  };

  const homePageOptions = groups
    .flatMap(group => group.items)
    .filter(item => selectedSet.has(item.key));

  const groupLabel = (group) => (group === SETTINGS_GROUP
    ? t('navigation.settings', 'Settings')
    : t(GROUP_LABELS[group], group));

  return (
    <div>
      <p className="text-muted small">
        {t('roles.menuHint', 'Choose the menu entries users with this role see. Pages still require the matching permissions.')}
      </p>
      {onHomePageChange && (
        <Form.Group className="mb-3" controlId="role-home-page">
          <Form.Label>{t('roles.homePage', 'Home page after login')}</Form.Label>
          <Form.Select value={homePage || ''} onChange={(e) => onHomePageChange(e.target.value)}>
            <option value="">{t('roles.homePageAuto', 'Automatic (dashboard, otherwise the first menu entry)')}</option>
            {homePageOptions.map(item => (
              <option key={item.key} value={item.key}>{`${item.icon} ${t(item.labelKey, item.key)}`}</option>
            ))}
          </Form.Select>
          <Form.Text className="text-muted">
            {t('roles.homePageHint', 'Can be overridden for a single user in their profile.')}
          </Form.Text>
        </Form.Group>
      )}
      <div className="row g-3">
        {groups.map(group => {
          const allSelected = group.items.every(item => selectedSet.has(item.key));
          return (
            <div key={group.key} className="col-12 col-md-6 col-lg-4">
              <div className="border rounded p-2 h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>{groupLabel(group.key)}</strong>
                  <Button variant="link" size="sm" className="p-0" onClick={() => toggleGroup(group.items)}>
                    {allSelected ? t('roles.menuUncheckAll', 'Uncheck all') : t('roles.menuCheckAll', 'Check all')}
                  </Button>
                </div>
                {group.items.map(item => (
                  <Form.Check
                    key={item.key}
                    type="checkbox"
                    id={`role-menu-${item.key}`}
                    checked={selectedSet.has(item.key)}
                    onChange={() => toggle(item.key)}
                    label={`${item.icon} ${t(item.labelKey, item.key)}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoleMenuAccess;
