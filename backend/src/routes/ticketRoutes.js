const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');
const authenticateToken = require('../middleware/auth');

// Create Ticket
router.post('/', authenticateToken, async (req, res) => {
  const user_id = req.user.id;
  const { subject, description, priority } = req.body;
  const { data, error } = await supabase
    .from('support_tickets')
    .insert([{ user_id, subject, description, priority, status: 'open' }])
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get My Tickets
router.get('/my', authenticateToken, async (req, res) => {
  const user_id = req.user.id;
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', user_id);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get All Tickets (Internal Team)
router.get('/', authenticateToken, async (req, res) => {
  const { data, error } = await supabase.from('support_tickets').select('*');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Update Ticket Status/Assign (Internal Team)
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', id)
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;