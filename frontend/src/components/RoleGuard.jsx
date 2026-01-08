/**
 * RoleGuard Component
 * Conditionally renders children based on user role/permissions
 * Use this for UI elements that should only be visible to certain roles
 * (unlike ProtectedRoute which guards entire routes)
 */

import useAuth from '../hooks/useAuth';

/**
 * RoleGuard component for conditional rendering based on user roles
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render if authorized
 * @param {string[]} props.allowedRoles - Array of roles that can see the content
 * @param {React.ReactNode} props.fallback - Optional fallback content if not authorized
 * @returns {React.ReactNode}
 */
export function RoleGuard({ children, allowedRoles, fallback = null }) {
  const { user, isAuthenticated } = useAuth();

  console.log('[RoleGuard] Checking role access', {
    isAuthenticated,
    username: user?.username,
    userRole: user?.role?.name,
    allowedRoles
  });

  // If not authenticated, don't render anything
  if (!isAuthenticated || !user) {
    console.log('[RoleGuard] Not authenticated or no user');
    return fallback;
  }

  // If no roles specified, render for all authenticated users
  if (!allowedRoles || allowedRoles.length === 0) {
    console.log('[RoleGuard] No role restriction, allowing access');
    return children;
  }

  // Check if user's role is in the allowed roles (user.role is an object with 'name' property)
  const hasRequiredRole = allowedRoles.includes(user.role?.name);

  console.log('[RoleGuard] Role check result:', hasRequiredRole);
  return hasRequiredRole ? children : fallback;
}

export default RoleGuard;
