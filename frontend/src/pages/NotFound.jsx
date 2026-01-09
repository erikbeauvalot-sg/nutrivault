/**
 * Not Found Page (404)
 */

import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container-fluid">
      <div className="row justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="col-md-6 text-center">
          <div className="card shadow-lg">
            <div className="card-body p-5">
              <h1 className="display-4 mb-3">404</h1>
              <h2 className="mb-3">Page Not Found</h2>
              <p className="mb-4">
                The page you are looking for does not exist.
              </p>
              <a href="/dashboard" className="btn btn-primary">
                Go Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
