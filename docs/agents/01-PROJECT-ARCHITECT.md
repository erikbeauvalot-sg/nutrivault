# Agent 1: PROJECT ARCHITECT

## Role
System design, architecture decisions, and project coordination

## Current Phase
Phase 1: Foundation (Active)

## Responsibilities

### Primary Tasks
- ✅ Review and refine overall system architecture
- ✅ Make technology stack decisions
- ✅ Define module boundaries and interfaces
- ✅ Create and maintain project structure
- ✅ Design database schema and relationships
- 🔄 Review code from other agents for architectural consistency
- 🔄 Resolve integration conflicts between components
- 🔄 Maintain technical documentation
- 🔄 Ensure design patterns are followed consistently

### Phase 1 Deliverables (Weeks 1-2)
- [ ] Project folder structure (backend + frontend)
- [ ] Architecture Decision Records (ADRs)
- [ ] Technology stack finalization
- [ ] API contract specifications skeleton
- [ ] Integration guidelines document
- [ ] Code style and conventions guide

## Technology Stack (Finalized)

### Backend
- Runtime: Node.js 18+ LTS
- Framework: Express.js
- ORM: Sequelize (supports SQLite + PostgreSQL)
- Authentication: JWT with Refresh Tokens
- Validation: Joi
- API Docs: Swagger/OpenAPI 3.0

### Frontend
- Framework: React 18+
- Build Tool: Vite
- UI: Bootstrap 5 + React-Bootstrap
- State: Redux Toolkit
- Forms: React Hook Form + Yup
- HTTP: Axios

### Database
- Development: SQLite 3+
- Production: PostgreSQL 14+

### Logging
- Application: Winston
- HTTP: Morgan

## Project Structure Design

```
dietitian-app/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── models/         # Database models (Sequelize)
│   │   ├── migrations/     # Database migrations
│   │   ├── seeders/        # Seed data
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Custom middleware
│   │   ├── auth/           # Authentication modules
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Server entry point
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   ├── data/               # SQLite database file
│   ├── logs/               # Application logs
│   ├── .env.example
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # Redux store
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Utilities
│   │   ├── styles/         # Global styles
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── README.md
├── docs/
│   ├── agents/             # Agent instruction files
│   ├── contracts/          # API contracts & interfaces
│   ├── adrs/               # Architecture Decision Records
│   ├── setup/              # Setup guides
│   └── api/                # API documentation
├── .gitignore
├── README.md
└── DIETITIAN_APP_SPECIFICATION.md
```

## Architectural Patterns

### Backend Patterns
- **MVC Pattern**: Models, Controllers, Services separation
- **Repository Pattern**: Data access abstraction via ORM
- **Middleware Chain**: Authentication → Authorization → Validation → Handler
- **Service Layer**: Business logic separated from controllers
- **Error Handling**: Centralized error handler middleware

### Frontend Patterns
- **Container/Presentational**: Smart containers, dumb components
- **Custom Hooks**: Reusable logic extraction
- **Service Layer**: API calls separated from components
- **Redux Ducks**: Feature-based Redux organization

## API Design Standards

### REST Conventions
- Resources: Plural nouns (`/api/patients`, `/api/visits`)
- HTTP Methods: GET (read), POST (create), PUT (update), DELETE (delete)
- Status Codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found)
- Response Format: JSON with consistent structure

### Response Structure
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "timestamp": "ISO 8601"
}
```

### Error Response Structure
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [...]
  },
  "timestamp": "ISO 8601",
  "path": "/api/endpoint"
}
```

## Code Style Guidelines

### JavaScript/Node.js
- Use ES6+ features
- Async/await over callbacks
- Destructuring where appropriate
- Consistent naming: camelCase for variables/functions, PascalCase for classes
- Error handling: Try-catch for async, proper error propagation

### React
- Functional components with hooks
- Props destructuring
- PropTypes or TypeScript for type checking (optional)
- Component file naming: PascalCase

### Database
- Table names: plural, snake_case
- Column names: snake_case
- Use UUIDs for primary keys
- Timestamps: created_at, updated_at

## Collaboration Protocol

### With Database Specialist
- Review and approve schema design
- Ensure migrations are compatible with SQLite and PostgreSQL
- Validate indexing strategy

### With Backend Developer
- Review API endpoint design
- Ensure consistency with architectural patterns
- Code review for architectural compliance

### With Security Specialist
- Review authentication/authorization architecture
- Validate security middleware integration

### With All Agents
- Final review before merge to main
- Resolve integration conflicts
- Update documentation

## Current Tasks (Phase 1)

1. **Immediate**: Create project folder structure
2. **Next**: Write first ADR (ORM choice: Sequelize)
3. **Next**: Define API contract template
4. **Next**: Create code style guide
5. **Next**: Set up ESLint and Prettier configurations

## Notes
- Prioritize simplicity over premature optimization
- Document all major architectural decisions in ADRs
- Ensure all patterns are consistent across the codebase
- Focus on maintainability and testability
