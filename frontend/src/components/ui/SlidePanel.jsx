/**
 * SlidePanel Component
 * Modern right-side sliding panel that replaces centered modals for edit forms.
 * Uses Bootstrap Modal as base for accessibility (focus trap, keyboard, backdrop).
 *
 * Props:
 *  - show / onHide         — visibility control
 *  - title / subtitle      — header text
 *  - icon                  — optional leading icon (emoji or JSX)
 *  - size                  — 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 *  - children              — body content
 *  - footer                — custom footer JSX, or `false` to hide
 *  - onSubmit / submitLabel / submitVariant / loading — default footer shortcuts
 *  - headerExtra           — extra JSX rendered on the right side of the header
 */

import { Modal, Button, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import './SlidePanel.css';

const SlidePanel = ({
  show,
  onHide,
  title,
  subtitle,
  icon,
  size = 'md',
  children,
  footer,
  onSubmit,
  submitLabel,
  submitVariant = 'primary',
  loading = false,
  headerExtra,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      show={show}
      onHide={onHide}
      dialogClassName={`nv-slide-panel nv-slide-panel--${size} ${className}`}
      contentClassName="nv-slide-panel__content"
      backdropClassName="nv-slide-panel__backdrop"
      scrollable
      aria-labelledby="slide-panel-title"
    >
      {/* --- Header --- */}
      <div className="nv-slide-panel__header">
        <div className="nv-slide-panel__header-left">
          {icon && <span className="nv-slide-panel__icon">{icon}</span>}
          <div className="nv-slide-panel__titles">
            <h5 className="nv-slide-panel__title" id="slide-panel-title">{title}</h5>
            {subtitle && <span className="nv-slide-panel__subtitle">{subtitle}</span>}
          </div>
        </div>
        <div className="nv-slide-panel__header-right">
          {headerExtra}
          <button
            type="button"
            className="nv-slide-panel__close"
            onClick={onHide}
            aria-label={t('common.close', 'Close')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* --- Body --- */}
      <div className="nv-slide-panel__body">
        {children}
      </div>

      {/* --- Footer --- */}
      {footer !== false && (
        <div className="nv-slide-panel__footer">
          {footer || (
            <>
              <Button
                variant="outline-secondary"
                onClick={onHide}
                disabled={loading}
                className="nv-slide-panel__btn-cancel"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant={submitVariant}
                onClick={onSubmit}
                disabled={loading}
                className="nv-slide-panel__btn-submit"
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('common.saving', 'Saving...')}
                  </>
                ) : (
                  submitLabel || t('common.save', 'Save')
                )}
              </Button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

export default SlidePanel;
