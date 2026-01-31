/**
 * ActionButton Component
 * Standardized action button for consistent UX across all list pages
 * Sprint 8: US-8.1 - Reusable ActionButton Component
 */

import { Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import './ActionButton.css';

/**
 * Action configuration mapping
 * Maps action types to their default icon and variant
 */
const ACTION_CONFIG = {
  // Primary actions
  edit: { icon: '✏️', variant: 'outline-primary' },
  delete: { icon: '🗑️', variant: 'outline-danger' },

  // Status actions
  disable: { icon: '🚫', variant: 'outline-warning' },
  deactivate: { icon: '⏸️', variant: 'outline-warning' },
  enable: { icon: '▶️', variant: 'outline-success' },
  activate: { icon: '▶️', variant: 'outline-success' },

  // Special actions
  schedule: { icon: '📅', variant: 'outline-success' },
  payment: { icon: '💰', variant: 'outline-success' },
  download: { icon: '⬇️', variant: 'outline-primary' },
  preview: { icon: '👁️', variant: 'outline-info' },
  view: { icon: '🔍', variant: 'outline-info' },
  share: { icon: '🔗', variant: 'outline-success' },
  translate: { icon: '🌐', variant: 'outline-secondary' },
  duplicate: { icon: '📋', variant: 'outline-info' },
  clone: { icon: '📋', variant: 'outline-info' },
  'reset-password': { icon: '🔑', variant: 'outline-info' },
  default: { icon: '⚙️', variant: 'outline-secondary' },
  setDefault: { icon: '⭐', variant: 'outline-warning' },
  acknowledge: { icon: '✅', variant: 'outline-success' },
  add: { icon: '➕', variant: 'outline-primary' },
  send: { icon: '📤', variant: 'outline-primary' },
};

/**
 * ActionButton - Standardized action button component
 *
 * @param {string} action - Action type (edit, delete, disable, etc.)
 * @param {function} onClick - Click handler
 * @param {string} title - Tooltip text (required for accessibility)
 * @param {boolean} disabled - Disable the button
 * @param {string} icon - Custom icon (overrides action default)
 * @param {string} variant - Custom variant (overrides action default)
 * @param {string} size - Button size (default: 'sm')
 * @param {string} className - Additional CSS classes
 * @param {boolean} loading - Show loading state
 * @param {React.ReactNode} children - Optional children (for custom content)
 */
const ActionButton = ({
  action = 'default',
  onClick,
  title,
  disabled = false,
  icon,
  variant,
  size = 'sm',
  className = '',
  loading = false,
  children,
  ...props
}) => {
  // Get config for the action type
  const config = ACTION_CONFIG[action] || ACTION_CONFIG.default;

  // Allow overrides for icon and variant
  const displayIcon = icon ?? config.icon;
  const displayVariant = variant ?? config.variant;

  // Loading icon
  const displayContent = loading ? '⏳' : (children || displayIcon);

  return (
    <Button
      variant={displayVariant}
      size={size}
      onClick={onClick}
      title={title}
      disabled={disabled || loading}
      className={`action-button ${className}`}
      {...props}
    >
      {displayContent}
    </Button>
  );
};

ActionButton.propTypes = {
  action: PropTypes.oneOf([
    'edit', 'delete', 'disable', 'deactivate', 'enable', 'activate',
    'schedule', 'payment', 'download', 'preview', 'view', 'translate',
    'duplicate', 'clone', 'reset-password', 'default', 'setDefault',
    'acknowledge', 'add', 'send', 'share'
  ]),
  onClick: PropTypes.func,
  title: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  icon: PropTypes.string,
  variant: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  loading: PropTypes.bool,
  children: PropTypes.node,
};

export default ActionButton;
