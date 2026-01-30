/**
 * PageHeader Component
 * Unified header for pages with title, subtitle, and action buttons
 */

import { Row, Col, Button, ButtonGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/**
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} [props.subtitle] - Optional subtitle or count
 * @param {Array} [props.actions] - Array of action button configs
 * @param {React.ReactNode} [props.children] - Custom content for the right side
 * @param {string} [props.className] - Additional CSS classes
 *
 * @example
 * <PageHeader
 *   title={t('patients.management')}
 *   subtitle={`${totalPatients} patients`}
 *   actions={[
 *     { label: t('common.export'), icon: 'bi-download', variant: 'outline-secondary', onClick: handleExport },
 *     { label: t('patients.create'), icon: 'bi-plus-circle', variant: 'primary', onClick: handleCreate }
 *   ]}
 * />
 */
const PageHeader = ({
  title,
  subtitle,
  actions = [],
  children,
  className = ''
}) => {
  const { t } = useTranslation();

  return (
    <Row className={`mb-4 align-items-center ${className}`}>
      <Col>
        <h1 className="mb-0">{title}</h1>
        {subtitle && (
          <p className="text-muted mb-0 mt-1">{subtitle}</p>
        )}
      </Col>
      <Col xs="auto" className="d-flex gap-2 flex-wrap">
        {children}
        {actions.map((action, index) => {
          if (action.hidden) return null;

          const ButtonComponent = action.href ? 'a' : Button;
          const buttonProps = action.href
            ? { href: action.href, className: `btn btn-${action.variant || 'primary'}` }
            : { variant: action.variant || 'primary', onClick: action.onClick, disabled: action.disabled };

          return (
            <ButtonComponent
              key={index}
              {...buttonProps}
              className={`d-flex align-items-center ${buttonProps.className || ''}`}
              title={action.tooltip}
            >
              {action.icon && <i className={`${action.icon} me-2`}></i>}
              {action.label}
            </ButtonComponent>
          );
        })}
      </Col>
    </Row>
  );
};

export default PageHeader;
