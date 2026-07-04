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

/**
 * Sends a monthly payslip email with a breakdown of earnings and deductions
 */
const sendPayslipEmail = async (email, firstName, period, basic, hra, other, deductions, net) => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || '"HRMS Team" <no-reply@hrms.com>';

  const mailOptions = {
    from,
    to: email,
    subject: `HRMS - Payslip Issued for ${period}`,
    html: `
      <div style="font-family: 'Outfit', Arial, sans-serif; line-height: 1.6; color: #2d2a26; max-width: 600px; margin: 0 auto; border: 1px solid #e5dfd5; border-radius: 12px; padding: 25px; background-color: #fcfbfa;">
        <h2 style="color: #c85a32; border-bottom: 2px solid #c85a32; padding-bottom: 10px; margin-top: 0;">Monthly Earnings Statement</h2>
        <p>Dear ${firstName},</p>
        <p>Your salary payslip for the period <strong>${period}</strong> has been generated and approved. Below is a summary of your earnings statement:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5dfd5;">
          <thead>
            <tr style="background-color: #f4f1ea;">
              <th style="padding: 12px; border-bottom: 1px solid #e5dfd5; text-align: left; font-size: 0.85rem; text-transform: uppercase;">Description</th>
              <th style="padding: 12px; border-bottom: 1px solid #e5dfd5; text-align: right; font-size: 0.85rem; text-transform: uppercase;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5dfd5;">Basic Salary (50%)</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5dfd5; text-align: right; font-weight: bold;">₹${parseFloat(basic).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5dfd5;">House Rent Allowance (HRA)</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5dfd5; text-align: right; font-weight: bold;">₹${parseFloat(hra).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5dfd5;">Other Allowances</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5dfd5; text-align: right; font-weight: bold;">₹${parseFloat(other).toFixed(2)}</td>
            </tr>
            ${parseFloat(deductions) > 0 ? `
            <tr style="color: #b33939;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5dfd5;">Deductions (Leaves/Absences)</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5dfd5; text-align: right; font-weight: bold;">-₹${parseFloat(deductions).toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr style="background-color: #f4f1ea; font-size: 1.05rem; font-weight: bold;">
              <td style="padding: 12px;">Net Salary Take-Home</td>
              <td style="padding: 12px; text-align: right; color: #557a62;">₹${parseFloat(net).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <p>You can view, print, or download your detailed invoice slip by logging in to the HRMS portal.</p>
        <p style="font-size: 0.85rem; color: #9e958c; font-style: italic; margin-top: 30px; border-top: 1px solid #e5dfd5; padding-top: 15px;">
          This is an automated notification. Please do not reply directly to this email.
        </p>
      </div>
    `,
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Payslip email successfully sent to ${email}: ${info.messageId}`);
      return { success: true, sent: true };
    } catch (error) {
      console.error(`❌ Failed to send payslip email to ${email}:`, error);
      return { success: false, sent: false, error };
    }
  } else {
    // Fallback Mock Log if SMTP is not configured
    console.log('\n=============================================================');
    console.log('✉️  [MOCK EMAIL SENT - SMTP NOT CONFIGURED IN .env]');
    console.log(`To: ${email}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Body Details:`);
    console.log(`  - Period: ${period}`);
    console.log(`  - Earnings components: Basic ₹${basic}, HRA ₹${hra}, Other Allowances ₹${other}`);
    console.log(`  - Deductions: -₹${deductions}`);
    console.log(`  - Net Salary Paid: ₹${net}`);
    console.log('=============================================================\n');
    return { success: true, sent: false, mock: true };
  }
};

module.exports = {
  sendOnboardingEmail,
  sendPayslipEmail,
};
