const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const requireAdmin = auth.requireAdmin;
const authenticateToken = auth;

// Protect product creation with admin check
router.post('/', requireAdmin, productController.createProduct);

// Get All Products (public)
router.get('/', productController.getAllProducts);

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