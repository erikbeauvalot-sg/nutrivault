/**
 * ResponsiveTabs Component
 *
 * Displays horizontal tabs on desktop and vertical stacked tabs on mobile
 * for better user experience on small screens.
 */

import { useState, useEffect } from 'react';
import { Tabs, Tab, Nav } from 'react-bootstrap';
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

  // Mobile: Vertical stacked tabs
  if (isMobile) {
    return (
      <div className={`responsive-tabs-mobile ${className}`}>
        <Nav
          variant="pills"
          className="flex-column mb-3"
          activeKey={activeKey}
          onSelect={onSelect}
        >
          {tabs.map(tab => (
            <Nav.Item key={tab.eventKey}>
              <Nav.Link
                eventKey={tab.eventKey}
                disabled={tab.disabled}
                className="text-start py-2 px-3 mb-1 border"
                style={{
                  backgroundColor: activeKey === tab.eventKey ? '#0d6efd' : '#f8f9fa',
                  color: activeKey === tab.eventKey ? '#fff' : '#212529',
                  borderRadius: '0.375rem'
                }}
              >
                {typeof tab.title === 'string'
                  ? tab.title
                  : tab.title?.props?.children || tab.eventKey}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>

        <div className="responsive-tabs-content">
          {tabContents[activeKey]}
        </div>
      </div>
    );
  }

  // Desktop: Regular horizontal tabs
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
