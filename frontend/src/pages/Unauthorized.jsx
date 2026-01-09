/**
 * Unauthorized Page (403)
 */

import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div className="container-fluid">
      <div className="row justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="col-md-6 text-center">
          <div className="card shadow-lg">
            <div className="card-body p-5">
              <h1 className="display-4 mb-3">403</h1>
              <h2 className="mb-3">Access Denied</h2>
              <p className="mb-4">
                You do not have permission to access this resource.
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

export default UnauthorizedPage;
