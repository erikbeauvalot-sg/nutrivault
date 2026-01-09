/**
 * Layout Component
 * AdminLTE-inspired main layout wrapper
 */

import AdminLayout from './AdminLayout';
import Breadcrumbs from '../Breadcrumbs';

export function Layout({ children }) {
  console.log('[Layout] Rendering AdminLTE layout, has children:', !!children);

  return (
    <AdminLayout>
      <Breadcrumbs />
      {children}
    </AdminLayout>
  );
}

export default Layout;
