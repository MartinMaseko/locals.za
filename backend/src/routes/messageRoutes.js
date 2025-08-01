const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');
const authenticateToken = require('../middleware/auth');

// Send Message
router.post('/', authenticateToken, async (req, res) => {
  const { receiver_id, order_id, message_content } = req.body;
  const sender_id = req.user.id;
  const { data, error } = await supabase
    .from('messages')
    .insert([{ sender_id, receiver_id, order_id, message_content }])
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get Messages for Order
router.get('/order/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('order_id', id)
    .order('sent_at', { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;