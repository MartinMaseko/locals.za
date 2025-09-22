const nodemailer = require('nodemailer');

/**
 * Sends an email using the configured mail service
 * @param {Object} mailOptions - Email options (to, subject, html, etc.)
 * @returns {Promise<Object>} - Mail sending result
 */
async function sendEmail(mailOptions) {
  try {
    console.log('Setting up email transport with:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true'
    });
    
    // Create a transporter using SMTP with settings from .env
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtpout.secureserver.net',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // false for TLS
      auth: {
        user: process.env.EMAIL_USER || 'admin@locals-za.co.za',
        pass: process.env.EMAIL_PASSWORD
      },
      // Additional TLS options
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

/**
 * Formats a cashout request into an HTML email
 * @param {Object} requestData - The data for the cashout request @param {Object} data - Cashout request data
 * @returns {string} - HTML email content
 */
function formatCashoutEmail(data) {
  const { driver, driverId, driverEmail, amount, orderCount, orderIds } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FFB803; color: #212529; padding: 10px; text-align: center; }
        .content { padding: 20px; border: 1px solid #ddd; }
        .info-row { margin-bottom: 10px; }
        .label { font-weight: bold; }
        .amount { font-size: 24px; color: #212529; }
        .orders { margin-top: 20px; padding: 10px; background-color: #f5f5f5; }
        .footer { margin-top: 20px; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Driver Cashout Request</h2>
        </div>
        <div class="content">
          <div class="info-row">
            <span class="label">Driver:</span> ${driver} (ID: ${driverId})
          </div>
          <div class="info-row">
            <span class="label">Email:</span> ${driverEmail}
          </div>
          <div class="info-row">
            <span class="label">Amount:</span> <span class="amount">R${amount}</span>
          </div>
          <div class="info-row">
            <span class="label">Orders:</span> ${orderCount}
          </div>
          <div class="orders">
            <div class="label">Order IDs:</div>
            <div>${orderIds.join('<br>')}</div>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated message from the LocalsZA system.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  sendEmail,
  formatCashoutEmail
};