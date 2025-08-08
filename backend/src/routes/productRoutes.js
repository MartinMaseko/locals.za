const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');

// Add Product (Internal Team/Admin)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const ref = await admin.firestore().collection('products').add(req.body);
    res.json({ id: ref.id, ...req.body });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Products (public)
router.get('/', async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('products').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get Product by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await admin.firestore().collection('products').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Product (Admin)
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await admin.firestore().collection('products').doc(id).set(req.body, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Product (Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await admin.firestore().collection('products').doc(id).delete();
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;