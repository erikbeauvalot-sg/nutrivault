/**
 * ResponsiveTabs Component
 *
 * Displays horizontal tabs on desktop and all content stacked on mobile
 * (no tab selection needed - everything visible at once).
 */

import { useState, useEffect, Children } from 'react';
import { Tabs, Tab, Card } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * Try to extract color from the title element
 * Looks for a span with backgroundColor style
 */
const extractColorFromTitle = (title) => {
  if (!title || typeof title === 'string') return null;

  // Check if title is a React element with props
  if (title?.props?.children) {
    const children = Array.isArray(title.props.children)
      ? title.props.children
      : [title.props.children];

    // Look for a span with backgroundColor in style
    for (const child of children) {
      if (child?.props?.style?.backgroundColor) {
        return child.props.style.backgroundColor;
      }
    }
  }

  // Check direct style on title
  if (title?.props?.style?.backgroundColor) {
    return title.props.style.backgroundColor;
  }

  return null;
};

/**
 * Recursively flatten children array (handles .map() results)
 */
const flattenChildren = (children) => {
  const result = [];
  Children.forEach(children, child => {
    if (Array.isArray(child)) {
      result.push(...flattenChildren(child));
    } else if (child) {
      result.push(child);
    }
  });
  return result;
};

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

  // Extract tab information from children (flatten nested arrays from .map())
  const tabs = [];
  const tabContents = {};

  const flatChildren = flattenChildren(children);

  flatChildren.forEach(child => {
    if (child && child.props) {
      const { eventKey, title, children: tabContent, disabled } = child.props;
      if (eventKey) {
        const color = extractColorFromTitle(title);
        tabs.push({ eventKey, title, disabled, color });
        tabContents[eventKey] = tabContent;
      }
    }
  });

  // Mobile: Show all sections stacked (no tab selection)
  if (isMobile) {
    return (
      <div className={`responsive-tabs-mobile ${className}`}>
        {tabs.map((tab, index) => {
          const headerColor = tab.color || '#0d6efd';
          return (
            <Card key={tab.eventKey} className={index < tabs.length - 1 ? 'mb-3' : ''}>
              <Card.Header
                className="fw-bold"
                style={{
                  backgroundColor: headerColor,
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
          );
        })}
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
