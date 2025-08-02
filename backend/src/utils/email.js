const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

exports.sendWelcomeEmail = async (to, name) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Welcome to LocalsZA!',
    text: `Hi ${name || ''},\n\nWelcome to LocalsZA! We're excited to have you on board.\n\nBest,\nThe LocalsZA Team`,
  };
  await transporter.sendMail(mailOptions);
};