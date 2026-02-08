/**
 * FormSection Component
 * Beautiful grouped form section with icon, title, and optional collapsibility.
 * Provides visual hierarchy inside SlidePanel or any form layout.
 *
 * Props:
 *  - title       — section heading
 *  - icon        — leading icon (emoji or JSX)
 *  - description — optional helper text below the title
 *  - collapsible — if true, section can be toggled open/closed (default false)
 *  - defaultOpen — initial state when collapsible (default true)
 *  - accent      — accent color: 'slate' | 'gold' | 'info' | 'success' | 'danger' (default 'slate')
 *  - children    — form fields
 *  - className   — extra classes
 */

import { useState } from 'react';
import './FormSection.css';

const FormSection = ({
  title,
  icon,
  description,
  collapsible = false,
  defaultOpen = true,
  accent = 'slate',
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    if (collapsible) setIsOpen(!isOpen);
  };

  return (
    <div className={`nv-form-section nv-form-section--${accent} ${className}`}>
      <div
        className={`nv-form-section__header ${collapsible ? 'nv-form-section__header--clickable' : ''}`}
        onClick={handleToggle}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={collapsible ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); } } : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
      >
        <div className="nv-form-section__header-left">
          {icon && <span className="nv-form-section__icon">{icon}</span>}
          <div>
            <h6 className="nv-form-section__title">{title}</h6>
            {description && <p className="nv-form-section__description">{description}</p>}
          </div>
        </div>
        {collapsible && (
          <span className={`nv-form-section__chevron ${isOpen ? 'nv-form-section__chevron--open' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        )}
      </div>
      <div className={`nv-form-section__body ${isOpen ? 'nv-form-section__body--open' : 'nv-form-section__body--closed'}`}>
        <div className="nv-form-section__content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default FormSection;
