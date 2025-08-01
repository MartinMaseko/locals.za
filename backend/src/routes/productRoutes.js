const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');
const authenticateToken = require('../middleware/auth');

// Add Product (Internal Team/Admin)
router.post('/', authenticateToken, async (req, res) => {
  // Check if user is admin 
  const { data, error } = await supabase.from('products').insert([req.body]).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get All Products (public)
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get Product by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Update Product (Admin)
router.put('/:id', authenticateToken, async (req, res) => {
  // Check if user is admin
  const { id } = req.params;
  const { data, error } = await supabase.from('products').update(req.body).eq('id', id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Delete Product (Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  // Check if user is admin
  const { id } = req.params;
  const { data, error } = await supabase.from('products').delete().eq('id', id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Product deleted', data });
});

module.exports = router;