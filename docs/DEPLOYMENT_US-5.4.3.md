# Deployment Guide: US-5.4.3 - Normal Ranges & Alerts

**Feature:** Automatic Health Measure Alerts
**Sprint:** Sprint 4
**Version:** 1.0
**Date:** 2026-01-24

---

## Pre-Deployment Checklist

- [ ] Database backup completed
- [ ] SMTP email configuration verified in `.env`
- [ ] All team members notified of deployment
- [ ] Testing environment verified
- [ ] Documentation reviewed

---

## Deployment Steps

### 1. Backend Deployment

#### Step 1.1: Pull Latest Code

```bash
cd /path/to/nutrivault
git checkout main
git pull origin main
```

#### Step 1.2: Install Dependencies

```bash
cd backend
npm install
```

> No new dependencies required for this feature

#### Step 1.3: Run Migrations

```bash
npm run migrate
```

**Expected Output:**
```
== 20260124210000-add-measure-ranges: migrating =======
✅ Measure range fields added successfully
== 20260124210000-add-measure-ranges: migrated (0.234s)

== 20260124210100-create-measure-alerts: migrating =======
✅ Measure alerts table created successfully
== 20260124210100-create-measure-alerts: migrated (0.156s)
```

**Verify Migrations:**
```bash
# Check that tables/columns were created
psql -d nutrivault -c "\d measure_definitions"
psql -d nutrivault -c "\d measure_alerts"
```

#### Step 1.4: (Optional) Populate Sample Ranges

For quick setup with standard medical ranges:

```bash
node scripts/create-sample-measure-ranges.js
```

**This will populate:**
- BMI (18.5-24.9, alerts < 16 or > 30)
- Blood Glucose (70-140, alerts < 54 or > 250)
- Blood Pressure Systolic/Diastolic
- Heart Rate, Temperature, O₂ Saturation
- Cholesterol, Triglycerides, HbA1c

> **Note:** Only measures that already exist will be updated. Skip measures with existing ranges.

#### Step 1.5: Restart Backend Server

```bash
# If using PM2
pm2 restart nutrivault-backend

# If using systemd
sudo systemctl restart nutrivault-backend

# If running directly
npm start
```

**Verify Server Started:**
```bash
curl http://localhost:3001/health
# Expected: {"status":"OK","message":"NutriVault POC Server is running"}
```

### 2. Frontend Deployment

#### Step 2.1: Install Dependencies

```bash
cd frontend
npm install
```

> No new dependencies required for this feature

#### Step 2.2: Build Production Assets

```bash
npm run build
```

**Expected Output:**
```
Creating an optimized production build...
Compiled successfully.

File sizes after gzip:
  ...
  XX kB  build/static/js/main.XXXXXXXX.js
  ...
```

#### Step 2.3: Deploy Build

```bash
# If using nginx
sudo cp -r build/* /var/www/nutrivault/

# If using serve
serve -s build -l 3000
```

#### Step 2.4: Clear Browser Caches

Instruct users to:
1. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. Or clear browser cache

### 3. Verification

#### Step 3.1: Verify Migrations

```sql
-- Check measure_definitions has new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'measure_definitions'
  AND column_name LIKE '%range%' OR column_name LIKE '%alert%';

-- Should return:
-- normal_range_min      | numeric
-- normal_range_max      | numeric
-- alert_threshold_min   | numeric
-- alert_threshold_max   | numeric
-- enable_alerts         | boolean
```

```sql
-- Check measure_alerts table exists
SELECT COUNT(*) FROM measure_alerts;

-- Should return: 0 (empty table)
```

#### Step 3.2: Verify Backend API

```bash
# Test measure alerts endpoint
curl http://localhost:3001/api/measure-alerts \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: {"success":true,"data":[],"grouped":{...},"count":0}
```

#### Step 3.3: Verify Frontend

1. **Login to NutriVault**
2. **Check Dashboard**
   - ✓ New "Measure Alerts" widget appears
   - ✓ Shows empty state if no alerts
3. **Edit a Measure**
   - Navigate to **Measures** page
   - Click **Edit** on a numeric measure (e.g., BMI)
   - ✓ See "Normal Ranges & Alerts" section
   - ✓ Can toggle "Enable Alerts"
   - ✓ Can input range values
   - ✓ See range preview
   - Save successfully
4. **View Chart with Zones**
   - Go to a patient detail page
   - View measure history chart for configured measure
   - ✓ See colored zones (red/yellow/green)
   - ✓ See zone legend below chart

#### Step 3.4: End-to-End Test

**Test Alert Generation:**

1. **Configure BMI Ranges**
   - Edit BMI measure
   - Normal: 18.5 - 24.9
   - Critical: 16 - 30
   - Enable Alerts: ON
   - Save

2. **Record Out-of-Range Value**
   - Go to patient detail page
   - Record BMI: 15.2 kg/m²
   - Save

3. **Verify Alert Created**
   - Check dashboard
   - ✓ Alert appears in "Critical Alerts" section
   - ✓ Shows patient name, value, threshold
   - ✓ Email sent indicator if practitioner has email

4. **Verify Chart Zones**
   - View patient's BMI chart
   - ✓ See colored zones
   - ✓ Data point (15.2) appears in red zone
   - ✓ Legend displays correctly

5. **Verify Email Sent** (if configured)
   - Check practitioner's email inbox
   - ✓ Email received with subject "🚨 CRITICAL ALERT: BMI - [Patient Name]"
   - ✓ Email contains value, threshold, patient info

6. **Test Acknowledgment**
   - Click **Acknowledge** on the alert
   - ✓ Alert removed from dashboard
   - ✓ Alert marked as acknowledged in database

---

## Files Changed

### Backend Files Created (7)

```
backend/
├── migrations/
│   ├── 20260124210000-add-measure-ranges.js
│   └── 20260124210100-create-measure-alerts.js
├── models/
│   └── MeasureAlert.js
├── src/
│   ├── services/
│   │   └── measureAlerts.service.js
│   ├── controllers/
│   │   └── measureAlertsController.js
│   └── routes/
│       └── measureAlerts.js
└── scripts/
    └── create-sample-measure-ranges.js
```

### Backend Files Modified (4)

```
backend/
├── models/
│   ├── index.js                          (+45 lines - associations)
│   └── MeasureDefinition.js              (+40 lines - fields + validation)
└── src/
    ├── services/
    │   ├── patientMeasure.service.js     (+8 lines - alert hook)
    │   └── measureDefinition.service.js  (+15 lines - allow range updates)
    └── server.js                          (+3 lines - route registration)
```

### Frontend Files Created (2)

```
frontend/
└── src/
    ├── components/
    │   └── MeasureAlertsWidget.jsx
    └── services/
        └── measureAlertsService.js
```

### Frontend Files Modified (3)

```
frontend/
└── src/
    ├── components/
    │   ├── MeasureHistory.jsx              (+120 lines - zones)
    │   └── MeasureDefinitionModal.jsx      (+150 lines - range config)
    └── pages/
        └── DashboardPage.jsx                (+7 lines - widget)
```

### Documentation Created (3)

```
backend/docs/
├── US-5.4.3-COMPLETED.md
└── MEASURE_ALERTS.md
DEPLOYMENT_US-5.4.3.md
```

---

## Configuration

### Environment Variables

Ensure these are set in `backend/.env`:

```env
# Email Configuration (Required for alerts)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=NutriVault Alerts

# Or use SendGrid
# EMAIL_HOST=smtp.sendgrid.net
# EMAIL_PORT=587
# EMAIL_USER=apikey
# EMAIL_PASSWORD=your-sendgrid-api-key
```

**Test Email Configuration:**
```bash
node backend/scripts/test-email.js
```

### Database Indexes

The following indexes are created automatically by migration:

```sql
-- Performance indexes
CREATE INDEX measure_alerts_patient_ack
  ON measure_alerts(patient_id, acknowledged_at);

CREATE INDEX measure_alerts_severity
  ON measure_alerts(severity, acknowledged_at);

CREATE INDEX measure_alerts_deduplication
  ON measure_alerts(patient_id, measure_definition_id, created_at);
```

**Verify Indexes:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'measure_alerts';
```

---

## Rollback Procedure

If critical issues are detected:

### Step 1: Stop Services

```bash
pm2 stop nutrivault-backend
```

### Step 2: Rollback Migrations

```bash
cd backend
npx sequelize-cli db:migrate:undo
npx sequelize-cli db:migrate:undo
```

This will remove:
- `measure_alerts` table
- Range columns from `measure_definitions`

### Step 3: Restore Database (if needed)

```bash
psql -d nutrivault < backup_before_deployment.sql
```

### Step 4: Revert Code

```bash
git checkout <previous-commit-hash>
```

### Step 5: Restart Services

```bash
npm start
```

---

## Post-Deployment Tasks

### For Administrators

1. **Configure Measure Ranges**
   - [ ] Review and configure ranges for all active numeric measures
   - [ ] Use sample script as reference
   - [ ] Document custom ranges in team wiki

2. **Test Email Delivery**
   - [ ] Record out-of-range value for test patient
   - [ ] Verify email received
   - [ ] Check spam filters if needed

3. **Train Staff**
   - [ ] Share MEASURE_ALERTS.md user guide
   - [ ] Demonstrate dashboard widget
   - [ ] Explain acknowledgment workflow
   - [ ] Review escalation procedures for critical alerts

### For Support Team

1. **Update Support Documentation**
   - [ ] Add troubleshooting steps for common issues
   - [ ] Document email configuration help
   - [ ] Create FAQ for practitioners

2. **Monitor Logs**
   - [ ] Check backend logs for alert generation errors
   - [ ] Monitor email delivery failures
   - [ ] Track deduplication events

3. **Performance Monitoring**
   - [ ] Monitor database query performance
   - [ ] Check index usage
   - [ ] Track dashboard widget load times

---

## Known Issues & Limitations

1. **Email Delivery**
   - Requires SMTP configuration
   - No automatic retry for failed emails
   - Only sends to assigned practitioner

2. **Alert Deduplication**
   - Fixed 24-hour window (not configurable)
   - Not reset by acknowledgment

3. **Dashboard Widget**
   - 5-minute refresh interval (not real-time)
   - Limited to 100 alerts maximum

4. **Range Configuration**
   - Only supports numeric measures
   - Cannot define patient-specific ranges
   - No time-dependent ranges (e.g., age-based)

---

## Support & Troubleshooting

### Common Issues

**Issue: Migrations fail**
```
Error: relation "measure_definitions" does not exist
```
**Solution:** Ensure previous migrations are applied first
```bash
npm run migrate
```

**Issue: No emails received**
**Solution:** Check SMTP configuration
```bash
node scripts/test-email.js
```

**Issue: Widget not appearing**
**Solution:** Clear browser cache and hard refresh

**Issue: Cannot edit system measures**
**Solution:** This is expected. System measures allow only:
- display_name, description
- is_active, display_order
- **All range fields** (normal_range_*, alert_threshold_*, enable_alerts)

### Getting Help

- **Documentation:** `backend/docs/MEASURE_ALERTS.md`
- **API Reference:** `backend/docs/US-5.4.3-COMPLETED.md`
- **GitHub Issues:** Create issue with `[US-5.4.3]` tag
- **Support Email:** support@nutrivault.com

---

## Success Criteria

Deployment is successful when:

- ✅ Migrations applied without errors
- ✅ Backend server starts normally
- ✅ Frontend builds without errors
- ✅ Dashboard widget appears
- ✅ Measure configuration UI functional
- ✅ Chart zones render correctly
- ✅ Alerts generate for out-of-range values
- ✅ Emails send successfully (if configured)
- ✅ Acknowledgment workflow works
- ✅ No errors in browser console
- ✅ No errors in backend logs

---

## Deployment Sign-Off

- [ ] Database migrations verified
- [ ] Backend API tested
- [ ] Frontend UI verified
- [ ] Email system tested
- [ ] End-to-end flow validated
- [ ] Documentation reviewed
- [ ] Team trained
- [ ] Monitoring in place

**Deployed By:** ___________________
**Date:** ___________________
**Production URL:** ___________________
**Version Tag:** ___________________

---

**Next Steps:**
- Monitor alert generation for 48 hours
- Collect feedback from practitioners
- Review alert patterns and adjust ranges if needed
- Plan US-5.4.4 (next feature)
