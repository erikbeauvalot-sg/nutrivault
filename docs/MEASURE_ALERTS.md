# Measure Alerts - User Guide

**Feature:** Automatic Health Measure Alerts
**Version:** 1.0
**Last Updated:** 2026-01-24

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Understanding Severity Levels](#understanding-severity-levels)
4. [Configuring Measure Ranges](#configuring-measure-ranges)
5. [Monitoring Alerts](#monitoring-alerts)
6. [Working with Charts](#working-with-charts)
7. [Email Notifications](#email-notifications)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Overview

The Measure Alerts system automatically monitors patient health values and notifies practitioners when measurements fall outside healthy ranges. This helps identify potential health issues early and ensures timely intervention.

### Key Features

- 🎯 **Automatic Detection** - Alerts generated when values exceed thresholds
- 📊 **Visual Feedback** - Colored chart zones show healthy vs. concerning ranges
- 📧 **Email Notifications** - Critical alerts sent to practitioners immediately
- 🔔 **Dashboard Widget** - Real-time monitoring of all patient alerts
- ✅ **Acknowledgment Tracking** - Mark alerts as reviewed
- 🚫 **Smart Deduplication** - Prevents alert spam with 24-hour cooldown

### How It Works

```
1. Admin configures measure ranges (e.g., BMI 18.5-24.9)
2. Practitioner records patient value (e.g., BMI 15.2)
3. System detects value is below critical threshold
4. Alert created with severity "critical"
5. Email sent to patient's practitioner
6. Alert appears in dashboard widget
7. Chart shows value in red (critical) zone
8. Practitioner reviews and acknowledges alert
```

---

## Getting Started

### Prerequisites

✅ Administrator access to configure measure ranges
✅ Numeric measure definitions created
✅ SMTP email configured (for notifications)

### Quick Start (5 Minutes)

1. **Configure a Measure**
   - Go to **Measures** page
   - Edit "BMI" measure
   - Set Normal Range: 18.5 - 24.9
   - Set Critical Thresholds: 16 - 30
   - Enable Alerts: ON
   - Save

2. **Record a Value**
   - Go to a patient's detail page
   - Record BMI: 15.2 kg/m²
   - Save

3. **Check the Dashboard**
   - Return to dashboard
   - See alert in "Measure Alerts" widget
   - Notice email sent indicator
   - View colored zones on patient's BMI chart

---

## Understanding Severity Levels

The system uses a **4-zone color scheme** to categorize values:

### Info (No Alert)
- **Color:** None
- **Meaning:** Value within normal range
- **Action:** None required
- **Example:** BMI 22.0 (normal range 18.5-24.9)

### Warning (Yellow)
- **Color:** 🟡 Yellow
- **Meaning:** Outside normal range but not critical
- **Action:** Monitor, may need lifestyle adjustment
- **Email:** Not sent
- **Example:** BMI 26.0 (above normal but below critical)

### Critical (Red)
- **Color:** 🔴 Red
- **Meaning:** Beyond critical threshold, requires attention
- **Action:** Review immediately, consider intervention
- **Email:** Sent to practitioner
- **Example:** BMI 15.0 (below critical threshold of 16)

### Range Visualization

```
Validation Min ────────────────────────────────────── Validation Max
      0                                                        50
      |━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━|
      |    🔴    |    🟡    |       🟢        |    🟡    |    🔴    |
      |  Critical |  Warning |     Normal     |  Warning |  Critical |
      0────16─────18.5────────24.9──────30───────────────50
         ▲         ▲          ▲              ▲           ▲
         │         │          └──Normal──────┘           │
         │         └───────Alert Thresholds──────────────┘
         └──────────────Validation Range──────────────────
```

---

## Configuring Measure Ranges

### Step-by-Step Guide

#### 1. Navigate to Measures

From the main menu, click **Measures** → **Manage Definitions**

#### 2. Select a Numeric Measure

Click **Edit** on any numeric measure (e.g., Blood Glucose, BMI, Blood Pressure)

> ⚠️ **Note:** Only numeric measures support ranges. Text and boolean measures are not compatible with alerts.

#### 3. Configure Validation Ranges (Optional)

These define the absolute limits for data entry:

- **Minimum Value**: Lowest acceptable value (e.g., 0 for weight)
- **Maximum Value**: Highest acceptable value (e.g., 500 for weight in kg)

**Purpose:** Data validation, not health assessment

#### 4. Configure Normal Ranges

These define what's considered healthy:

- **Normal Min**: Lower bound of healthy range
- **Normal Max**: Upper bound of healthy range

**Example (BMI):**
- Normal Min: 18.5
- Normal Max: 24.9

**Purpose:** Generate **warning** alerts when exceeded

#### 5. Configure Critical Thresholds

These define serious health concerns:

- **Critical Min**: Dangerously low value
- **Critical Max**: Dangerously high value

**Example (BMI):**
- Critical Min: 16.0 (severe underweight)
- Critical Max: 30.0 (obesity)

**Purpose:** Generate **critical** alerts + send emails

#### 6. Enable Alerts

Toggle **Enable Alerts** to ON

#### 7. Review Preview

Check the **Range Preview** to ensure settings are correct:

```
[🔴 Critical Low (< 16)] → [🟡 Warning Low] →
[🟢 Normal (18.5 - 24.9)] → [🟡 Warning High] →
[🔴 Critical High (> 30)]
```

#### 8. Save

Click **Save** to apply changes

### Range Configuration Examples

#### Blood Glucose (mg/dL)

| Range Type | Min | Max | Purpose |
|------------|-----|-----|---------|
| Validation | 0 | 600 | Data entry limits |
| Normal | 70 | 140 | Healthy fasting glucose |
| Critical | 54 | 250 | Hypoglycemia / Hyperglycemia |

**Result:**
- < 54: Critical alert + email (hypoglycemia)
- 54-70: Warning alert (low normal)
- 70-140: No alert (healthy)
- 140-250: Warning alert (high normal)
- > 250: Critical alert + email (hyperglycemia)

#### Blood Pressure Systolic (mmHg)

| Range Type | Min | Max | Purpose |
|------------|-----|-----|---------|
| Validation | 40 | 250 | Data entry limits |
| Normal | 90 | 120 | Optimal BP |
| Critical | 70 | 180 | Hypotension / Hypertensive crisis |

#### Heart Rate (bpm)

| Range Type | Min | Max | Purpose |
|------------|-----|-----|---------|
| Validation | 20 | 220 | Data entry limits |
| Normal | 60 | 100 | Resting heart rate |
| Critical | 40 | 120 | Bradycardia / Tachycardia |

### Special Cases

#### One-Sided Ranges

Some measures only have upper limits:

**Cholesterol (mg/dL):**
- Normal Min: (none)
- Normal Max: 200
- Critical Min: (none)
- Critical Max: 240

**Result:**
- ≤ 200: No alert
- 200-240: Warning
- > 240: Critical

#### No Critical Thresholds

Some measures don't warrant critical alerts:

**Weight (kg):**
- Normal Min: (none)
- Normal Max: (none)
- Critical Min: (none)
- Critical Max: (none)
- Enable Alerts: OFF

**Use BMI instead for health assessment**

---

## Monitoring Alerts

### Dashboard Widget

The **Measure Alerts** widget on the dashboard provides real-time monitoring.

#### Widget States

**No Alerts (Green):**
```
┌──────────────────────────────────┐
│ ✅ Measure Alerts       [🔄]    │
├──────────────────────────────────┤
│            🎉                     │
│ No active measure alerts!        │
│ All patient values are within    │
│ normal ranges.                   │
└──────────────────────────────────┘
```

**With Alerts (Red/Yellow):**
```
┌──────────────────────────────────┐
│ 🚨 Measure Alerts       [🔄]    │
│ [3 critical] [8 warning]         │
├──────────────────────────────────┤
│ 🚨 Critical Alerts [3]    ▼      │
│ ┌──────────────────────────────┐ │
│ │ 🚨 John Doe #MRN-001         │ │
│ │ [📧 Email Sent]              │ │
│ │ [🔴 Critically Low]          │ │
│ │ BMI: 15.2 kg/m²              │ │
│ │ CRITICAL: John Doe's BMI...  │ │
│ │ [View Patient] [Acknowledge] │ │
│ └──────────────────────────────┘ │
│                                  │
│ ⚠️ Warning Alerts [8]     ▶      │
├──────────────────────────────────┤
│ Auto-refreshes every 5 minutes   │
└──────────────────────────────────┘
```

#### Widget Features

1. **Collapsible Sections**
   - Click section headers to expand/collapse
   - Critical section expanded by default
   - Warning section collapsed by default

2. **Alert Information**
   - Patient name and MRN
   - Measure name and value
   - Alert type and severity
   - Timestamp
   - Email sent indicator

3. **Actions**
   - **View Patient**: Navigate to patient detail page
   - **Acknowledge**: Mark alert as reviewed

4. **Auto-Refresh**
   - Updates every 5 minutes automatically
   - Manual refresh with 🔄 button

### Patient Detail Page

View alerts specific to a patient:

1. Navigate to **Patients** → Select patient
2. Scroll to **Measure Alerts** section (if available)
3. See all alerts for this patient
4. Filter by acknowledged/unacknowledged
5. Acknowledge individual or bulk

---

## Working with Charts

### Colored Zones

When viewing a measure's history chart, colored zones indicate ranges:

```
        Chart with Zones

Value   ┃
  30 ━━━┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🔴 Critical High
     ┃
  25    ┃                          ╱╲
     ┃                        ╱    ╲
  20    ┃                    ╱      ╲    🟡 Warning High
     ┃                  ╱          ╲
  15    ┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🟢 Normal (18.5-24.9)
     ┃            ╱                ╲
  10    ┃        ╱                    ╲    🟡 Warning Low
     ┃    ●                            ●
   5    ┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🔴 Critical Low
     ┃
   0    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        Jan   Feb   Mar   Apr   May   Jun
```

### Zone Legend

Below each chart, a legend explains the zones:

```
[🔴 Critical Low] [🟡 Warning] [🟢 Normal (18.5 - 24.9 kg/m²)] [🟡 Warning] [🔴 Critical High]
```

### Interpreting Charts

- **Red zones** = Values here trigger critical alerts
- **Yellow zones** = Values here trigger warnings
- **Green zone** = Healthy range, no alerts
- **Data points** in red zones appear highlighted
- **Outliers** marked with ⚠️ symbol

### No Zones Displayed

If you don't see colored zones:

✓ Check that measure has ranges configured
✓ Ensure you're viewing a numeric measure
✓ Verify chart has loaded completely
✓ Try refreshing the page

---

## Email Notifications

### When Emails Are Sent

Emails are sent **only** for critical alerts:

✅ Value exceeds critical threshold (min or max)
✅ Alerts enabled for this measure
✅ Patient has assigned practitioner
✅ Practitioner has valid email address
✅ No duplicate alert in last 24 hours

### Email Content

**Subject:**
```
🚨 CRITICAL ALERT: Blood Glucose - John Doe
```

**Body:**
```
CRITICAL HEALTH ALERT

Patient: John Doe (MRN: #12345)
Measure: Blood Glucose
Value: 280 mg/dL
Threshold: 250 mg/dL
Alert Type: ABOVE CRITICAL

Message: CRITICAL: John Doe's Blood Glucose is critically high
(280 mg/dL), above threshold of 250 mg/dL

Recorded: January 24, 2026 at 2:30 PM
Recorded by: Dr. Sarah Smith

Please review and take appropriate action.

---
NutriVault Alert System
```

### Email Configuration

Ensure SMTP is configured in `.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=NutriVault Alerts
```

### Email Troubleshooting

**No emails received?**

1. Check SMTP configuration
2. Verify patient has assigned practitioner
3. Confirm practitioner email address valid
4. Check spam/junk folder
5. Review backend logs for errors
6. Test with: `node scripts/test-email.js`

**Too many emails?**

Emails are limited by 24-hour deduplication. If receiving duplicates:

1. Check if multiple practitioners assigned
2. Verify patient doesn't have duplicate records
3. Review alert deduplication logic

---

## Best Practices

### For Administrators

#### 1. Start with Common Measures

Configure ranges for frequently used measures first:
- BMI
- Blood Pressure (Systolic/Diastolic)
- Blood Glucose
- Heart Rate
- Temperature

#### 2. Use Medical Standards

Base ranges on established guidelines:
- WHO for BMI
- AHA for blood pressure
- ADA for diabetes markers
- Normal adult ranges for vitals

#### 3. Consider Your Population

Adjust ranges for your patient demographics:
- **Pediatric patients**: Age-specific ranges
- **Elderly patients**: More lenient thresholds
- **Athletes**: Different normal ranges
- **Chronic conditions**: Disease-specific targets

#### 4. Test Before Enabling

1. Configure ranges with alerts OFF
2. Record sample values
3. Verify chart zones appear correctly
4. Enable alerts once confident

#### 5. Document Your Ranges

Keep a reference table of configured ranges for staff training:

```markdown
| Measure | Normal Range | Critical Thresholds | Notes |
|---------|--------------|---------------------|-------|
| BMI | 18.5 - 24.9 | < 16 or > 30 | WHO classification |
| BP Systolic | 90 - 120 | < 70 or > 180 | AHA guidelines |
```

### For Practitioners

#### 1. Check Dashboard Regularly

Make the dashboard your first stop:
- Review alerts at start of day
- Check after recording measurements
- Monitor before leaving for the day

#### 2. Acknowledge Promptly

Don't let alerts pile up:
- Review within 24 hours
- Acknowledge after taking action
- Use bulk acknowledge for resolved issues

#### 3. Verify Critical Alerts

For critical alerts:
- ✅ Contact patient immediately
- ✅ Verify value is accurate (not data entry error)
- ✅ Document action taken
- ✅ Consider follow-up appointment
- ✅ Update care plan if needed

#### 4. Use Charts for Context

Before reacting to an alert:
- View patient's measure history chart
- Check for trends (isolated spike vs. pattern)
- Review notes and annotations
- Consider other measures

#### 5. Educate Patients

When values are out of range:
- Explain the alert to patient
- Discuss health implications
- Set improvement goals
- Schedule follow-up

---

## Troubleshooting

### Common Issues

#### Issue: No alerts appearing

**Possible Causes:**
- Alerts not enabled for measure
- No ranges configured
- Value within normal range
- Deduplication blocking (recent alert exists)

**Solutions:**
1. Check measure configuration → Enable Alerts ON
2. Verify normal_range_min and normal_range_max set
3. Confirm recorded value is actually out of range
4. Wait 24 hours for deduplication cooldown

#### Issue: Colored zones not showing on chart

**Possible Causes:**
- Viewing non-numeric measure
- No ranges configured
- Chart still loading
- Browser cache issue

**Solutions:**
1. Confirm measure type is "numeric"
2. Verify ranges set in measure configuration
3. Wait for chart to fully render
4. Clear browser cache and reload

#### Issue: Wrong severity level

**Possible Causes:**
- Ranges misconfigured
- Thresholds overlap incorrectly
- Data type mismatch

**Solutions:**
1. Review range configuration:
   - Ensure alert_threshold_min < normal_range_min
   - Ensure normal_range_max < alert_threshold_max
2. Check validation passes: `validateRanges()`
3. Verify value saved as number, not string

#### Issue: Alert spam (multiple alerts for same issue)

**Possible Causes:**
- Multiple practitioners recording same value
- Deduplication not working
- Different measure definitions for same measure

**Solutions:**
1. Check that deduplication is active (24-hour window)
2. Verify timestamps of alerts (should be >24h apart)
3. Consolidate duplicate measure definitions

#### Issue: No email received for critical alert

**Possible Causes:**
- SMTP not configured
- No practitioner assigned to patient
- Email address invalid
- Spam filter blocking

**Solutions:**
1. Check `.env` for EMAIL_* variables
2. Assign practitioner to patient
3. Verify practitioner email in user profile
4. Check spam/junk folder
5. Review backend logs for email errors

---

## FAQ

### General Questions

**Q: Can I set different ranges for different patients?**
A: No, ranges are configured per measure definition, not per patient. Consider creating measure variants (e.g., "BMI Adult" vs "BMI Pediatric") if needed.

**Q: How do I disable alerts for a specific measure?**
A: Edit the measure definition and toggle "Enable Alerts" to OFF. Existing alerts remain but no new alerts will be generated.

**Q: Can I acknowledge all alerts for a patient at once?**
A: Yes, use the bulk acknowledge feature in the patient detail page's alerts section.

**Q: What happens if I delete a measure definition with active alerts?**
A: Deletion is prevented (RESTRICT foreign key). You must acknowledge/delete alerts first, or soft-delete the measure instead.

### Technical Questions

**Q: How often does the dashboard widget refresh?**
A: Every 5 minutes automatically. You can also click the 🔄 button for manual refresh.

**Q: What is the deduplication window?**
A: 24 hours. If an alert exists for the same patient/measure in the last 24 hours, new alerts are skipped.

**Q: Can I customize the email template?**
A: Yes, edit `backend/src/services/measureAlerts.service.js` → `sendAlertEmail()` function.

**Q: Where are alerts stored?**
A: In the `measure_alerts` database table. They're not deleted, only marked as acknowledged.

**Q: Can I export alerts for reporting?**
A: Currently no built-in export. Use SQL query: `SELECT * FROM measure_alerts WHERE...`

### Configuration Questions

**Q: What if I don't know appropriate ranges?**
A: Use the sample data script which includes medically-standard ranges: `node scripts/create-sample-measure-ranges.js`

**Q: Can ranges change over time?**
A: Yes, editing a measure's ranges applies to future alerts only. Existing alerts remain unchanged.

**Q: Do I need both normal and critical ranges?**
A: No. You can configure just normal ranges (warnings only) or just critical ranges. However, both provide better granularity.

**Q: What if normal_min > alert_threshold_min?**
A: The validation will fail. Critical thresholds must be MORE extreme than normal ranges.

### Best Practices Questions

**Q: Should I enable alerts for all measures?**
A: No. Enable alerts only for clinically significant measures where intervention is needed (vitals, labs). Don't enable for subjective measures.

**Q: How quickly should I respond to critical alerts?**
A: Critical alerts indicate potentially serious conditions. Review within 1-2 hours, contact patient same day.

**Q: Can patients see their own alerts?**
A: Not in current version. Alerts are practitioner-facing only.

---

## Appendix

### Sample Ranges Reference

Use these medically-standard ranges as starting points:

| Measure | Unit | Normal Min | Normal Max | Critical Min | Critical Max |
|---------|------|------------|------------|--------------|--------------|
| **Anthropometric** |
| BMI | kg/m² | 18.5 | 24.9 | 16.0 | 30.0 |
| Weight | kg | - | - | - | - |
| Height | cm | - | - | - | - |
| Waist Circumference (M) | cm | - | 94 | - | 102 |
| Waist Circumference (F) | cm | - | 80 | - | 88 |
| **Vital Signs** |
| BP Systolic | mmHg | 90 | 120 | 70 | 180 |
| BP Diastolic | mmHg | 60 | 80 | 40 | 120 |
| Heart Rate | bpm | 60 | 100 | 40 | 120 |
| Temperature | °C | 36.1 | 37.2 | 35.0 | 39.0 |
| Respiratory Rate | /min | 12 | 20 | 8 | 30 |
| O₂ Saturation | % | 95 | 100 | 90 | 100 |
| **Lab Results** |
| Blood Glucose (Fasting) | mg/dL | 70 | 100 | 54 | 140 |
| Blood Glucose (Random) | mg/dL | 70 | 140 | 54 | 200 |
| HbA1c | % | - | 5.7 | - | 6.5 |
| Total Cholesterol | mg/dL | - | 200 | - | 240 |
| LDL Cholesterol | mg/dL | - | 100 | - | 160 |
| HDL Cholesterol | mg/dL | 40 | 60 | 30 | - |
| Triglycerides | mg/dL | - | 150 | - | 200 |
| Hemoglobin (M) | g/dL | 13.5 | 17.5 | 12.0 | 20.0 |
| Hemoglobin (F) | g/dL | 12.0 | 15.5 | 10.0 | 18.0 |

### SQL Queries for Reporting

**Get all unacknowledged critical alerts:**
```sql
SELECT
  ma.*,
  p.first_name, p.last_name, p.medical_record_number,
  md.display_name AS measure_name,
  md.unit
FROM measure_alerts ma
JOIN patients p ON ma.patient_id = p.id
JOIN measure_definitions md ON ma.measure_definition_id = md.id
WHERE ma.acknowledged_at IS NULL
  AND ma.severity = 'critical'
ORDER BY ma.created_at DESC;
```

**Get alert summary by measure:**
```sql
SELECT
  md.display_name AS measure_name,
  ma.severity,
  COUNT(*) AS alert_count,
  COUNT(CASE WHEN ma.acknowledged_at IS NULL THEN 1 END) AS unacknowledged
FROM measure_alerts ma
JOIN measure_definitions md ON ma.measure_definition_id = md.id
WHERE ma.created_at >= NOW() - INTERVAL '30 days'
GROUP BY md.display_name, ma.severity
ORDER BY alert_count DESC;
```

### API Endpoints Quick Reference

```
GET    /api/measure-alerts
       ?severity=critical
       &limit=100

GET    /api/patients/:patientId/measure-alerts
       ?include_acknowledged=true
       &limit=50

PATCH  /api/measure-alerts/:alertId/acknowledge

POST   /api/patients/:patientId/measure-alerts/acknowledge
       Body: { severity: 'critical', measure_definition_id: 'uuid' }
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-24
**Maintained By:** NutriVault Development Team
**Feedback:** Please report issues or suggestions via GitHub Issues
