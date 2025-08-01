const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');
const authenticateToken = require('../middleware/auth');

// Create Order (Salon Owner)
router.post('/', authenticateToken, async (req, res) => {
  // Insert into orders and order_items (handle transactionally in production)
  const { order, items } = req.body;
  const { data: orderData, error: orderError } = await supabase.from('orders').insert([order]).single();
  if (orderError) return res.status(400).json({ error: orderError.message });

  // Insert order_items
  const orderItems = items.map(item => ({ ...item, order_id: orderData.id }));
  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) return res.status(400).json({ error: itemsError.message });

  res.json({ order: orderData, items: orderItems });
});

// Get My Orders (Salon Owner)
router.get('/my', authenticateToken, async (req, res) => {
  const { id } = req.user;
  const { data, error } = await supabase.from('orders').select('*').eq('salon_id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get Order by ID (Salon Owner)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get Incoming Orders (Internal Team)
router.get('/incoming', authenticateToken, async (req, res) => {
  // Optionally check for admin/internal team
  const { data, error } = await supabase.from('orders').select('*').eq('status', 'pending');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Update Order Status (Admin/Driver)
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Assign Driver to Order (Admin)
router.put('/:id/assign-driver', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { driver_id } = req.body;
  const { data, error } = await supabase.from('orders').update({ driver_id }).eq('id', id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;