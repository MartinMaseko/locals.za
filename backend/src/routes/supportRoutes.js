const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/emailHelper');

// Contact form submission route
router.post('/contact', async (req, res) => {
  try {
    const { name, whatsapp, orderNo, message, emailTo, subject } = req.body;
    
    // Validate required fields
    if (!name || !whatsapp || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create HTML content for email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>New Support Query</h2>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>WhatsApp Number:</strong> ${whatsapp}</p>
          <p><strong>Order Number:</strong> ${orderNo || 'Not provided'}</p>
          <p><strong>Message:</strong></p>
          <div style="background: white; padding: 10px; border-left: 4px solid #FFB803;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>
        <p style="color: #777; font-size: 12px;">This email was sent from the LocalsZA support form.</p>
      </div>
    `;
    
    // Mail options
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@locals-za.co.za',
      to: emailTo || 'admin@locals-za.co.za',
      subject: subject || 'New Support Query',
      html: htmlContent,
      text: `New support query from ${name} (${whatsapp}). Order: ${orderNo || 'Not provided'}. Message: ${message}`
    };
    
    // Send the email
    await sendEmail(mailOptions);
    
    // Return success
    res.json({ 
      success: true, 
      message: 'Support query submitted successfully'
    });
    
  } catch (error) {
    console.error('Error sending support email:', error);
    res.status(500).json({ error: 'Failed to submit support query' });
  }
});

module.exports = router;