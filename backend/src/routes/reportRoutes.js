const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');
const authenticateToken = require('../middleware/auth');

// Generate delivery reports 
router.get('/deliveries', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('status', 'delivered');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;