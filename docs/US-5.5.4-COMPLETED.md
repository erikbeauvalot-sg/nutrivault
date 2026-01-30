# US-5.5.4: Appointment Reminders - Implementation Complete

**Sprint:** Sprint 5 - Templates & Communication
**Completed:** 2026-01-25
**Status:** ✅ COMPLETED

---

## Feature Overview

The Appointment Reminders system automatically sends email notifications to patients before scheduled visits. This feature helps reduce no-shows and improves patient engagement through timely reminders.

### Key Features

- ✅ Automated scheduled reminders (cron job running hourly)
- ✅ Configurable reminder timing (default: 24h and 1 week before appointment)
- ✅ Manual send option from visit detail page
- ✅ Reminder tracking (counts and timestamps on visits)
- ✅ Patient opt-out capability with unsubscribe link
- ✅ Email logging and audit trail
- ✅ Database-driven configuration via `system_settings` table

---

## Architecture

### Database Schema

#### New Tables

**`system_settings`** - Application-wide configuration
```sql
CREATE TABLE system_settings (
  id VARCHAR(36) PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  data_type ENUM('string', 'number', 'boolean', 'json'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### Modified Tables

**`visits`** - Added reminder tracking fields
- `reminders_sent` (INTEGER, default: 0)
- `last_reminder_date` (DATE, nullable)

**`patients`** - Added notification preferences
- `appointment_reminders_enabled` (BOOLEAN, default: true)
- `unsubscribe_token` (VARCHAR(100), unique)

### Backend Services

1. **`appointmentReminder.service.js`**
   - `getEligibleVisits(reminderHoursBefore)` - Find visits needing reminders
   - `sendVisitReminder(visitId, userId, manual)` - Send single reminder
   - `processScheduledReminders()` - Batch process (called by cron)
   - `getReminderStats()` - Get reminder statistics

2. **`scheduler.service.js`**
   - `initializeScheduledJobs()` - Initialize all cron jobs on startup
   - `scheduleAppointmentReminders()` - Set up reminder cron job
   - `stopAllJobs()` - Graceful shutdown
   - `triggerAppointmentRemindersNow()` - Manual batch trigger (admin only)

3. **`templateRenderer.service.js`** (updated)
   - Added support for visit variables
   - Added unsubscribe link generation

### API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/appointment-reminders/send/:visitId` | `visits.update` | Manually send reminder for specific visit |
| POST | `/api/appointment-reminders/batch/send-now` | ADMIN (`users.delete`) | Trigger batch reminder job manually |
| GET | `/api/appointment-reminders/stats` | Authenticated | Get reminder statistics |
| POST | `/api/appointment-reminders/unsubscribe/:token` | **Public** (no auth) | Unsubscribe patient from reminders |
| POST | `/api/appointment-reminders/resubscribe` | Authenticated | Re-enable reminders for patient |

---

## Configuration

### Environment Variables

Add to `.env` file:

```bash
# Appointment Reminders
FRONTEND_URL=http://localhost:5173    # Used for unsubscribe links
TZ=Europe/Paris                        # Timezone for cron scheduling
```

### System Settings

Configured via `system_settings` table (no code deployment needed):

```json
{
  "appointment_reminders_enabled": true,
  "appointment_reminder_times": [24, 168],  // Hours before (24h, 1 week)
  "appointment_reminder_cron": "0 * * * *", // Every hour
  "max_reminders_per_visit": 2
}
```

To update settings:

```sql
-- Disable all reminders
UPDATE system_settings
SET setting_value = 'false'
WHERE setting_key = 'appointment_reminders_enabled';

-- Change reminder times to 48h and 72h
UPDATE system_settings
SET setting_value = '[48, 72]'
WHERE setting_key = 'appointment_reminder_times';

-- Change cron to run every 30 minutes
UPDATE system_settings
SET setting_value = '*/30 * * * *'
WHERE setting_key = 'appointment_reminder_cron';
```

**Note:** After updating cron schedule, restart the server for changes to take effect.

### Cron Schedule Customization

The cron schedule uses standard cron syntax:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Examples:**
- `0 * * * *` - Every hour on the hour
- `*/30 * * * *` - Every 30 minutes
- `0 9,15 * * *` - At 9 AM and 3 PM daily
- `0 8-18 * * 1-5` - Every hour from 8 AM to 6 PM, Monday to Friday

---

## Email Template

### Template Category: `appointment_reminder`

**Subject:** `Rappel : Rendez-vous avec {{dietitian_name}} le {{appointment_date}}`

**Available Variables:**
- `{{patient_first_name}}` - Patient first name
- `{{patient_last_name}}` - Patient last name
- `{{patient_name}}` - Full patient name
- `{{appointment_date}}` - Formatted date (e.g., "25/01/2026")
- `{{appointment_time}}` - Formatted time (e.g., "14:30")
- `{{appointment_datetime}}` - Full date and time
- `{{dietitian_name}}` - Full dietitian name
- `{{dietitian_first_name}}` - Dietitian first name
- `{{dietitian_last_name}}` - Dietitian last name
- `{{visit_type}}` - Visit type (e.g., "Initial", "Follow-up")
- `{{unsubscribe_link}}` - Unsubscribe URL

### Editing the Template

Navigate to **Email Templates** page and edit the "Appointment Reminder" template. Changes take effect immediately for all future reminders.

**Important:** The `{{unsubscribe_link}}` variable is automatically generated and MUST be included in the template footer for GDPR compliance.

---

## Reminder Eligibility Logic

A visit is eligible for a reminder if ALL conditions are met:

1. ✅ Visit status = `SCHEDULED`
2. ✅ Visit date is in the future
3. ✅ Time until visit matches reminder threshold (±1 hour window)
4. ✅ Reminders sent < `max_reminders_per_visit`
5. ✅ Patient has email address
6. ✅ `Patient.appointment_reminders_enabled = true`
7. ✅ Last reminder was > 12 hours ago (prevents duplicates)

---

## User Guide

### Manual Reminder Send (Dietitian)

1. Navigate to visit detail page
2. Look for "Send Reminder" button in the action bar
3. Click button (only enabled for eligible visits)
4. Confirm send in dialog
5. Email sent immediately to patient

**Button States:**
- ✅ Enabled: Visit is scheduled, in future, patient has email and opted in
- ❌ Disabled: Visit not eligible (hover for reason)
- 📧 Badge: Shows count of reminders already sent (e.g., "Send Reminder (2 sent)")

### Batch Reminder Trigger (Admin)

Admins can manually trigger the batch reminder job without waiting for the cron schedule:

```bash
curl -X POST http://localhost:3001/api/appointment-reminders/batch/send-now \
  -H "Authorization: Bearer {admin_token}"
```

### Patient Unsubscribe Flow

1. Patient receives appointment reminder email
2. Clicks "Se désabonner des rappels de rendez-vous" link in footer
3. Redirected to `/unsubscribe.html?token={token}` page
4. `Patient.appointment_reminders_enabled` automatically set to `false`
5. Confirmation message displayed
6. Patient will no longer receive appointment reminders

**Re-subscribing:**
Currently requires admin/dietitian to manually update patient record. Future enhancement: patient portal with preference management.

---

## Monitoring & Troubleshooting

### Check Cron Job Status

```bash
# Server logs on startup
[Scheduler] Initializing scheduled jobs...
[Scheduler] Scheduling appointment reminders with cron: 0 * * * *
[Scheduler] Appointment reminder job scheduled successfully
[Scheduler] All scheduled jobs initialized
```

### View Reminder Statistics

```bash
curl http://localhost:3001/api/appointment-reminders/stats \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalReminders": 150,
    "visitsWithReminders": 75,
    "upcomingNeedingReminders": 12,
    "emailsSent": 145,
    "emailsFailed": 5,
    "patientsOptedOut": 3
  }
}
```

### Common Issues

#### 1. Reminders not sending automatically

**Check:**
- Server running? `ps aux | grep node`
- Cron job initialized? Check startup logs
- Reminders enabled? Query `system_settings` table
- Eligible visits exist? Check visit table

**Debug:**
```sql
-- Check system settings
SELECT * FROM system_settings WHERE setting_key LIKE '%reminder%';

-- Check upcoming scheduled visits
SELECT v.id, v.visit_date, v.reminders_sent, p.email, p.appointment_reminders_enabled
FROM visits v
JOIN patients p ON v.patient_id = p.id
WHERE v.status = 'SCHEDULED' AND v.visit_date > NOW();
```

#### 2. Email not received

**Check:**
- Patient has valid email? Check `patients.email`
- Patient opted in? Check `patients.appointment_reminders_enabled = true`
- Email logs: Query `email_logs` table for status
- SMTP configuration correct in `.env`

```sql
-- Check email logs
SELECT * FROM email_logs
WHERE patient_id = '{patient_id}'
ORDER BY created_at DESC
LIMIT 10;
```

#### 3. Duplicate reminders sent

**Check:**
- `last_reminder_date` being updated correctly?
- Cron job running multiple times? (Check for duplicate processes)
- Time window too wide?

**Fix:**
```sql
-- Verify last_reminder_date is being set
SELECT id, reminders_sent, last_reminder_date
FROM visits
WHERE reminders_sent > 0;
```

#### 4. Unsubscribe link not working

**Check:**
- `FRONTEND_URL` environment variable set correctly
- Patient has `unsubscribe_token`? (Should be auto-generated)
- CORS configuration allows public endpoint access

```sql
-- Check patient tokens
SELECT id, first_name, last_name, unsubscribe_token
FROM patients
WHERE unsubscribe_token IS NULL;

-- Regenerate missing tokens
UPDATE patients
SET unsubscribe_token = UUID()
WHERE unsubscribe_token IS NULL;
```

---

## Testing Checklist

### Backend Tests

- [x] Migrations run successfully
- [x] Models have correct fields
- [x] SystemSetting model getValue/setValue work correctly
- [x] Scheduler initializes on server startup
- [x] getEligibleVisits returns correct visits
- [x] sendVisitReminder sends email and updates visit
- [x] processScheduledReminders handles batches correctly
- [x] Email logs created for all sends
- [x] Manual send endpoint requires authentication
- [x] Batch trigger endpoint requires admin permission
- [x] Unsubscribe endpoint works without authentication
- [x] Stats endpoint returns accurate counts

### Frontend Tests

- [x] SendReminderButton appears on visit detail page
- [x] Button disabled for ineligible visits (correct tooltip)
- [x] Button enabled for eligible visits
- [x] Clicking button shows confirmation dialog
- [x] Successful send shows success message
- [x] Visit reloads with updated reminders_sent count
- [x] Reminder count badge displays correctly
- [x] Unsubscribe page loads and functions

### Integration Tests

- [x] Schedule visit for 24 hours from now
- [x] Wait for cron job to run (or trigger manually)
- [x] Verify reminder email received with correct variables
- [x] Click unsubscribe link in email
- [x] Verify patient.appointment_reminders_enabled = false
- [x] Confirm no more reminders sent to opted-out patient
- [x] Verify email template variables render correctly
- [x] Test with different reminder time windows

---

## Performance Considerations

### Database Indexes

Reminder queries are optimized with indexes:

```sql
-- Visits table
CREATE INDEX idx_visits_scheduled_reminders
  ON visits(status, visit_date, reminders_sent);

-- Patients table
CREATE INDEX idx_patients_reminders_enabled
  ON patients(appointment_reminders_enabled);

CREATE UNIQUE INDEX idx_patients_unsubscribe_token
  ON patients(unsubscribe_token);
```

### Batch Processing

- Cron job processes all eligible visits in a single batch
- Each visit processed sequentially (not parallelized to avoid email rate limits)
- Failed sends are logged but don't stop batch processing
- Batch results returned include success/failure counts

### Email Rate Limiting

If you have many patients, consider:
- Increasing cron interval (e.g., every 2 hours instead of hourly)
- Implementing email service rate limiting (nodemailer supports this)
- Using a dedicated email service (SendGrid, Mailgun, etc.) for higher volume

---

## Security & Privacy

### GDPR Compliance

- ✅ Unsubscribe mechanism provided (1-click, no auth required)
- ✅ Patient consent tracked (`appointment_reminders_enabled`)
- ✅ Email logging with audit trail
- ✅ No sensitive data in unsubscribe tokens (uses UUID)

### Data Protection

- Unsubscribe tokens are UUIDs (not sequential IDs)
- Patient data never exposed in URLs or emails
- Public unsubscribe endpoint validates tokens before processing
- Email logs stored securely with sent_by audit

---

## Future Enhancements

### Potential Improvements

1. **SMS Reminders** - Add SMS notifications via Twilio/similar
2. **Multi-language Support** - i18n for reminder templates
3. **Custom Reminder Times Per Patient** - Override global settings
4. **Patient Portal** - Self-service preference management
5. **Reminder Confirmation** - Track if patient viewed/confirmed
6. **Smart Timing** - Send reminders at optimal times based on patient behavior
7. **Multiple Reminder Channels** - Email + SMS + Push notifications
8. **Appointment Rescheduling Link** - One-click reschedule in email

### Migration to External Cron

For production deployments with load balancing or multiple instances:

```bash
# Add to crontab (runs every hour)
0 * * * * curl -X POST http://localhost:3001/api/appointment-reminders/batch/send-now \
  -H "Authorization: Bearer {admin_api_key}"
```

Then disable internal cron by setting `appointment_reminders_enabled = false` or commenting out scheduler initialization in `server.js`.

---

## Related Documentation

- [US-5.5.2: Email Templates](./US-5.5.2-COMPLETED.md)
- [Email Service Configuration](./email-service-setup.md)
- [System Settings API](../api/system-settings.md)

---

## Support

For issues or questions:
1. Check this documentation
2. Review server logs for errors
3. Query `email_logs` table for failed sends
4. Check `system_settings` for configuration
5. Contact development team

---

**Implementation completed:** 2026-01-25
**Deployed to:** Development ✅
**Production deployment:** Pending
