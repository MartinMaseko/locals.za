const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');

// Use the correct exported middleware functions from your auth module
const { requireAdmin, authenticateToken } = auth;

// Import Firebase admin (ensure backend/src/firebase or similar exports admin)
const admin = require('../../firebase');

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
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Validate required fields
    const { name, price } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Product name is required' });
    }
    
    if (price === undefined || price === null || isNaN(Number(price))) {
      return res.status(400).json({ error: 'Valid product price is required' });
    }
    
    // Sanitize and prepare data
    const productData = {
      name: name.trim(),
      price: Number(price),
      ...(req.body.description && { description: req.body.description.trim() }),
      ...(req.body.brand && { brand: req.body.brand.trim() }),
      ...(req.body.category && { category: req.body.category.trim() }),
      ...(req.body.image_url && { image_url: req.body.image_url }),
      updated_at: new Date().toISOString()
    };

    await admin.firestore().collection('products').doc(id).set(productData, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Product (Admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await admin.firestore().collection('products').doc(id).delete();
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;