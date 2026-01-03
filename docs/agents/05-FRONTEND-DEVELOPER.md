# Agent 5: FRONTEND DEVELOPER

## Role
React UI development and user experience

## Current Phase
Phase 4: Frontend Development (Standby - starts Week 6)

## Responsibilities
- Set up React project with Vite
- Implement component library with Bootstrap
- Build reusable UI components
- Create page layouts and navigation
- Implement forms with validation
- Build state management (Redux Toolkit)
- Implement API integration layer
- Handle client-side routing
- Ensure responsive design
- Implement accessibility features

## Phase 4 Deliverables (Weeks 6-9)
- [ ] React + Vite project setup
- [ ] Redux Toolkit store configuration
- [ ] Authentication flow (login, logout, token refresh)
- [ ] Layout components (Header, Sidebar, Footer)
- [ ] Dashboard page with statistics
- [ ] Patient management pages (list, detail, create, edit)
- [ ] Visit management pages
- [ ] Billing management pages
- [ ] User management pages (admin)
- [ ] Profile settings page
- [ ] Audit logs viewer (admin)
- [ ] Reports pages
- [ ] Responsive design for all pages
- [ ] Loading states and error handling
- [ ] Form validation

## Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── Loading.jsx
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Footer.jsx
│   │   └── patients/
│   │       ├── PatientCard.jsx
│   │       ├── PatientForm.jsx
│   │       └── PatientList.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Patients/
│   │   │   ├── PatientListPage.jsx
│   │   │   ├── PatientDetailPage.jsx
│   │   │   ├── PatientCreatePage.jsx
│   │   │   └── PatientEditPage.jsx
│   │   ├── Visits/
│   │   ├── Billing/
│   │   ├── Users/
│   │   └── Reports/
│   ├── services/
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── patientsService.js
│   │   ├── visitsService.js
│   │   └── billingService.js
│   ├── store/
│   │   ├── index.js
│   │   ├── authSlice.js
│   │   ├── patientsSlice.js
│   │   └── uiSlice.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useApi.js
│   │   └── useForm.js
│   ├── utils/
│   │   ├── validators.js
│   │   └── formatters.js
│   ├── App.jsx
│   └── main.jsx
├── public/
├── .env.example
└── package.json
```

## Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "react-bootstrap": "^2.9.0",
    "bootstrap": "^5.3.0",
    "@reduxjs/toolkit": "^2.0.0",
    "react-redux": "^9.0.0",
    "axios": "^1.6.0",
    "react-hook-form": "^7.48.0",
    "yup": "^1.3.0",
    "@hookform/resolvers": "^3.3.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

## API Service Setup
```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const { access_token } = response.data.data;
        localStorage.setItem('access_token', access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## Redux Store Setup
```javascript
// store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import patientsReducer from './patientsSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    patients: patientsReducer,
    ui: uiReducer
  }
});
```

## Current Status
⏸️ Standby - Starts Phase 4 (Week 6)

## Dependencies with Other Agents
- **Backend Developer**: API endpoints must be ready
- **UI/UX Specialist**: Design specifications and component structure
- **Security Specialist**: Auth flow implementation details
