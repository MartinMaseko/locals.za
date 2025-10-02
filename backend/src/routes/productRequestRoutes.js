const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/emailHelper');

router.post('/', async (req, res) => {
  try {
    const { productName, email, timestamp, emailTo } = req.body;
    
    if (!productName) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    
    // Create HTML content for email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>New Product Request</h2>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
          <p><strong>Product Requested:</strong> ${productName}</p>
          ${email ? `<p><strong>Customer Email:</strong> ${email}</p>` : ''}
          <p><strong>Time Requested:</strong> ${new Date(timestamp).toLocaleString()}</p>
        </div>
        <p style="color: #777; font-size: 12px;">This email was sent from the LocalsZA product request form.</p>
      </div>
    `;
    
    // Mail options
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@locals-za.co.za',
      to: emailTo || 'admin@locals-za.co.za',
      subject: 'New Product Request: ' + productName,
      html: htmlContent,
      text: `New product request: ${productName}. ${email ? `From: ${email}.` : ''} Time: ${new Date(timestamp).toLocaleString()}`
    };
    
    // Send the email
    await sendEmail(mailOptions);
    
    // Return success
    res.json({ 
      success: true, 
      message: 'Product request submitted successfully'
    });
    
  } catch (error) {
    console.error('Error sending product request email:', error);
    res.status(500).json({ error: 'Failed to submit product request' });
  }
});

module.exports = router;