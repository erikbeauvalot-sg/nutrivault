/**
 * PageError Component
 * Dismissable error alert for pages
 */

import { Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/**
 * @param {Object} props
 * @param {string|null} props.error - Error message to display
 * @param {Function} props.onDismiss - Callback when error is dismissed
 * @param {string} [props.variant] - Alert variant (default: 'danger')
 * @param {string} [props.className] - Additional CSS classes
 *
 * @example
 * <PageError error={error} onDismiss={() => setError(null)} />
 */
const PageError = ({
  error,
  onDismiss,
  variant = 'danger',
  className = ''
}) => {
  const { t } = useTranslation();

  if (!error) return null;

  return (
    <Alert
      variant={variant}
      dismissible
      onClose={onDismiss}
      className={className}
    >
      <strong>{t('common.error', 'Error')}:</strong> {error}
    </Alert>
  );
};

export default PageError;
