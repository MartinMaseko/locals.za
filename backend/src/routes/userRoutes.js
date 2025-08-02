const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');
const authenticateToken = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/email'); 

// Register extra user info after Supabase Auth registration
router.post('/register', authenticateToken, async (req, res) => {
  const { id, email } = req.user; // Securely from JWT
  const { full_name, phone_number, user_type } = req.body;
  const { data, error } = await supabase
    .from('users')
    .insert([{ id, email, full_name, phone_number, user_type }])
    .single();
  if (error) return res.status(400).json({ error: error.message });

  // Send welcome email (don't block response on error)
  sendWelcomeEmail(email, full_name).catch(console.error);
  
  res.json(data);
});

// Get current user details
router.get('/me', authenticateToken, async (req, res) => {
  const { id } = req.user;
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get user details by ID (internal use)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Update user profile
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabase.from('users').update(updates).eq('id', id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;