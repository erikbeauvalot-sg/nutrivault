# NutriVault Documentation

**Application:** NutriVault - Nutrition Practice Management System
**Last Updated:** 2026-01-24

---

## Quick Links

- [Deployment Guide (US-5.4.3)](../../DEPLOYMENT_US-5.4.3.md)
- [Measure Alerts User Guide](./MEASURE_ALERTS.md)
- [Formula Editor User Guide](./FORMULA_EDITOR_USER_GUIDE.md)
- [Time-Series Optimization](./TIMESERIES_OPTIMIZATION.md)

---

## Recent Features

### Sprint 4: Health Analytics & Trends

#### ✅ US-5.4.3 - Normal Ranges & Alerts (2026-01-25)
Automatic health measure alerting system with visual feedback and email notifications.

**Key Features:**
- Configure normal/healthy ranges for numeric measures
- Automatic alert generation for out-of-range values
- Colored chart zones (red/yellow/green)
- Dashboard widget for real-time monitoring
- Email notifications for critical alerts
- 24-hour deduplication to prevent spam
- Multi-language support (EN/FR)
- System measure range configuration

**Documentation:**
- [Completion Summary](./US-5.4.3-COMPLETION-SUMMARY.md) - Quick overview & sign-off
- [Completion Report](./US-5.4.3-COMPLETED.md) - Full implementation details
- [User Guide](./MEASURE_ALERTS.md) - How to use the feature
- [Deployment Guide](../../DEPLOYMENT_US-5.4.3.md) - Step-by-step deployment

**Quick Start:**
1. Run migrations: `npx sequelize-cli db:migrate`
2. Populate sample ranges: `node scripts/create-sample-measure-ranges.js`
3. Configure SMTP in `.env` (optional for emails)
4. Edit a measure and set ranges
5. Enable alerts

**Status:** ✅ Production Ready - All features tested and verified

---

#### ✅ US-5.4.2 - Translation Support (2026-01-24)
Multi-language support for measure definitions and UI.

**Documentation:**
- [Completion Report](./US-5.4.2-COMPLETED.md)
- [Test Plan](./US-5.4.2-TEST-PLAN.md)

---

#### ✅ US-5.4.1 - Trend Visualization
Advanced charting with moving averages, trend lines, and statistical analysis.

**Documentation:**
- [Time-Series Optimization](./TIMESERIES_OPTIMIZATION.md)

---

### Sprint 3: Custom Measures & Formulas

#### ✅ US-5.3.4 - Calculated Measures
Formula-based measures with dependency tracking and automatic recalculation.

**Documentation:**
- [Formula Editor User Guide](./FORMULA_EDITOR_USER_GUIDE.md)

---

## Feature Documentation Index

### Health Measures
- [Measure Alerts](./MEASURE_ALERTS.md) - Alert configuration and monitoring
- [Formula Editor](./FORMULA_EDITOR_USER_GUIDE.md) - Creating calculated measures
- [Trend Visualization](./TIMESERIES_OPTIMIZATION.md) - Charts and analytics

### Implementation Reports
- [US-5.4.3 Completion Report](./US-5.4.3-COMPLETED.md) - Normal Ranges & Alerts
- [US-5.4.2 Completion Report](./US-5.4.2-COMPLETED.md) - Translation Support
- [US-5.4.2 Test Plan](./US-5.4.2-TEST-PLAN.md) - Translation testing

---

## Architecture Overview

### Database Schema

**Core Tables:**
- `measure_definitions` - Measure types (weight, BMI, etc.)
- `patient_measures` - Time-series measure values
- `measure_alerts` - Out-of-range value alerts (NEW in US-5.4.3)
- `measure_annotations` - Chart annotations and notes
- `measure_translations` - Multi-language support

**Relationships:**
```
measure_definitions
    ├── patient_measures (1:many)
    │   ├── measure_alerts (1:many)
    │   └── measure_annotations (1:many)
    └── measure_translations (1:many)
```

### Backend Services

**Measure Services:**
- `measureDefinition.service.js` - CRUD for measure types
- `patientMeasure.service.js` - Record and query values
- `measureAlerts.service.js` - Alert generation and management (NEW)
- `measureEvaluation.service.js` - Calculate formulas
- `measureTranslation.service.js` - Multi-language support
- `trendAnalysis.service.js` - Statistics and trends
- `formulaEngine.service.js` - Formula parsing and validation

**Supporting Services:**
- `email.service.js` - Email notifications
- `audit.service.js` - Activity logging
- `alerts.service.js` - General system alerts

### Frontend Components

**Measure Components:**
- `MeasureHistory.jsx` - Time-series charts with zones (UPDATED)
- `MeasureAlertsWidget.jsx` - Dashboard alert monitoring (NEW)
- `MeasureDefinitionModal.jsx` - Configure measures (UPDATED)
- `PatientMeasuresTable.jsx` - Tabular measure view
- `AnnotationModal.jsx` - Chart annotations
- `FormulaValidator.jsx` - Formula editor

**Dashboard Widgets:**
- `AlertsWidget.jsx` - General system alerts
- `MeasureAlertsWidget.jsx` - Health measure alerts (NEW)

---

## API Reference

### Measure Alerts Endpoints (US-5.4.3)

#### Get All Unacknowledged Alerts
```http
GET /api/measure-alerts?severity=critical&limit=100
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "grouped": {
    "critical": [...],
    "warning": [...],
    "info": [...]
  },
  "count": 12,
  "summary": {
    "critical": 3,
    "warning": 8,
    "info": 1
  }
}
```

#### Get Patient Alerts
```http
GET /api/patients/{patientId}/measure-alerts?include_acknowledged=true
Authorization: Bearer {token}
```

#### Acknowledge Alert
```http
PATCH /api/measure-alerts/{alertId}/acknowledge
Authorization: Bearer {token}
```

#### Bulk Acknowledge
```http
POST /api/patients/{patientId}/measure-alerts/acknowledge
Authorization: Bearer {token}
Content-Type: application/json

{
  "severity": "critical",
  "measure_definition_id": "uuid"
}
```

### Measure Definitions Endpoints

#### Get All Measures
```http
GET /api/measures?category=vitals&is_active=true
Authorization: Bearer {token}
```

#### Update Measure (Including Ranges)
```http
PUT /api/measures/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "display_name": "Body Mass Index",
  "normal_range_min": 18.5,
  "normal_range_max": 24.9,
  "alert_threshold_min": 16.0,
  "alert_threshold_max": 30.0,
  "enable_alerts": true
}
```

### Patient Measures Endpoints

#### Record Measure Value
```http
POST /api/patients/{patientId}/measures
Authorization: Bearer {token}
Content-Type: application/json

{
  "measure_definition_id": "uuid",
  "numeric_value": 15.2,
  "measured_at": "2026-01-24T14:30:00Z",
  "notes": "Patient fasting"
}
```

> **Note:** If the value is out of range and alerts are enabled, an alert will be generated automatically.

---

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nutrivault
NODE_ENV=production

# Email (Required for measure alerts)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=NutriVault Alerts

# Application
PORT=3001
JWT_SECRET=your-secret-key
```

### Feature Flags

Measure alerts are controlled at the measure level:
```javascript
// Enable/disable alerts per measure
measure.enable_alerts = true;
```

---

## Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/your-org/nutrivault.git
cd nutrivault

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run migrate
npm run seed
npm run dev

# Frontend setup (in new terminal)
cd frontend
npm install
npm start
```

### Running Migrations

```bash
# Apply all pending migrations
npm run migrate

# Rollback last migration
npx sequelize-cli db:migrate:undo

# Rollback all migrations
npx sequelize-cli db:migrate:undo:all
```

### Seeding Data

```bash
# Run all seeders
npm run seed

# Populate sample measure ranges
node scripts/create-sample-measure-ranges.js

# Create admin user
node scripts/create-admin.js
```

### Testing Email

```bash
# Test SMTP configuration
node scripts/test-email.js
```

---

## Database Maintenance

### Backup

```bash
# Full backup
pg_dump -U postgres -d nutrivault > backup_$(date +%Y%m%d).sql

# Backup specific tables
pg_dump -U postgres -d nutrivault -t measure_alerts > alerts_backup.sql
```

### Restore

```bash
psql -U postgres -d nutrivault < backup_20260124.sql
```

### Query Performance

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Troubleshooting

### Common Issues

#### Migrations Fail
```
Error: relation "measure_definitions" does not exist
```

**Solution:**
```bash
# Check migration status
npx sequelize-cli db:migrate:status

# Run pending migrations
npm run migrate
```

#### No Emails Received
**Solution:**
1. Check `.env` has EMAIL_* variables
2. Test: `node scripts/test-email.js`
3. Check spam folder
4. Verify practitioner has email address
5. Check backend logs for email errors

#### Alerts Not Generating
**Solution:**
1. Verify `enable_alerts = true` for measure
2. Check ranges are configured
3. Confirm value is actually out of range
4. Check 24-hour deduplication window
5. Review backend logs

#### Chart Zones Not Showing
**Solution:**
1. Verify measure is numeric
2. Check ranges are set
3. Clear browser cache
4. Check browser console for errors

---

## Contributing

### Code Style

- **Backend:** Node.js with Express
- **Frontend:** React with Bootstrap
- **Database:** PostgreSQL with Sequelize ORM
- **Linting:** ESLint
- **Formatting:** Prettier (2 spaces)

### Commit Messages

```
feat: add measure alerts dashboard widget
fix: correct chart zone rendering for partial ranges
docs: update measure alerts user guide
refactor: simplify alert severity calculation
test: add unit tests for deduplication logic
```

### Pull Request Process

1. Create feature branch: `feature/US-X.X.X-description`
2. Implement changes
3. Run tests: `npm test`
4. Create PR against `main`
5. Request review from 2 team members
6. Address feedback
7. Merge when approved

---

## Deployment

See [DEPLOYMENT_US-5.4.3.md](../../DEPLOYMENT_US-5.4.3.md) for detailed deployment instructions.

**Quick Deployment:**
```bash
# 1. Pull latest code
git pull origin main

# 2. Backend
cd backend
npm install
npm run migrate
pm2 restart nutrivault-backend

# 3. Frontend
cd frontend
npm install
npm run build
# Deploy build/ to web server
```

---

## Support

### Getting Help

- **User Guides:** See [MEASURE_ALERTS.md](./MEASURE_ALERTS.md)
- **API Issues:** Check completion reports in this folder
- **GitHub Issues:** Tag with relevant feature (e.g., `[US-5.4.3]`)
- **Email:** support@nutrivault.com

### Reporting Bugs

Include:
- Feature/component affected
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/environment info
- Error messages from console

---

## Changelog

### 2026-01-24
- ✅ US-5.4.3: Normal Ranges & Alerts
  - Measure range configuration
  - Automatic alert generation
  - Dashboard widget
  - Email notifications
  - Chart colored zones
  - Sample data population script

### 2026-01-24
- ✅ US-5.4.2: Translation Support
  - Multi-language measure definitions
  - Frontend i18n integration
  - Translation management API

### Previous
- ✅ US-5.4.1: Trend Visualization
- ✅ US-5.3.4: Calculated Measures
- ✅ US-5.3.3: Measure Annotations
- ✅ US-5.3.2: Log Measure Values
- ✅ US-5.3.1: Define Custom Measures

---

## License

Copyright © 2026 NutriVault. All rights reserved.

---

**Documentation Maintained By:** Development Team
**Questions?** Create an issue or contact support@nutrivault.com
