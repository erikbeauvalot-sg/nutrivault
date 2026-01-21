# Source Tree Analysis

## Directory Structure

```
nutrivault/
├── backend/                 # Backend API (Express/Node.js)
│   ├── src/
│   │   ├── auth/            # Authentication logic
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API route definitions
│   │   └── services/        # Business logic services
│   └── test-*.sh            # Testing scripts
├── frontend/                # Frontend Application (React/Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React Context definitions
│   │   ├── pages/           # Application pages/views
│   │   ├── services/        # Frontend API services
│   │   └── utils/           # Utility functions
│   └── vite.config.js       # Vite configuration
├── models/                  # Shared Sequelize models
├── migrations/              # Database migration files
├── seeders/                 # Database seed data
├── config/                  # Configuration files
├── docs/                    # Project documentation
├── plan/                    # Project planning documents
└── package.json             # Root package configuration
```

## Critical Directories

### Backend (`backend/`)
The backend is built with Express and handles the API logic.
- **`src/controllers`**: Contains the logic for handling incoming requests.
- **`src/models`**: (Note: Models seem to be at the root `models/` directory, possibly shared or sympathised, but `backend/src` also contains logic). *Correction*: The scan shows `models/` at the root, likely used by the backend via `require('../../models')` or similar.
- **`src/routes`**: Defines the API endpoints.

### Frontend (`frontend/`)
The frontend is a React application using Vite.
- **`src/components`**: UI components.
- **`src/pages`**: Top-level page components corresponding to routes.
- **`src/services`**: API integration layer.

### Database
- **`models/`**: Defines the database schema using Sequelize.
- **`migrations/`**: Tracks database schema changes.
- **`seeders/`**: Provides initial data for the database.
