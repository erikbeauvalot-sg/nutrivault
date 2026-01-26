/**
 * ResponsiveTabs Component
 *
 * Displays tabs on desktop and a dropdown select on mobile
 * for better user experience on small screens.
 */

import { useState, useEffect } from 'react';
import { Tabs, Tab, Form } from 'react-bootstrap';
import PropTypes from 'prop-types';

const ResponsiveTabs = ({
  activeKey,
  onSelect,
  children,
  className = '',
  mobileBreakpoint = 768,
  id = 'responsive-tabs'
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < mobileBreakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileBreakpoint]);

  // Extract tab information from children
  const tabs = [];
  const tabContents = {};

  // Handle both array and single child
  const childArray = Array.isArray(children) ? children : [children];

  childArray.forEach(child => {
    if (child && child.props) {
      const { eventKey, title, children: tabContent, disabled } = child.props;
      if (eventKey) {
        tabs.push({ eventKey, title, disabled });
        tabContents[eventKey] = tabContent;
      }
    }
  });

  // Mobile: Dropdown select + content
  if (isMobile) {
    return (
      <div className={`responsive-tabs-mobile ${className}`}>
        <Form.Select
          value={activeKey}
          onChange={(e) => onSelect(e.target.value)}
          className="mb-3 responsive-tabs-select"
          aria-label="Select tab"
        >
          {tabs.map(tab => (
            <option
              key={tab.eventKey}
              value={tab.eventKey}
              disabled={tab.disabled}
            >
              {typeof tab.title === 'string'
                ? tab.title
                : tab.title?.props?.children || tab.eventKey}
            </option>
          ))}
        </Form.Select>

        <div className="responsive-tabs-content">
          {tabContents[activeKey]}
        </div>
      </div>
    );
  }

  // Desktop: Regular tabs
  return (
    <Tabs
      activeKey={activeKey}
      onSelect={onSelect}
      className={`mb-3 ${className}`}
      id={id}
    >
      {children}
    </Tabs>
  );
};

ResponsiveTabs.propTypes = {
  activeKey: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  mobileBreakpoint: PropTypes.number,
  id: PropTypes.string
};

// Re-export Tab for convenience
export { Tab };
export default ResponsiveTabs;
