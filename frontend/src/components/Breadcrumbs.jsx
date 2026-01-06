/**
 * Breadcrumbs Component
 * Displays current navigation path
 */

import { useLocation, Link } from 'react-router-dom';
import { Breadcrumb } from 'react-bootstrap';

/**
 * Convert path segment to readable label
 */
const getLabel = (segment) => {
  // Handle UUID patterns (keep as is or show "Details")
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return 'Details';
  }

  // Common path mappings
  const labelMap = {
    'dashboard': 'Dashboard',
    'patients': 'Patients',
    'visits': 'Visits',
    'billing': 'Billing',
    'users': 'Users',
    'reports': 'Reports',
    'audit-logs': 'Audit Logs',
    'profile': 'Profile',
    'settings': 'Settings',
    'new': 'New',
    'edit': 'Edit',
    'change-password': 'Change Password'
  };

  return labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
};

export function Breadcrumbs() {
  const location = useLocation();
  
  // Split path into segments
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on login or home
  if (pathSegments.length === 0 || pathSegments[0] === 'login') {
    return null;
  }

  // Build breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', path: '/dashboard' }
  ];

  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    
    breadcrumbItems.push({
      label: getLabel(segment),
      path: currentPath,
      isLast
    });
  });

  return (
    <Breadcrumb className="mb-3">
      {breadcrumbItems.map((item, index) => (
        <Breadcrumb.Item
          key={item.path}
          active={item.isLast}
          linkAs={item.isLast ? 'span' : Link}
          linkProps={item.isLast ? {} : { to: item.path }}
        >
          {item.label}
        </Breadcrumb.Item>
      ))}
    </Breadcrumb>
  );
}

export default Breadcrumbs;
