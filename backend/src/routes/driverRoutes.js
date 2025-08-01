const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');
const authenticateToken = require('../middleware/auth');

// Get Assigned Deliveries (Driver)
router.get('/me/deliveries', authenticateToken, async (req, res) => {
  const { id } = req.user;
  const { data, error } = await supabase.from('deliveries').select('*').eq('driver_id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Update Delivery Status (Driver)
router.put('/deliveries/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { data, error } = await supabase.from('deliveries').update({ status }).eq('id', id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Capture Proof of Delivery (Driver)
router.post('/deliveries/:id/proof', authenticateToken, async (req, res) => {
  res.json({ message: 'Proof of delivery uploaded (implement storage logic)' });
});

// Driver Earnings
router.get('/me/earnings', authenticateToken, async (req, res) => {
  const { id } = req.user;
  const { data, error } = await supabase
    .from('deliveries')
    .select('id, status')
    .eq('driver_id', id)
    .eq('status', 'delivered');
  res.json({ deliveredCount: data.length });
});

// Update Driver/Vehicle Info
router.put('/me/profile', authenticateToken, async (req, res) => {
  const { id } = req.user;
  const updates = req.body;
  const { data, error } = await supabase.from('drivers').update(updates).eq('id', id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});


module.exports = router;