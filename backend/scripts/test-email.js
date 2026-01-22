/**
 * Email Service Test Script
 *
 * Tests the email configuration by sending a test email.
 *
 * Usage:
 *   node backend/scripts/test-email.js recipient@example.com
 *
 * Make sure to configure EMAIL_USER and EMAIL_PASSWORD in .env first.
 */

require('dotenv').config();
const emailService = require('../src/services/email.service');

async function testEmail(recipientEmail) {
  console.log('🧪 Testing email service...\n');

  // Check if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Error: Email not configured!');
    console.log('\nPlease set these environment variables in .env:');
    console.log('  EMAIL_USER=your-email@gmail.com');
    console.log('  EMAIL_PASSWORD=your-app-password');
    console.log('\nSee docs/EMAIL_SETUP.md for detailed instructions.');
    process.exit(1);
  }

  console.log('Email Configuration:');
  console.log('  Host:', process.env.EMAIL_HOST || 'smtp.gmail.com');
  console.log('  Port:', process.env.EMAIL_PORT || '587');
  console.log('  User:', process.env.EMAIL_USER);
  console.log('  From Name:', process.env.EMAIL_FROM_NAME || 'NutriVault');
  console.log('');

  // Verify email configuration
  console.log('Step 1: Verifying email configuration...');
  const isConfigured = await emailService.verifyEmailConfig();

  if (!isConfigured) {
    console.error('❌ Email configuration verification failed!');
    console.log('\nPossible issues:');
    console.log('  1. Invalid email credentials');
    console.log('  2. Network connection problem');
    console.log('  3. Gmail App Password not generated (see docs/EMAIL_SETUP.md)');
    process.exit(1);
  }

  console.log('✅ Email configuration verified!\n');

  // Send test email
  if (recipientEmail) {
    console.log(`Step 2: Sending test email to ${recipientEmail}...`);

    try {
      const result = await emailService.sendEmail({
        to: recipientEmail,
        subject: '🧪 NutriVault Email Test',
        text: 'This is a test email from NutriVault. If you received this, your email configuration is working correctly!',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4CAF50;">🧪 Email Test Successful!</h1>
            <p>This is a test email from <strong>NutriVault</strong>.</p>
            <p>If you received this message, your email configuration is working correctly!</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #777; font-size: 12px;">
              This is an automated test email. You can safely ignore or delete this message.
            </p>
          </div>
        `
      });

      if (result.mock) {
        console.log('⚠️  Email service not configured (mock mode)');
      } else if (result.success) {
        console.log('✅ Test email sent successfully!');
        console.log('   Message ID:', result.messageId);
        console.log('\nCheck your inbox at:', recipientEmail);
      }
    } catch (error) {
      console.error('❌ Failed to send test email:', error.message);
      process.exit(1);
    }
  } else {
    console.log('Step 2: Skipped (no recipient email provided)');
    console.log('\nTo send a test email, run:');
    console.log('  node backend/scripts/test-email.js your-email@example.com');
  }

  console.log('\n🎉 Email service test completed successfully!');
}

// Get recipient email from command line argument
const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.log('Usage: node backend/scripts/test-email.js recipient@example.com\n');
}

testEmail(recipientEmail).catch(error => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});
