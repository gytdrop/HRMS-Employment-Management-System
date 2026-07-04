const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter using environment variables or a fallback mock
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: parseInt(port) === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
  }
  return null;
};

/**
 * Sends onboarding email with login ID and temporary random password
 * @param {string} email 
 * @param {string} firstName 
 * @param {string} loginId 
 * @param {string} randomPassword 
 */
const sendOnboardingEmail = async (email, firstName, loginId, randomPassword) => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || '"HRMS Team" <no-reply@hrms.com>';

  const mailOptions = {
    from,
    to: email,
    subject: 'Welcome to HRMS - Your Account Details',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
        <h2 style="color: #c85a32; border-bottom: 2px solid #c85a32; padding-bottom: 10px;">Welcome to the Team, ${firstName}!</h2>
        <p>Your HR administrator has registered your account on the HRMS Portal.</p>
        <p>Here are your login credentials to access the system:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9; width: 30%;">Login ID / Email:</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><code>${loginId}</code> or <code>${email}</code></td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Temporary Password:</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><code>${randomPassword}</code></td>
          </tr>
        </table>
        <p style="background-color: #fff3cd; color: #856404; padding: 12px; border-radius: 4px; border: 1px solid #ffeeba;">
          <strong>Important:</strong> For security reasons, you will be prompted to change this temporary password upon your first login.
        </p>
        <p>Best regards,<br><strong>HRMS Administration</strong></p>
      </div>
    `,
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Email successfully sent to ${email}: ${info.messageId}`);
      return { success: true, sent: true };
    } catch (error) {
      console.error(`❌ Failed to send email to ${email}:`, error);
      return { success: false, sent: false, error };
    }
  } else {
    // Fallback Mock Log if SMTP is not configured
    console.log('\n=============================================================');
    console.log('✉️  [MOCK EMAIL SENT - SMTP NOT CONFIGURED IN .env]');
    console.log(`To: ${email}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Body Details:`);
    console.log(`  - Login ID: ${loginId}`);
    console.log(`  - Temp Password: ${randomPassword}`);
    console.log('=============================================================\n');
    return { success: true, sent: false, mock: true };
  }
};

module.exports = {
  sendOnboardingEmail,
};
