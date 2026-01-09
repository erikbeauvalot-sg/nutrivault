/**
 * Login Page
 * User authentication form
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import useAuth from '../hooks/useAuth';
import '../styles/login.css';

// Validation schema
const validationSchema = yup.object().shape({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: yup.boolean()
});

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error: authError, loading } = useAuth();
  const [submitError, setSubmitError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(validationSchema)
  });

  const onSubmit = async (data) => {
    console.log('[LoginPage] Form submitted:', { username: data.username, rememberMe: data.rememberMe });
    setSubmitError(null);

    try {
      console.log('[LoginPage] Calling login...');
      await login(data.username, data.password, data.rememberMe);

      // Redirect to dashboard or requested page
      const from = location.state?.from?.pathname || '/dashboard';
      console.log('[LoginPage] Login successful, navigating to:', from);
      navigate(from);
    } catch (err) {
      console.error('[LoginPage] Login error:', err);
      setSubmitError(err.message || 'Login failed. Please try again.');
    }
  };

  const displayError = submitError || authError;

  return (
    <div className="login-container">
      <div className="row justify-content-center align-items-center min-vh-100">
        <div className="col-12 col-sm-10 col-md-6 col-lg-5">
          <div className="card login-card shadow-lg">
            <div className="card-body p-5">
              {/* Logo/Branding */}
              <div className="text-center mb-4">
                <h1 className="login-title">NutriVault</h1>
                <p className="login-subtitle">Nutrition Practice Management</p>
              </div>

              {/* Error Alert */}
              {displayError && (
                <div className="alert alert-danger alert-dismissible">
                  <button type="button" className="btn-close" onClick={() => setSubmitError(null)}></button>
                  <strong>Login Failed</strong>
                  {' '}
                  {displayError}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Username Field */}
                <div className="form-group mb-3">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                    placeholder="Enter your username"
                    {...register('username')}
                    disabled={loading}
                    autoFocus
                  />
                  {errors.username && (
                    <div className="invalid-feedback d-block">
                      {errors.username.message}
                    </div>
                  )}
                </div>

                {/* Password Field */}
                <div className="form-group mb-3">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    placeholder="Enter your password"
                    {...register('password')}
                    disabled={loading}
                  />
                  {errors.password && (
                    <div className="invalid-feedback d-block">
                      {errors.password.message}
                    </div>
                  )}
                </div>

                {/* Remember Me Checkbox */}
                <div className="form-group mb-4">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      className="form-check-input"
                      {...register('rememberMe')}
                      disabled={loading}
                    />
                    <label className="form-check-label" htmlFor="rememberMe">
                      Remember me (keeps you logged in for 7 days)
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn btn-primary w-100 login-btn"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              {/* Footer Info */}
              <div className="text-center mt-4 text-muted small">
                <p>Demo credentials for testing:</p>
                <p>Username: admin | Password: (check your notes)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
