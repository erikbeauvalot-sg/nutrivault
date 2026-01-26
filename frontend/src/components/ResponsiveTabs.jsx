/**
 * ResponsiveTabs Component
 *
 * Displays horizontal tabs on desktop and all content stacked on mobile
 * (no tab selection needed - everything visible at once).
 */

import { useState, useEffect } from 'react';
import { Tabs, Tab, Card } from 'react-bootstrap';
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

  // Mobile: Show all sections stacked (no tab selection)
  if (isMobile) {
    return (
      <div className={`responsive-tabs-mobile ${className}`}>
        {tabs.map((tab, index) => (
          <Card key={tab.eventKey} className={index < tabs.length - 1 ? 'mb-3' : ''}>
            <Card.Header
              className="fw-bold"
              style={{
                backgroundColor: '#0d6efd',
                color: '#fff',
                fontSize: '1rem'
              }}
            >
              {typeof tab.title === 'string'
                ? tab.title
                : tab.title?.props?.children || tab.eventKey}
            </Card.Header>
            <Card.Body>
              {tabContents[tab.eventKey]}
            </Card.Body>
          </Card>
        ))}
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
