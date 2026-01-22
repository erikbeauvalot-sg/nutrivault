# Email Configuration Guide

NutriVault uses Nodemailer with Gmail SMTP to send emails for:
- Invoice notifications to patients
- Document sharing notifications
- Other automated communications

## Gmail SMTP Setup

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification**
3. Follow the steps to enable 2-factor authentication

### Step 2: Generate App Password

1. Visit: https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Enter "NutriVault"
4. Click **Generate**
5. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env` (if not already done):
   ```bash
   cp .env.example .env
   ```

2. Update the email configuration in `.env`:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=abcdefghijklmnop
   EMAIL_FROM_NAME=NutriVault
   ```

3. Replace `your-email@gmail.com` with your Gmail address
4. Replace `abcdefghijklmnop` with your App Password (remove spaces)

### Step 4: Verify Configuration

Start your backend server and check the logs:

```bash
cd backend
npm start
```

You should see:
```
✅ Email service is configured and ready
```

If you see an error:
```
⚠️  Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env
```

Make sure your `.env` file exists and has the correct values.

## Testing Email Sending

### Test Invoice Email

1. Create or open an invoice in the UI
2. Click "Send Email" button
3. Check the patient's email inbox

### Test Document Share Email

1. Go to Documents page
2. Select a document
3. Click "Share with Patient"
4. Select a patient and click send
5. Check the patient's email inbox

## Troubleshooting

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Cause**: Using regular Gmail password instead of App Password

**Solution**:
1. Generate an App Password (see Step 2 above)
2. Use the App Password in `.env`, not your regular password

### Error: "self signed certificate in certificate chain"

**Cause**: SSL/TLS certificate validation issue

**Solution**: Already handled in the code with `rejectUnauthorized: false` for development

### Emails not sending but no error

**Cause**: Email configuration not set in `.env`

**Solution**:
1. Check if `.env` file exists in project root
2. Verify `EMAIL_USER` and `EMAIL_PASSWORD` are set
3. Restart the backend server

### Gmail blocks the login

**Cause**: Google's security features blocking the connection

**Solution**:
1. Ensure 2-factor authentication is enabled
2. Use App Password, not regular password
3. Check https://myaccount.google.com/lesssecureapps (should be OFF when using App Passwords)

## Alternative Email Services

If you prefer not to use Gmail, you can use other SMTP services:

### SendGrid

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

### Mailgun

```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASSWORD=your-mailgun-password
```

### Amazon SES

```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-smtp-username
EMAIL_PASSWORD=your-smtp-password
```

### Outlook/Office 365

```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-outlook-password
```

## Email Templates

Email templates are defined in `backend/src/services/email.service.js`:

- **Invoice Email**: HTML template with invoice details
- **Document Share Email**: HTML template with document information

To customize templates, edit the HTML in the email service file.

## Security Notes

- Never commit your `.env` file to version control
- Use App Passwords, not regular passwords
- Keep your App Password secure
- Rotate App Passwords periodically
- Consider using environment-specific email accounts for dev/staging/production

## Production Considerations

For production deployments:

1. Use a dedicated email service (SendGrid, AWS SES, etc.)
2. Set up proper SPF, DKIM, and DMARC records
3. Use a custom domain for sender address
4. Monitor email deliverability and bounce rates
5. Implement rate limiting to prevent abuse
6. Set up email templates with proper branding
7. Handle bounces and unsubscribe requests

## Support

If you encounter issues not covered here, please:
1. Check the server logs for detailed error messages
2. Verify your email credentials are correct
3. Test with a simple email client to confirm SMTP works
4. Open an issue on GitHub with details about the error
