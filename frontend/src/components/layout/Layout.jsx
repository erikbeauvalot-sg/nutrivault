/**
 * Layout Component
 * Main layout wrapper combining Header, Sidebar, and Footer
 */

import { useState } from 'react';
import { Container } from 'react-bootstrap';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import Breadcrumbs from '../Breadcrumbs';
import '../../styles/layout.css';

export function Layout({ children }) {
  const [sidebarShow, setSidebarShow] = useState(false);

  console.log('[Layout] Rendering layout, has children:', !!children);

  return (
    <div className="layout-wrapper">
      {/* Header */}
      <Header onMenuToggle={() => setSidebarShow(!sidebarShow)} />

      <div className="layout-body">
        {/* Sidebar */}
        <Sidebar show={sidebarShow} onHide={() => setSidebarShow(false)} />

        {/* Main Content */}
        <main className="layout-content">
          <Container fluid className="py-4 px-4">
            <Breadcrumbs />
            {children}
          </Container>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Layout;
