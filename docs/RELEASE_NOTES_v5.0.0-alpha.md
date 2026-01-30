# NutriVault v5.0.0-alpha Release

## Overview

This is the alpha release of NutriVault v5.0, featuring a complete architecture overhaul and major new functionality.

## What's New in v5.0

### 🚀 Major Features

- **Complete RBAC System**: Role-Based Access Control with granular permissions management
- **Custom Fields**: Flexible data collection system for patient records
- **Health Analytics**: Advanced trend analysis and health metrics visualization
- **Appointment Reminders**: Automated reminder system for patient appointments
- **Template System**: Reusable templates for billing and communications
- **Multi-language Support**: Internationalization with French translations
- **Docker Deployment**: Containerized deployment with docker-compose

### 🏗️ Architecture Changes

- **Modern React Frontend**: Updated to React 18 with hooks and modern patterns
- **Express.js Backend**: RESTful API with improved error handling
- **Database**: SQLite/PostgreSQL support with Sequelize ORM
- **Testing**: Comprehensive test suite with Jest and Vitest
- **Build System**: Vite for frontend, optimized Docker builds

### 📊 Sprint Deliveries

- **Sprint 5**: Templates & Communication system
- **Sprint 4**: Health Analytics & Trends
- **Sprint 3**: Enhanced billing and reporting
- **Sprint 2**: User management and permissions
- **Sprint 1**: RBAC UI and custom fields

## Installation

### Docker Deployment (Recommended)

```bash
git clone https://github.com/erikbeauvalot-sg/nutrivault.git
cd nutrivault
git checkout v5.0.0-alpha

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Deploy with Docker
docker-compose up -d
```

### Manual Installation

```bash
# Backend
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Known Issues & Limitations

⚠️ **Alpha Release Notes**:
- Some integration tests are currently failing
- Frontend test configuration needs resolution
- Performance optimization ongoing
- Documentation being updated

## Migration from v4.x

This is a major version with breaking changes. Database migration and configuration updates required.

## Contributing

This is an alpha release. Please report issues and provide feedback for the stable release.

## Support

- Documentation: See `V5_README.md` and `DEPLOYMENT.md`
- Issues: [GitHub Issues](https://github.com/erikbeauvalot-sg/nutrivault/issues)
- Discussions: [GitHub Discussions](https://github.com/erikbeauvalot-sg/nutrivault/discussions)

---

**Release Date**: January 25, 2026
**Tag**: `v5.0.0-alpha`
**Commit**: `9edfb6f`