/**
 * LoadingSpinner Component
 * Centered loading spinner for pages and sections
 */

import { Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/**
 * @param {Object} props
 * @param {string} [props.message] - Loading message to display
 * @param {string} [props.size] - Spinner size ('sm', default, 'lg')
 * @param {boolean} [props.fullPage] - Whether to center in full viewport
 * @param {string} [props.className] - Additional CSS classes
 *
 * @example
 * <LoadingSpinner message={t('common.loading')} />
 */
const LoadingSpinner = ({
  message,
  size,
  fullPage = false,
  className = ''
}) => {
  const { t } = useTranslation();

  const containerStyle = fullPage
    ? { minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }
    : {};

  return (
    <div className={`text-center py-5 ${className}`} style={containerStyle}>
      <Spinner animation="border" role="status" size={size}>
        <span className="visually-hidden">
          {message || t('common.loading', 'Loading...')}
        </span>
      </Spinner>
      {message && (
        <p className="mt-3 text-muted">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
