/**
 * EmptyState Component
 * Display when a list has no items
 */

import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/**
 * @param {Object} props
 * @param {string} [props.icon] - Bootstrap icon class
 * @param {string} props.title - Title text
 * @param {string} [props.message] - Description message
 * @param {Object} [props.action] - Action button config { label, onClick, icon, variant }
 * @param {string} [props.className] - Additional CSS classes
 *
 * @example
 * <EmptyState
 *   icon="bi-people"
 *   title={t('patients.noPatients')}
 *   message={t('patients.noPatientsMessage')}
 *   action={{
 *     label: t('patients.create'),
 *     onClick: handleCreate,
 *     icon: 'bi-plus-circle'
 *   }}
 * />
 */
const EmptyState = ({
  icon = 'bi-inbox',
  title,
  message,
  action,
  className = ''
}) => {
  const { t } = useTranslation();

  return (
    <div className={`text-center py-5 ${className}`}>
      <i className={`${icon} text-muted`} style={{ fontSize: '3rem' }}></i>
      <h5 className="mt-3 text-muted">{title}</h5>
      {message && (
        <p className="text-muted mb-4">{message}</p>
      )}
      {action && !action.hidden && (
        <Button
          variant={action.variant || 'primary'}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.icon && <i className={`${action.icon} me-2`}></i>}
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
