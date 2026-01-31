# NutriVault

**Practice Management Software for Dietitians and Nutritionists**

NutriVault is a comprehensive application designed to help nutrition professionals manage their practice efficiently. Track patients, schedule visits, monitor health measures, generate invoices, and communicate with patients - all in one place.

---

## Table of Contents

- [Features Overview](#features-overview)
- [Quick Start Guide](#quick-start-guide)
- [User Guide](#user-guide)
  - [Dashboard](#dashboard)
  - [Patient Management](#patient-management)
  - [Visit Management](#visit-management)
  - [Health Measures](#health-measures)
  - [Billing & Invoices](#billing--invoices)
  - [Custom Fields](#custom-fields)
  - [Email & Communication](#email--communication)
  - [AI Features](#ai-features)
  - [Calendar Integration](#calendar-integration)
- [Installation](#installation)
- [Configuration](#configuration)
- [Technical Documentation](#technical-documentation)
- [Support](#support)

---

## Features Overview

### For Dietitians

| Feature | Description |
|---------|-------------|
| **Patient Management** | Create and manage patient records with custom fields |
| **Visit Scheduling** | Schedule appointments with calendar integration |
| **Health Tracking** | Monitor weight, BMI, blood pressure, and custom measures |
| **Automatic Alerts** | Get notified when patient values exceed thresholds |
| **Billing** | Generate and send professional invoices |
| **AI Follow-ups** | Generate personalized follow-up emails with AI |
| **Email Reminders** | Automatic appointment reminders |
| **Data Export** | Export patient data to CSV, Excel, or PDF |

### For Administrators

| Feature | Description |
|---------|-------------|
| **User Management** | Create and manage dietitian accounts |
| **Role & Permissions** | Configure access control |
| **Custom Fields** | Create custom data fields for your practice |
| **Measure Definitions** | Define health measures with alert thresholds |
| **Email Templates** | Create reusable email templates |
| **AI Configuration** | Configure AI providers (OpenAI, Claude, Mistral) |

---

## Quick Start Guide

### First Login

1. Open NutriVault in your browser
2. Enter your **username** and **password**
3. Click **Sign In**

### Create Your First Patient

1. Click **Patients** in the sidebar
2. Click the **+ New Patient** button
3. Fill in the patient information:
   - First name and Last name (required)
   - Email (for communications)
   - Phone number
   - Date of birth
4. Click **Save**

### Schedule a Visit

1. Click **Visits** in the sidebar
2. Click **+ New Visit**
3. Select the patient
4. Choose the date and time
5. Select the visit type (Initial, Follow-up, Final)
6. Click **Create**

### Record Health Measures

1. Open a patient's profile
2. Go to the **Measures** tab
3. Click **Log Measure**
4. Enter values for weight, height, blood pressure, etc.
5. Click **Save**

---

## User Guide

### Dashboard

The dashboard provides an overview of your practice:

- **Today's Appointments** - Visits scheduled for today
- **Recent Patients** - Recently viewed or updated patients
- **Alerts** - Health measure alerts requiring attention
- **Quick Actions** - Shortcuts to common tasks

### Patient Management

#### Viewing Patients

- Click **Patients** in the sidebar to see all patients
- Use the **search bar** to find patients by name or email
- Use **filters** to narrow results by status or dietitian

#### Patient Profile

Each patient profile contains:

| Tab | Content |
|-----|---------|
| **Overview** | Basic info, contact details, custom fields |
| **Visits** | History of all visits |
| **Measures** | Health measurements with charts |
| **Documents** | Uploaded files and shared documents |
| **Billing** | Invoices and payment history |

#### Editing Patient Information

1. Open the patient profile
2. Click **Edit** button
3. Modify the information
4. Click **Save**

### Visit Management

#### Visit Types

| Type | Description |
|------|-------------|
| **Initial Consultation** | First appointment with a new patient |
| **Follow-up** | Regular progress check |
| **Final Visit** | Conclusion of treatment |

#### Visit Workflow

1. **Create** - Schedule the appointment
2. **Document** - Record consultation notes and measures
3. **Complete** - Mark as finished (generates invoice)
4. **Follow-up** - Send AI-generated follow-up email

#### Recording Visit Notes

1. Open the visit
2. Fill in the fields:
   - **Reason for visit** - Why the patient came
   - **Assessment** - Your clinical evaluation
   - **Recommendations** - Advice given to patient
   - **Notes** - Additional information
3. Add health measures if needed
4. Click **Save**

### Health Measures

#### Predefined Measures

| Measure | Unit | Normal Range |
|---------|------|--------------|
| Weight | kg | — |
| Height | cm | — |
| BMI | kg/m² | 18.5 - 24.9 |
| Blood Pressure (Systolic) | mmHg | 90 - 120 |
| Blood Pressure (Diastolic) | mmHg | 60 - 80 |
| Heart Rate | bpm | 60 - 100 |
| Waist Circumference | cm | — |
| Blood Glucose | mg/dL | 70 - 100 |

#### Viewing Trends

1. Open a patient's profile
2. Go to **Measures** tab
3. Click on a measure to see:
   - Historical chart
   - All recorded values
   - Trend analysis

#### Alerts

When a measure exceeds the configured threshold:
- An alert appears on the dashboard
- The measure is highlighted in red
- The dietitian receives a notification

To acknowledge an alert:
1. Click on the alert
2. Review the measure
3. Click **Acknowledge**

### Billing & Invoices

#### Creating an Invoice

**Automatic creation:**
- When a visit is marked as "Completed", an invoice is automatically created

**Manual creation:**
1. Go to **Billing**
2. Click **+ New Invoice**
3. Select the patient
4. Add line items (service description, amount)
5. Click **Create**

#### Sending Invoices

1. Open the invoice
2. Click **Send by Email**
3. The patient receives the invoice as a PDF

#### Recording Payments

1. Open the invoice
2. Click **Record Payment**
3. Enter the amount and payment method
4. Click **Save**

#### Invoice Status

| Status | Description |
|--------|-------------|
| **Draft** | Not yet sent |
| **Sent** | Delivered to patient |
| **Paid** | Fully paid |
| **Overdue** | Past due date |
| **Cancelled** | Voided invoice |

#### Customizing Invoices

1. Go to **Settings** > **Invoice Customization**
2. Upload your logo
3. Add your company information
4. Configure footer text
5. Click **Save**

### Custom Fields

Custom fields allow you to collect additional information specific to your practice.

#### Field Types

| Type | Use Case |
|------|----------|
| **Text** | Short text (allergies, preferences) |
| **Text Area** | Long text (detailed notes) |
| **Number** | Numeric values |
| **Date** | Date picker |
| **Dropdown** | Select from predefined options |
| **Yes/No** | Boolean toggle |
| **Calculated** | Auto-calculated from formulas |

#### Creating a Custom Field

1. Go to **Settings** > **Custom Fields**
2. Select or create a category
3. Click **Add Field**
4. Configure:
   - Field name (internal identifier)
   - Label (displayed name)
   - Type
   - Required (yes/no)
   - Help text
5. Click **Save**

#### Calculated Fields Example: Age

Formula: `age_years({date_of_birth})`

This automatically calculates the patient's age from their birth date.

#### Calculated Fields Example: BMI

Formula: `10000 * {measure:weight} / ({measure:height} * {measure:height})`

This calculates BMI using the latest weight and height measures.

### Email & Communication

#### Appointment Reminders

Automatic reminders are sent:
- 24 hours before the appointment
- 1 week before (configurable)

Patients can unsubscribe via a link in the email.

#### Email Templates

Create reusable templates for:
- Invoice delivery
- Appointment reminders
- Payment reminders
- Follow-up messages

**Template Variables:**
- `{{patient_name}}` - Patient's full name
- `{{appointment_date}}` - Visit date
- `{{dietitian_name}}` - Your name
- `{{amount_total}}` - Invoice amount

#### Sending Custom Emails

1. Open a patient or visit
2. Click **Send Email**
3. Select a template or write custom content
4. Click **Send**

### AI Features

#### AI-Powered Follow-ups

Generate personalized follow-up emails after consultations:

1. Open a completed visit
2. Click **AI Follow-up**
3. Configure options:
   - Language (French/English)
   - Tone (Professional/Friendly/Formal)
   - Include next steps
   - Include next appointment date
4. Click **Generate**
5. Review and edit the email
6. Click **Send**

#### AI Requirements

- AI provider must be configured (OpenAI, Claude, or Mistral)
- Visit must have consultation notes
- Patient must have an email address

### Calendar Integration

#### Google Calendar Sync

Connect NutriVault to Google Calendar for bi-directional sync:

1. Go to **Settings** > **Calendar**
2. Click **Connect Google Calendar**
3. Authorize access
4. Select the calendar to sync

**Features:**
- Visits appear in your Google Calendar
- Changes sync in both directions
- Conflict detection and resolution

---

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The API starts on `http://localhost:3001`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The application starts on `http://localhost:5173`

### Default Admin Account

After running seeders, login with:
- Username: `admin`
- Password: `admin123`

**Important:** Change the password after first login!

---

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Application
NODE_ENV=development
PORT=3001

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
REFRESH_TOKEN_SECRET=another-secret-key

# Database (SQLite)
DB_DIALECT=sqlite
DB_STORAGE=./data/nutrivault.db

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=Your Practice Name

# AI Providers (optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
```

### Database Options

**Development (SQLite):**
```env
DB_DIALECT=sqlite
DB_STORAGE=./data/nutrivault.db
```

**Production (PostgreSQL):**
```env
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nutrivault
DB_USER=postgres
DB_PASSWORD=your-password
```

---

## Technical Documentation

For detailed technical information, see:

- [Architecture Overview](docs/ARCHITECTURE.md) - System design and data flows
- [Development Guide](docs/development-guide.md) - Contributing guidelines
- [API Reference](docs/integration-architecture.md) - API endpoints

---

## Support

### Getting Help

- Check the [User Guide](docs/GUIDE_UTILISATEUR.md) (French)
- Review the [FAQ](#faq)
- Contact your system administrator

### FAQ

**Q: I forgot my password**
A: Contact your administrator to reset it.

**Q: Emails are not being sent**
A: Check the email configuration in `.env` and verify the app password.

**Q: Calendar sync is not working**
A: Reconnect Google Calendar in Settings and ensure you granted all permissions.

**Q: AI follow-up shows an error**
A: Verify that an AI provider is configured and has a valid API key.

### Reporting Issues

- Open an issue on the [GitHub repository](https://github.com/erikbeauvalot-sg/nutrivault/issues)
- Include steps to reproduce the problem
- Attach screenshots if applicable

---

## License

Proprietary - All rights reserved

---

*NutriVault - Empowering nutrition professionals*
