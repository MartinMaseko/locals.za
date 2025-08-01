const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');
const authenticateToken = require('../middleware/auth');

// Get Driver Location (Internal Team)
router.get('/:id/location', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('drivers')
    .select('current_location')
    .eq('id', id)
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get dashboard deliveries (incoming, unassigned, pending issues)
router.get('/deliveries', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .or('status.eq.pending,status.eq.issue,driver_id.is.null');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;